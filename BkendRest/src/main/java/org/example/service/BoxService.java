package org.example.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.example.dto.BoxDashboardResponse;
import org.example.dto.BoxInventoryTypeResponse;
import org.example.dto.BoxLossStatsResponse;
import org.example.dto.BoxQuantityRequest;
import org.example.exception.BadRequestException;
import org.example.model.BoxInventory;
import org.example.model.BoxLedger;
import org.example.model.BoxType;
import org.example.model.Transaction;
import org.example.model.Wholesaler;
import org.example.model.enums.BoxLedgerPartyType;
import org.example.model.enums.BoxMovementType;
import org.example.model.enums.BoxReferenceType;
import org.example.model.enums.RecordStatus;
import org.example.model.enums.TransactionType;
import org.example.repository.BoxInventoryRepository;
import org.example.repository.BoxLedgerRepository;
import org.example.repository.BoxTypeRepository;
import org.example.repository.TransactionRepository;
import org.example.repository.WholesalerRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BoxService {

    private final WholesalerRepository wholesalerRepository;
    private final BoxTypeRepository boxTypeRepository;
    private final BoxInventoryRepository boxInventoryRepository;
    private final BoxLedgerRepository boxLedgerRepository;
    private final TransactionRepository transactionRepository;

    public BoxService(
            WholesalerRepository wholesalerRepository,
            BoxTypeRepository boxTypeRepository,
            BoxInventoryRepository boxInventoryRepository,
            BoxLedgerRepository boxLedgerRepository,
            TransactionRepository transactionRepository
    ) {
        this.wholesalerRepository = wholesalerRepository;
        this.boxTypeRepository = boxTypeRepository;
        this.boxInventoryRepository = boxInventoryRepository;
        this.boxLedgerRepository = boxLedgerRepository;
        this.transactionRepository = transactionRepository;
    }

    @Transactional
    public BoxDashboardResponse getDashboard(Long wholesalerId) {
        Wholesaler wholesaler = findWholesaler(wholesalerId);
        ensureDefaultBoxTypes(wholesaler);
        List<BoxInventoryTypeResponse> typeResponses = boxTypeRepository
                .findByWholesaler_IdAndStatusOrderByNameAsc(wholesalerId, RecordStatus.ACTIVE)
                .stream()
                .map((boxType) -> toTypeResponse(wholesalerId, boxType))
                .toList();

        int totalOwned = typeResponses.stream().mapToInt(BoxInventoryTypeResponse::total).sum();
        int inHand = typeResponses.stream().mapToInt(BoxInventoryTypeResponse::inHand).sum();
        int withCustomers = typeResponses.stream().mapToInt(BoxInventoryTypeResponse::withCustomers).sum();
        int withSuppliers = typeResponses.stream().mapToInt(BoxInventoryTypeResponse::withSuppliers).sum();
        int lostDamaged = typeResponses.stream().mapToInt(BoxInventoryTypeResponse::lostDamaged).sum();

        return new BoxDashboardResponse(
                wholesalerId,
                totalOwned,
                inHand,
                withCustomers,
                withSuppliers,
                lostDamaged,
                typeResponses
        );
    }

    @Transactional(readOnly = true)
    public BoxLossStatsResponse getLossStats(Long wholesalerId, Integer monthsInput) {
        findWholesaler(wholesalerId);
        int months = (monthsInput == null || monthsInput <= 0 || monthsInput > 24) ? 3 : monthsInput;

        YearMonth thisMonth = YearMonth.now();
        LocalDateTime since = thisMonth.minusMonths(months - 1L).atDay(1).atStartOfDay();
        List<Object[]> rows = boxLedgerRepository.findLostStats(wholesalerId, since);

        // Pre-fill the last N months so the chart has zero buckets too
        Map<String, long[]> map = new LinkedHashMap<>();
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM");
        for (int i = months - 1; i >= 0; i--) {
            map.put(thisMonth.minusMonths(i).format(fmt), new long[]{0, 0});
        }

        for (Object[] row : rows) {
            String month = (String) row[0];
            String boxType = ((String) row[1]).toUpperCase();
            long qty = ((Number) row[3]).longValue();
            long[] entry = map.computeIfAbsent(month, k -> new long[]{0, 0});
            if ("BANGLA".equals(boxType)) entry[0] += qty;
            else if ("CHINA".equals(boxType)) entry[1] += qty;
        }

        List<BoxLossStatsResponse.MonthBucket> buckets = new ArrayList<>();
        long totalBangla = 0, totalChina = 0;
        for (Map.Entry<String, long[]> e : map.entrySet()) {
            long b = e.getValue()[0];
            long c = e.getValue()[1];
            totalBangla += b;
            totalChina += c;
            buckets.add(new BoxLossStatsResponse.MonthBucket(e.getKey(), b, c, b + c));
        }
        return new BoxLossStatsResponse(months, totalBangla + totalChina, totalBangla, totalChina, buckets);
    }

    @Transactional
    public BoxDashboardResponse addBoxes(Long wholesalerId, BoxQuantityRequest request) {
        Wholesaler wholesaler = findWholesaler(wholesalerId);
        BoxType boxType = findBoxType(wholesalerId, request.boxType());
        int quantity = positiveQuantity(request.quantity());
        BoxInventory inventory = findOrCreateInventory(wholesaler, boxType);

        inventory.setTotalOwned(inventory.getTotalOwned() + quantity);
        inventory.setInHand(inventory.getInHand() + quantity);
        boxInventoryRepository.save(inventory);

        saveLedger(wholesaler, boxType, BoxMovementType.PURCHASE, quantity, request.note());
        saveTransaction(wholesalerId, "Crate purchase — " + quantity + " " + boxType.getName() + " added to shop");
        return getDashboard(wholesalerId);
    }

    @Transactional
    public BoxDashboardResponse markLostOrDamaged(Long wholesalerId, BoxQuantityRequest request) {
        Wholesaler wholesaler = findWholesaler(wholesalerId);
        BoxType boxType = findBoxType(wholesalerId, request.boxType());
        int quantity = positiveQuantity(request.quantity());
        BoxInventory inventory = findOrCreateInventory(wholesaler, boxType);

        if (inventory.getInHand() < quantity) {
            throw new BadRequestException("Not enough boxes in hand for this update.");
        }

        BoxMovementType movementType = resolveLossMovement(request.reason());
        inventory.setInHand(inventory.getInHand() - quantity);
        inventory.setLostDamaged(inventory.getLostDamaged() + quantity);
        boxInventoryRepository.save(inventory);

        saveLedger(wholesaler, boxType, movementType, quantity, request.note());
        saveTransaction(wholesalerId, quantity + " " + boxType.getName() + " crates marked " + movementType.name().toLowerCase());
        return getDashboard(wholesalerId);
    }

    private void saveTransaction(Long wholesalerId, String description) {
        Transaction transaction = new Transaction();
        transaction.setWholesalerId(wholesalerId);
        transaction.setTransactionType(TransactionType.PAYMENT);
        transaction.setSaleAmount(BigDecimal.ZERO);
        transaction.setPaymentAmount(BigDecimal.ZERO);
        transaction.setDueAmount(BigDecimal.ZERO);
        transaction.setDescription(description);
        transactionRepository.save(transaction);
    }

    private BoxInventoryTypeResponse toTypeResponse(Long wholesalerId, BoxType boxType) {
        BoxInventory inventory = boxInventoryRepository
                .findByWholesaler_IdAndBoxType_Id(wholesalerId, boxType.getId())
                .orElse(null);

        int inHand = value(inventory, BoxInventory::getInHand);
        int withCustomers = value(inventory, BoxInventory::getWithCustomers);
        int withSuppliers = value(inventory, BoxInventory::getWithSuppliers);
        int lostDamaged = value(inventory, BoxInventory::getLostDamaged);

        return new BoxInventoryTypeResponse(
                boxType.getId(),
                boxType.getName(),
                inHand + withCustomers + withSuppliers + lostDamaged,
                inHand,
                withCustomers,
                withSuppliers,
                lostDamaged
        );
    }

    private int value(BoxInventory inventory, InventoryValue valueReader) {
        return inventory == null ? 0 : valueReader.get(inventory);
    }

    private BoxInventory findOrCreateInventory(Wholesaler wholesaler, BoxType boxType) {
        return boxInventoryRepository
                .findByWholesaler_IdAndBoxType_Id(wholesaler.getId(), boxType.getId())
                .orElseGet(() -> {
                    BoxInventory inventory = new BoxInventory();
                    inventory.setWholesaler(wholesaler);
                    inventory.setBoxType(boxType);
                    inventory.setTotalOwned(0);
                    inventory.setInHand(0);
                    inventory.setWithCustomers(0);
                    inventory.setWithSuppliers(0);
                    inventory.setLostDamaged(0);
                    return inventory;
                });
    }

    private void saveLedger(
            Wholesaler wholesaler,
            BoxType boxType,
            BoxMovementType movementType,
            int quantity,
            String note
    ) {
        BoxLedger ledger = new BoxLedger();
        ledger.setWholesaler(wholesaler);
        ledger.setBoxType(boxType);
        ledger.setPartyType(BoxLedgerPartyType.WHOLESALER);
        ledger.setMovementType(movementType);
        ledger.setQuantity(quantity);
        ledger.setReferenceType(BoxReferenceType.MANUAL);
        ledger.setNote(clean(note));
        boxLedgerRepository.save(ledger);
    }

    private Wholesaler findWholesaler(Long wholesalerId) {
        if (wholesalerId == null) {
            throw new BadRequestException("Wholesaler id is required.");
        }
        return wholesalerRepository.findById(wholesalerId)
                .orElseThrow(() -> new BadRequestException("Wholesaler not found."));
    }

    private BoxType findBoxType(Long wholesalerId, String value) {
        Wholesaler wholesaler = findWholesaler(wholesalerId);
        String boxType = normalizeBoxType(value);
        return boxTypeRepository.findByWholesaler_IdAndNameIgnoreCaseAndStatus(wholesalerId, boxType, RecordStatus.ACTIVE)
                .orElseGet(() -> createBoxType(wholesaler, boxType));
    }

    private void ensureDefaultBoxTypes(Wholesaler wholesaler) {
        ensureBoxType(wholesaler, "BANGLA");
        ensureBoxType(wholesaler, "CHINA");
    }

    private void ensureBoxType(Wholesaler wholesaler, String boxType) {
        boxTypeRepository.findByWholesaler_IdAndNameIgnoreCaseAndStatus(
                wholesaler.getId(),
                boxType,
                RecordStatus.ACTIVE
        ).orElseGet(() -> createBoxType(wholesaler, boxType));
    }

    private BoxType createBoxType(Wholesaler wholesaler, String boxType) {
        BoxType newBoxType = new BoxType();
        newBoxType.setWholesaler(wholesaler);
        newBoxType.setName(boxType);
        newBoxType.setStatus(RecordStatus.ACTIVE);
        return boxTypeRepository.save(newBoxType);
    }

    private String normalizeBoxType(String value) {
        String boxType = requireText(value, "Box type is required.").toUpperCase(Locale.ROOT);
        if (!boxType.equals("BANGLA") && !boxType.equals("CHINA")) {
            throw new BadRequestException("Invalid box type. Allowed values: BANGLA, CHINA.");
        }
        return boxType;
    }

    private int positiveQuantity(Integer value) {
        int quantity = value == null ? 0 : value;
        if (quantity <= 0) {
            throw new BadRequestException("Quantity must be greater than zero.");
        }
        return quantity;
    }

    private BoxMovementType resolveLossMovement(String reason) {
        String cleaned = clean(reason);
        if (cleaned == null) {
            return BoxMovementType.LOST;
        }
        return cleaned.equalsIgnoreCase("DAMAGED") || cleaned.equalsIgnoreCase("BROKEN")
                ? BoxMovementType.DAMAGED
                : BoxMovementType.LOST;
    }

    private String requireText(String value, String message) {
        String cleaned = clean(value);
        if (cleaned == null || cleaned.isBlank()) {
            throw new BadRequestException(message);
        }
        return cleaned;
    }

    private String clean(String value) {
        return value == null ? null : value.trim();
    }

    private interface InventoryValue {
        int get(BoxInventory inventory);
    }
}
