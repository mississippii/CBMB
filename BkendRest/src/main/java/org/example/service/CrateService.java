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
import org.example.dto.CrateDashboardResponse;
import org.example.dto.CrateInventoryTypeResponse;
import org.example.dto.CrateLossStatsResponse;
import org.example.dto.CrateQuantityRequest;
import org.example.exception.BadRequestException;
import org.example.model.AccountBalance;
import org.example.model.AccountLedger;
import org.example.model.BoxInventory;
import org.example.model.BoxLedger;
import org.example.model.BoxType;
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
            AccountLedgerRepository accountLedgerRepository
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
    }

    @Transactional
    public CrateDashboardResponse getDashboard(Long wholesalerId) {
        Wholesaler wholesaler = findWholesaler(wholesalerId);
        ensureDefaultBoxTypes(wholesaler);
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

        List<CrateLossStatsResponse.MonthBucket> buckets = new ArrayList<>();
        long totalBangla = 0, totalChina = 0;
        for (Map.Entry<String, long[]> e : map.entrySet()) {
            long b = e.getValue()[0];
            long c = e.getValue()[1];
            totalBangla += b;
            totalChina += c;
            buckets.add(new CrateLossStatsResponse.MonthBucket(e.getKey(), b, c, b + c));
        }
        return new CrateLossStatsResponse(months, totalBangla + totalChina, totalBangla, totalChina, buckets);
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
        BigDecimal unitCost = money(inventory.getWeightedAvgCost());
        BoxLedger lossLedger = saveLossLedger(wholesaler, boxType, movementType, quantity, request.note(), unitCost);

        // If the caller named a compensating party, post the receivable now.
        PartyType compParty = parseCompensationParty(request.compensationPartyType());
        if (compParty != null) {
            BigDecimal compAmount = compensationAmountFor(request.compensationAmount(), unitCost, quantity);
            Long compLedgerId = postCompensationReceivable(
                    wholesaler, compParty, request.compensationPartyAccountId(), compAmount,
                    quantity, boxType, movementType
            );
            lossLedger.setCompensationAccountLedgerId(compLedgerId);
            boxLedgerRepository.save(lossLedger);
        }

        String txnDesc = quantity + " " + boxType.getName() + " crates marked " + movementType.name().toLowerCase()
                + (compParty == null ? " (absorbed)" : " (charged to " + compParty.name() + ")");
        saveTransaction(wholesalerId, txnDesc);
        return getDashboard(wholesalerId);
    }

    /**
     * Retroactively mark a previously-absorbed loss as compensated. Posts the receivable
     * against the named party and stamps the box_ledger row with the new ledger id so
     * the P&L stops counting it as a wholesaler-borne cost.
     *
     * Idempotent guard: re-calling on an already-compensated row throws.
     */
    @Transactional
    public CrateDashboardResponse markLossCompensated(Long wholesalerId, Long boxLedgerId, CrateQuantityRequest request) {
        Wholesaler wholesaler = findWholesaler(wholesalerId);
        BoxLedger lossLedger = boxLedgerRepository
                .findOneByWholesalerAndId(wholesalerId, boxLedgerId)
                .orElseThrow(() -> new BadRequestException("Loss record not found."));

        if (lossLedger.getMovementType() != BoxMovementType.LOST && lossLedger.getMovementType() != BoxMovementType.DAMAGED) {
            throw new BadRequestException("Only LOST or DAMAGED rows can be compensated.");
        }
        if (lossLedger.getCompensationAccountLedgerId() != null) {
            throw new BadRequestException("This loss is already marked as compensated.");
        }

        PartyType compParty = parseCompensationParty(request.compensationPartyType());
        if (compParty == null) {
            throw new BadRequestException("compensationPartyType is required (WHOLESALER_CUSTOMER or WHOLESALER_SUPPLIER).");
        }

        BigDecimal unitCost = lossLedger.getUnitCostSnapshot() != null
                ? lossLedger.getUnitCostSnapshot()
                : money(lossLedger.getBoxType().getPurchasePrice());
        BigDecimal compAmount = compensationAmountFor(request.compensationAmount(), unitCost, lossLedger.getQuantity());

        Long compLedgerId = postCompensationReceivable(
                wholesaler, compParty, request.compensationPartyAccountId(), compAmount,
                lossLedger.getQuantity(), lossLedger.getBoxType(), lossLedger.getMovementType()
        );
        lossLedger.setCompensationAccountLedgerId(compLedgerId);
        if (lossLedger.getUnitCostSnapshot() == null) {
            lossLedger.setUnitCostSnapshot(unitCost);
        }
        boxLedgerRepository.save(lossLedger);

        saveTransaction(wholesalerId,
                "Loss compensated — " + lossLedger.getQuantity() + " " + lossLedger.getBoxType().getName()
                        + " charged to " + compParty.name());
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

    private Long postCompensationReceivable(
            Wholesaler wholesaler,
            PartyType partyType,
            Long partyAccountId,
            BigDecimal amount,
            int quantity,
            BoxType boxType,
            BoxMovementType movementType
    ) {
        if (partyAccountId == null) {
            throw new BadRequestException("compensationPartyAccountId is required when a party is named.");
        }
        if (amount == null || amount.signum() <= 0) {
            throw new BadRequestException("Compensation amount must be greater than zero.");
        }
        // Validate the party belongs to this wholesaler — keep cross-tenant safety.
        if (partyType == PartyType.WHOLESALER_CUSTOMER) {
            WholesalerCustomer customer = wholesalerCustomerRepository
                    .findByWholesaler_IdAndId(wholesaler.getId(), partyAccountId)
                    .orElseThrow(() -> new BadRequestException("Customer not found for this wholesaler."));
            accountBalanceService.getOrCreate(wholesaler, partyType, customer.getId(), customer.getOpeningDue());
        } else if (partyType == PartyType.WHOLESALER_SUPPLIER) {
            WholesalerSupplier supplier = wholesalerSupplierRepository
                    .findByWholesaler_IdAndId(wholesaler.getId(), partyAccountId)
                    .orElseThrow(() -> new BadRequestException("Supplier not found for this wholesaler."));
            accountBalanceService.getOrCreate(wholesaler, partyType, supplier.getId(), supplier.getOpeningDue());
        } else {
            throw new BadRequestException("Unsupported party type for crate compensation.");
        }

        AccountBalance balance = accountBalanceRepository
                .findByWholesaler_IdAndPartyTypeAndPartyAccountId(wholesaler.getId(), partyType, partyAccountId)
                .orElseThrow(() -> new BadRequestException("Account balance not initialized."));

        // Customer: +amount (customer owes more). Supplier: -amount (reduces what we owe / supplier credits us).
        BigDecimal delta = partyType == PartyType.WHOLESALER_CUSTOMER ? amount : amount.negate();
        balance.setBalance(money(balance.getBalance().add(delta)));
        accountBalanceRepository.save(balance);

        AccountLedger ledger = new AccountLedger();
        ledger.setWholesaler(wholesaler);
        ledger.setPartyType(partyType);
        ledger.setPartyAccountId(partyAccountId);
        ledger.setReferenceType(AccountReferenceType.CRATE_LOSS_COMPENSATION);
        // referenceId will be back-filled with the box_ledger id by caller (we don't have it yet
        // when this is called from markLostOrDamaged — the loss ledger is saved first but not flushed).
        ledger.setReferenceId(null);
        // Charging a party = DEBIT (they owe us this amount).
        ledger.setDebit(amount);
        ledger.setCredit(BigDecimal.ZERO);
        ledger.setNote("Charge for " + quantity + " " + boxType.getName() + " " + movementType.name().toLowerCase());
        AccountLedger saved = accountLedgerRepository.save(ledger);
        return saved.getId();
    }

    private static PartyType parseCompensationParty(String raw) {
        if (raw == null) return null;
        String upper = raw.trim().toUpperCase(Locale.ROOT);
        if (upper.isEmpty() || upper.equals("NONE")) return null;
        return switch (upper) {
            case "WHOLESALER_CUSTOMER", "CUSTOMER" -> PartyType.WHOLESALER_CUSTOMER;
            case "WHOLESALER_SUPPLIER", "SUPPLIER" -> PartyType.WHOLESALER_SUPPLIER;
            default -> throw new BadRequestException("Invalid compensationPartyType: " + raw);
        };
    }

    private static BigDecimal compensationAmountFor(BigDecimal override, BigDecimal unitCost, int quantity) {
        if (override != null) return money(override);
        return money(unitCost.multiply(BigDecimal.valueOf(quantity)));
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
