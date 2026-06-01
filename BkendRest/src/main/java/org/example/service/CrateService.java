package org.example.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.example.dto.CrateDashboardResponse;
import org.example.dto.CrateInventoryTypeResponse;
import org.example.dto.CrateLossStatsResponse;
import org.example.dto.CrateTypeQuantity;
import org.example.dto.CrateQuantityRequest;
import org.example.exception.BadRequestException;
import org.example.model.AccountBalance;
import org.example.model.AccountLedger;
import org.example.model.BoxInventory;
import org.example.model.BoxLedger;
import org.example.model.BoxType;
import org.example.model.CrateType;
import org.example.model.Transaction;
import org.example.model.Wholesaler;
import org.example.model.WholesalerCustomer;
import org.example.model.WholesalerSupplier;
import org.example.model.enums.AccountReferenceType;
import org.example.model.enums.BoxLedgerPartyType;
import org.example.model.enums.BoxMovementType;
import org.example.model.enums.BoxReferenceType;
import org.example.model.enums.PartyType;
import org.example.model.enums.RecordStatus;
import org.example.model.enums.TransactionType;
import org.example.repository.AccountBalanceRepository;
import org.example.repository.AccountLedgerRepository;
import org.example.repository.BoxInventoryRepository;
import org.example.repository.BoxLedgerRepository;
import org.example.repository.BoxTypeRepository;
import org.example.repository.CrateTypeRepository;
import org.example.repository.TransactionRepository;
import org.example.repository.WholesalerCustomerRepository;
import org.example.repository.WholesalerRepository;
import org.example.repository.WholesalerSupplierRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CrateService {

    private final WholesalerRepository wholesalerRepository;
    private final BoxTypeRepository boxTypeRepository;
    private final BoxInventoryRepository boxInventoryRepository;
    private final BoxLedgerRepository boxLedgerRepository;
    private final TransactionRepository transactionRepository;
    private final WholesalerCustomerRepository wholesalerCustomerRepository;
    private final WholesalerSupplierRepository wholesalerSupplierRepository;
    private final AccountBalanceService accountBalanceService;
    private final AccountBalanceRepository accountBalanceRepository;
    private final AccountLedgerRepository accountLedgerRepository;
    private final CrateTypeRepository crateTypeRepository;

    public CrateService(
            WholesalerRepository wholesalerRepository,
            BoxTypeRepository boxTypeRepository,
            BoxInventoryRepository boxInventoryRepository,
            BoxLedgerRepository boxLedgerRepository,
            TransactionRepository transactionRepository,
            WholesalerCustomerRepository wholesalerCustomerRepository,
            WholesalerSupplierRepository wholesalerSupplierRepository,
            AccountBalanceService accountBalanceService,
            AccountBalanceRepository accountBalanceRepository,
            AccountLedgerRepository accountLedgerRepository,
            CrateTypeRepository crateTypeRepository
    ) {
        this.wholesalerRepository = wholesalerRepository;
        this.boxTypeRepository = boxTypeRepository;
        this.boxInventoryRepository = boxInventoryRepository;
        this.boxLedgerRepository = boxLedgerRepository;
        this.transactionRepository = transactionRepository;
        this.wholesalerCustomerRepository = wholesalerCustomerRepository;
        this.wholesalerSupplierRepository = wholesalerSupplierRepository;
        this.accountBalanceService = accountBalanceService;
        this.accountBalanceRepository = accountBalanceRepository;
        this.accountLedgerRepository = accountLedgerRepository;
        this.crateTypeRepository = crateTypeRepository;
    }

    @Transactional
    public CrateDashboardResponse getDashboard(Long wholesalerId) {
        Wholesaler wholesaler = findWholesaler(wholesalerId);
        ensureBoxTypesFromCatalog(wholesaler);
        List<CrateInventoryTypeResponse> typeResponses = boxTypeRepository
                .findByWholesaler_IdAndStatusOrderByNameAsc(wholesalerId, RecordStatus.ACTIVE)
                .stream()
                .map((boxType) -> toTypeResponse(wholesalerId, boxType))
                .toList();

        int totalOwned = typeResponses.stream().mapToInt(CrateInventoryTypeResponse::total).sum();
        int inHand = typeResponses.stream().mapToInt(CrateInventoryTypeResponse::inHand).sum();
        int withCustomers = typeResponses.stream().mapToInt(CrateInventoryTypeResponse::withCustomers).sum();
        int withSuppliers = typeResponses.stream().mapToInt(CrateInventoryTypeResponse::withSuppliers).sum();
        int lostDamaged = typeResponses.stream().mapToInt(CrateInventoryTypeResponse::lostDamaged).sum();

        return new CrateDashboardResponse(
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
    public CrateLossStatsResponse getLossStats(Long wholesalerId, Integer monthsInput) {
        findWholesaler(wholesalerId);
        int months = (monthsInput == null || monthsInput <= 0 || monthsInput > 24) ? 3 : monthsInput;

        YearMonth thisMonth = YearMonth.now();
        LocalDateTime since = thisMonth.minusMonths(months - 1L).atDay(1).atStartOfDay();
        List<Object[]> rows = boxLedgerRepository.findLostStats(wholesalerId, since);

        // Pre-fill the last N months so the chart has zero buckets too. Each month maps
        // crate-type name -> quantity lost (N-type, driven entirely by the data).
        Map<String, Map<String, Long>> byMonth = new LinkedHashMap<>();
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM");
        for (int i = months - 1; i >= 0; i--) {
            byMonth.put(thisMonth.minusMonths(i).format(fmt), new LinkedHashMap<>());
        }

        Map<String, Long> grandByType = new LinkedHashMap<>();
        for (Object[] row : rows) {
            String month = (String) row[0];
            String boxType = ((String) row[1]).toUpperCase(Locale.ROOT);
            long qty = ((Number) row[3]).longValue();
            byMonth.computeIfAbsent(month, k -> new LinkedHashMap<>()).merge(boxType, qty, Long::sum);
            grandByType.merge(boxType, qty, Long::sum);
        }

        List<CrateLossStatsResponse.MonthBucket> buckets = new ArrayList<>();
        for (Map.Entry<String, Map<String, Long>> e : byMonth.entrySet()) {
            List<CrateTypeQuantity> monthTypes = e.getValue().entrySet().stream()
                    .map(t -> new CrateTypeQuantity(t.getKey(), t.getValue()))
                    .toList();
            long monthTotal = monthTypes.stream().mapToLong(CrateTypeQuantity::quantity).sum();
            buckets.add(new CrateLossStatsResponse.MonthBucket(e.getKey(), monthTotal, monthTypes));
        }

        List<CrateTypeQuantity> byType = grandByType.entrySet().stream()
                .map(t -> new CrateTypeQuantity(t.getKey(), t.getValue()))
                .toList();
        long totalLost = byType.stream().mapToLong(CrateTypeQuantity::quantity).sum();
        return new CrateLossStatsResponse(months, totalLost, byType, buckets);
    }

    /**
     * Set / update the wholesaler's purchase cost for a crate type. Used to value
     * lost / damaged crates in the P&L. Safe to call multiple times — only the
     * box_types row is updated; historical box_ledger.unit_cost_snapshot is frozen.
     */
    @Transactional
    public CrateDashboardResponse setCratePrice(Long wholesalerId, org.example.dto.SetCratePriceRequest request) {
        findWholesaler(wholesalerId);
        if (request == null || request.purchasePrice() == null) {
            throw new BadRequestException("purchasePrice is required.");
        }
        if (request.purchasePrice().signum() < 0) {
            throw new BadRequestException("purchasePrice must be zero or positive.");
        }
        BoxType boxType = findBoxType(wholesalerId, request.crateType());
        boxType.setPurchasePrice(money(request.purchasePrice()));
        boxTypeRepository.save(boxType);
        return getDashboard(wholesalerId);
    }

    @Transactional
    public CrateDashboardResponse addBoxes(Long wholesalerId, CrateQuantityRequest request) {
        Wholesaler wholesaler = findWholesaler(wholesalerId);
        BoxType boxType = findBoxType(wholesalerId, request.crateType());
        int quantity = positiveQuantity(request.quantity());
        BoxInventory inventory = findOrCreateInventory(wholesaler, boxType);

        // Cost per crate is mandatory — crates are a capital investment and every batch must carry its price.
        if (request.unitPrice() == null || request.unitPrice().signum() <= 0) {
            throw new BadRequestException("Cost per crate is required and must be greater than zero.");
        }
        BigDecimal batchUnitPrice = money(request.unitPrice());
        // Keep BoxType.purchasePrice in sync so the UI default reflects the most-recent price.
        boxType.setPurchasePrice(batchUnitPrice);
        boxTypeRepository.save(boxType);

        // Recompute weighted-average cost across stock currently on the books.
        int existingStock = inventory.getInHand() + inventory.getWithCustomers() + inventory.getWithSuppliers();
        BigDecimal oldWac = inventory.getWeightedAvgCost() == null ? BigDecimal.ZERO : inventory.getWeightedAvgCost();
        BigDecimal oldValue = BigDecimal.valueOf(existingStock).multiply(oldWac);
        BigDecimal newValue = BigDecimal.valueOf(quantity).multiply(batchUnitPrice);
        int totalStock = existingStock + quantity;
        BigDecimal newWac = totalStock == 0
                ? BigDecimal.ZERO
                : oldValue.add(newValue).divide(BigDecimal.valueOf(totalStock), 2, java.math.RoundingMode.HALF_UP);
        inventory.setWeightedAvgCost(newWac);

        inventory.setTotalOwned(inventory.getTotalOwned() + quantity);
        inventory.setInHand(inventory.getInHand() + quantity);
        boxInventoryRepository.save(inventory);

        savePurchaseLedger(wholesaler, boxType, quantity, request.note(), batchUnitPrice);
        saveTransaction(wholesalerId,
                "Crate purchase — " + quantity + " " + boxType.getName() + " added @ ৳" + batchUnitPrice);
        return getDashboard(wholesalerId);
    }

    @Transactional
    public CrateDashboardResponse markLostOrDamaged(Long wholesalerId, CrateQuantityRequest request) {
        Wholesaler wholesaler = findWholesaler(wholesalerId);
        BoxType boxType = findBoxType(wholesalerId, request.crateType());
        int quantity = positiveQuantity(request.quantity());
        BoxInventory inventory = findOrCreateInventory(wholesaler, boxType);

        if (inventory.getInHand() < quantity) {
            throw new BadRequestException("Not enough boxes in hand for this update.");
        }

        BoxMovementType movementType = resolveLossMovement(request.reason());
        inventory.setInHand(inventory.getInHand() - quantity);
        inventory.setLostDamaged(inventory.getLostDamaged() + quantity);
        boxInventoryRepository.save(inventory);

        // Snapshot weighted-average cost so future purchases / price edits don't shift historical P&L.
        // Loss is always absorbed against crate capital — snapshot the WAC for the P&L.
        BigDecimal unitCost = money(inventory.getWeightedAvgCost());
        saveLossLedger(wholesaler, boxType, movementType, quantity, request.note(), unitCost);

        String txnDesc = quantity + " " + boxType.getName() + " crates marked "
                + movementType.name().toLowerCase() + " (absorbed)";
        saveTransaction(wholesalerId, txnDesc);
        return getDashboard(wholesalerId);
    }

    /**
     * Sell crates (capital asset) to a customer. Decrements in_hand + total_owned, snapshots
     * the current weighted-average cost as COGS basis, posts the sale price on the box_ledger
     * SOLD row, and raises a DEBIT on the customer's account_ledger (reference CRATE_SALE).
     * P&L picks up only the net (sale - cost), not the gross sale.
     */
    @Transactional
    public CrateDashboardResponse sellCrates(Long wholesalerId, org.example.dto.SellCratesRequest request) {
        Wholesaler wholesaler = findWholesaler(wholesalerId);
        if (request == null) {
            throw new BadRequestException("Request body is required.");
        }
        BoxType boxType = findBoxType(wholesalerId, request.crateType());
        int quantity = positiveQuantity(request.quantity());
        if (request.unitSalePrice() == null || request.unitSalePrice().signum() <= 0) {
            throw new BadRequestException("Sale price per crate is required and must be greater than zero.");
        }
        BoxInventory inventory = findOrCreateInventory(wholesaler, boxType);
        if (inventory.getInHand() < quantity) {
            throw new BadRequestException("Not enough crates in hand for this sale.");
        }

        BigDecimal unitCost = money(inventory.getWeightedAvgCost());
        BigDecimal unitSale = money(request.unitSalePrice());
        BigDecimal saleAmount = money(unitSale.multiply(BigDecimal.valueOf(quantity)));

        // Resolve buyer: permanent customer (account receivable) OR walk-in cash sale.
        WholesalerCustomer customer = null;
        if (request.customerAccountId() != null) {
            customer = wholesalerCustomerRepository
                    .findByWholesaler_IdAndId(wholesalerId, request.customerAccountId())
                    .orElseThrow(() -> new BadRequestException("Customer not found for this wholesaler."));
        }

        // Permanently remove from inventory — sold crates leave the books.
        inventory.setInHand(inventory.getInHand() - quantity);
        inventory.setTotalOwned(inventory.getTotalOwned() - quantity);
        boxInventoryRepository.save(inventory);

        // SOLD ledger row with both cost basis and sale price snapshots.
        // Walk-in sale: partyType=WHOLESALER + null partyAccountId (satisfies chk_box_ledger_party).
        BoxLedger ledger = new BoxLedger();
        ledger.setWholesaler(wholesaler);
        ledger.setBoxType(boxType);
        if (customer != null) {
            ledger.setPartyType(BoxLedgerPartyType.WHOLESALER_CUSTOMER);
            ledger.setPartyAccountId(customer.getId());
        } else {
            ledger.setPartyType(BoxLedgerPartyType.WHOLESALER);
            ledger.setPartyAccountId(null);
        }
        ledger.setMovementType(BoxMovementType.SOLD);
        ledger.setQuantity(quantity);
        ledger.setUnitCostSnapshot(unitCost);
        ledger.setUnitSalePrice(unitSale);
        ledger.setReferenceType(BoxReferenceType.MANUAL);
        ledger.setNote(clean(request.note()));
        BoxLedger savedLedger = boxLedgerRepository.save(ledger);

        if (customer != null) {
            // Charge the permanent customer's account.
            accountBalanceService.getOrCreate(wholesaler, PartyType.WHOLESALER_CUSTOMER, customer.getId(), customer.getOpeningDue());
            AccountBalance balance = accountBalanceRepository
                    .findByWholesaler_IdAndPartyTypeAndPartyAccountId(wholesalerId, PartyType.WHOLESALER_CUSTOMER, customer.getId())
                    .orElseThrow(() -> new BadRequestException("Customer account balance not initialized."));
            balance.setBalance(money(balance.getBalance().add(saleAmount)));
            accountBalanceRepository.save(balance);

            AccountLedger accountRow = new AccountLedger();
            accountRow.setWholesaler(wholesaler);
            accountRow.setPartyType(PartyType.WHOLESALER_CUSTOMER);
            accountRow.setPartyAccountId(customer.getId());
            accountRow.setReferenceType(AccountReferenceType.CRATE_SALE);
            accountRow.setReferenceId(savedLedger.getId());
            accountRow.setDebit(saleAmount);
            accountRow.setCredit(BigDecimal.ZERO);
            accountRow.setNote("Sold " + quantity + " " + boxType.getName() + " crates @ ৳" + unitSale);
            accountLedgerRepository.save(accountRow);

            saveTransaction(wholesalerId,
                    "Sold " + quantity + " " + boxType.getName() + " crates to customer #" + customer.getId()
                            + " @ ৳" + unitSale + " (on account ৳" + saleAmount + ")");
        } else {
            saveTransaction(wholesalerId,
                    "Walk-in sale — " + quantity + " " + boxType.getName() + " crates @ ৳" + unitSale
                            + " (cash ৳" + saleAmount + ")");
        }
        return getDashboard(wholesalerId);
    }

    private static BigDecimal money(BigDecimal value) {
        return (value == null ? BigDecimal.ZERO : value).setScale(2, java.math.RoundingMode.HALF_UP);
    }

    private BoxLedger saveLossLedger(
            Wholesaler wholesaler,
            BoxType boxType,
            BoxMovementType movementType,
            int quantity,
            String note,
            BigDecimal unitCostSnapshot
    ) {
        BoxLedger ledger = new BoxLedger();
        ledger.setWholesaler(wholesaler);
        ledger.setBoxType(boxType);
        ledger.setPartyType(BoxLedgerPartyType.WHOLESALER);
        ledger.setMovementType(movementType);
        ledger.setQuantity(quantity);
        ledger.setUnitCostSnapshot(unitCostSnapshot);
        ledger.setReferenceType(BoxReferenceType.MANUAL);
        ledger.setNote(clean(note));
        return boxLedgerRepository.save(ledger);
    }

    /** PURCHASE row with this batch's unit cost snapshot. */
    private void savePurchaseLedger(
            Wholesaler wholesaler,
            BoxType boxType,
            int quantity,
            String note,
            BigDecimal batchUnitPrice
    ) {
        BoxLedger ledger = new BoxLedger();
        ledger.setWholesaler(wholesaler);
        ledger.setBoxType(boxType);
        ledger.setPartyType(BoxLedgerPartyType.WHOLESALER);
        ledger.setMovementType(BoxMovementType.PURCHASE);
        ledger.setQuantity(quantity);
        ledger.setUnitCostSnapshot(batchUnitPrice);
        ledger.setReferenceType(BoxReferenceType.MANUAL);
        ledger.setNote(clean(note));
        boxLedgerRepository.save(ledger);
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

    private CrateInventoryTypeResponse toTypeResponse(Long wholesalerId, BoxType boxType) {
        BoxInventory inventory = boxInventoryRepository
                .findByWholesaler_IdAndBoxType_Id(wholesalerId, boxType.getId())
                .orElse(null);

        int inHand = value(inventory, BoxInventory::getInHand);
        int withCustomers = value(inventory, BoxInventory::getWithCustomers);
        int withSuppliers = value(inventory, BoxInventory::getWithSuppliers);
        int lostDamaged = value(inventory, BoxInventory::getLostDamaged);

        return new CrateInventoryTypeResponse(
                boxType.getId(),
                boxType.getName(),
                inHand + withCustomers + withSuppliers + lostDamaged,
                inHand,
                withCustomers,
                withSuppliers,
                lostDamaged,
                boxType.getPurchasePrice() == null ? BigDecimal.ZERO : boxType.getPurchasePrice()
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
        // Reactivate an existing (possibly disabled) row, else create a fresh one — never
        // insert a duplicate name (unique key on (wholesaler_id, name)). This covers a type
        // that was disabled and then re-added to the catalog before the dashboard reconciled.
        return boxTypeRepository.findByWholesaler_IdAndNameIgnoreCase(wholesalerId, boxType)
                .map((existing) -> {
                    if (existing.getStatus() != RecordStatus.ACTIVE) {
                        existing.setStatus(RecordStatus.ACTIVE);
                        return boxTypeRepository.save(existing);
                    }
                    return existing;
                })
                .orElseGet(() -> createBoxType(wholesaler, boxType));
    }

    /**
     * Reconcile this wholesaler's box_types to mirror the active global crate-type catalog
     * exactly — so the dashboard shows whatever set the admin defined (2, 3, 4, or more),
     * never a fixed/stale list. Adds any missing catalog type (price 0 until first purchase)
     * and disables any leftover box_type no longer in the catalog (e.g. types an admin
     * removed, or rows seeded by older builds).
     */
    private void ensureBoxTypesFromCatalog(Wholesaler wholesaler) {
        List<CrateType> catalog = crateTypeRepository.findByStatusOrderByNameAsc(RecordStatus.ACTIVE);
        Set<String> catalogNames = new HashSet<>();
        for (CrateType crateType : catalog) {
            catalogNames.add(crateType.getName().toUpperCase(Locale.ROOT));
            // Reactivate an existing (possibly disabled) row, else create a fresh one — never
            // insert a duplicate name (unique key on (wholesaler_id, name)).
            boxTypeRepository.findByWholesaler_IdAndNameIgnoreCase(wholesaler.getId(), crateType.getName())
                    .ifPresentOrElse((existing) -> {
                        if (existing.getStatus() != RecordStatus.ACTIVE) {
                            existing.setStatus(RecordStatus.ACTIVE);
                            boxTypeRepository.save(existing);
                        }
                    }, () -> createBoxType(wholesaler, crateType.getName()));
        }

        for (BoxType boxType : boxTypeRepository
                .findByWholesaler_IdAndStatusOrderByNameAsc(wholesaler.getId(), RecordStatus.ACTIVE)) {
            if (!catalogNames.contains(boxType.getName().toUpperCase(Locale.ROOT))) {
                boxType.setStatus(RecordStatus.DISABLED);
                boxTypeRepository.save(boxType);
            }
        }
    }

    private BoxType createBoxType(Wholesaler wholesaler, String boxType) {
        BoxType newBoxType = new BoxType();
        newBoxType.setWholesaler(wholesaler);
        newBoxType.setName(boxType);
        newBoxType.setStatus(RecordStatus.ACTIVE);
        return boxTypeRepository.save(newBoxType);
    }

    private String normalizeBoxType(String value) {
        String boxType = requireText(value, "Crate type is required.").toUpperCase(Locale.ROOT);
        if (crateTypeRepository.findByNameIgnoreCaseAndStatus(boxType, RecordStatus.ACTIVE).isEmpty()) {
            throw new BadRequestException("Crate type '" + boxType + "' is not in the catalog. Ask admin to add it.");
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
