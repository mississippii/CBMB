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
import org.example.dto.CrateOpLine;
import org.example.model.enums.PaymentMethod;
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
import org.example.repository.CustomerCrateHoldingRepository;
import org.example.repository.SupplierCrateHoldingRepository;
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
    private final CustomerCrateHoldingRepository customerCrateHoldingRepository;
    private final SupplierCrateHoldingRepository supplierCrateHoldingRepository;
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
            CustomerCrateHoldingRepository customerCrateHoldingRepository,
            SupplierCrateHoldingRepository supplierCrateHoldingRepository,
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
        this.customerCrateHoldingRepository = customerCrateHoldingRepository;
        this.supplierCrateHoldingRepository = supplierCrateHoldingRepository;
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
        int customerCratesInShop = safeInt(customerCrateHoldingRepository.sumHeldInShop(wholesalerId));
        int supplierCratesInShop = safeInt(supplierCrateHoldingRepository.sumHeldInShop(wholesalerId));
        int withCustomers = typeResponses.stream().mapToInt(CrateInventoryTypeResponse::withCustomers).sum();
        int withSuppliers = typeResponses.stream().mapToInt(CrateInventoryTypeResponse::withSuppliers).sum();
        int lostDamaged = typeResponses.stream().mapToInt(CrateInventoryTypeResponse::lostDamaged).sum();

        // Capital tied up in crates currently on the books (lost/damaged are written off, so
        // they don't count): Σ (inHand + withCustomers + withSuppliers) × weighted-avg cost.
        BigDecimal totalCrateValue = typeResponses.stream()
                .map((t) -> t.weightedAvgCost().multiply(
                        BigDecimal.valueOf((long) t.inHand() + t.withCustomers() + t.withSuppliers())))
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(0, java.math.RoundingMode.CEILING);

        BigDecimal refundableWalkInCrateSales = money(boxLedgerRepository.sumWalkInCrateRefundableSales(wholesalerId));
        BigDecimal permanentCustomerRefundableMoney = money(wholesalerCustomerRepository.sumCrateDepositHeld(wholesalerId));
        BigDecimal totalRefundableCrateMoney = refundableWalkInCrateSales.add(permanentCustomerRefundableMoney);

        return new CrateDashboardResponse(
                wholesalerId,
                totalOwned,
                inHand,
                customerCratesInShop,
                supplierCratesInShop,
                withCustomers,
                withSuppliers,
                lostDamaged,
                totalCrateValue,
                totalRefundableCrateMoney,
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
        Wholesaler wholesaler = findWholesaler(wholesalerId);
        if (request == null || request.purchasePrice() == null) {
            throw new BadRequestException("purchasePrice is required.");
        }
        if (request.purchasePrice().signum() < 0) {
            throw new BadRequestException("purchasePrice must be zero or positive.");
        }
        BoxType boxType = findBoxType(wholesalerId, request.crateType());
        // Crate cost is always rounded UP to a whole taka.
        BigDecimal price = money(request.purchasePrice()).setScale(0, java.math.RoundingMode.CEILING);
        boxType.setPurchasePrice(price);
        boxTypeRepository.save(boxType);
        // Manual override of the weighted-average cost (seed/correct). Future purchases
        // recompute the WAC from this basis.
        BoxInventory inventory = findOrCreateInventory(wholesaler, boxType);
        inventory.setWeightedAvgCost(price);
        boxInventoryRepository.save(inventory);
        return getDashboard(wholesalerId);
    }

    @Transactional
    public CrateDashboardResponse addBoxes(Long wholesalerId, CrateQuantityRequest request) {
        Wholesaler wholesaler = findWholesaler(wholesalerId);
        if (request == null) {
            throw new BadRequestException("Request body is required.");
        }
        PaymentMethod paymentMethod = parsePurchaseMethod(request.paymentMethod());
        for (CrateOpLine line : opLines(request.lines(), request.crateType(), request.quantity(), request.unitPrice(), null)) {
            applyPurchase(wholesaler, wholesalerId, line.crateType(), line.quantity(), line.unitPrice(), request.note(), paymentMethod);
        }
        return getDashboard(wholesalerId);
    }

    /** How a crate purchase was paid. Defaults to CASH; NONE is not valid (a purchase always moves money). */
    private PaymentMethod parsePurchaseMethod(String raw) {
        if (raw == null || raw.isBlank()) {
            return PaymentMethod.CASH;
        }
        PaymentMethod method;
        try {
            method = PaymentMethod.valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Unknown payment method: " + raw);
        }
        if (method == PaymentMethod.NONE) {
            throw new BadRequestException("A crate purchase must have a payment method.");
        }
        return method;
    }

    /** Adds one crate-type batch: WAC recompute, inventory bump, PURCHASE ledger + transaction. */
    private void applyPurchase(Wholesaler wholesaler, Long wholesalerId, String crateType, Integer quantityInput, BigDecimal unitPriceInput, String note, PaymentMethod paymentMethod) {
        BoxType boxType = findBoxType(wholesalerId, crateType);
        int quantity = positiveQuantity(quantityInput);
        BoxInventory inventory = findOrCreateInventory(wholesaler, boxType);

        // Cost per crate is mandatory — crates are a capital investment and every batch must carry its price.
        if (unitPriceInput == null || unitPriceInput.signum() <= 0) {
            throw new BadRequestException("Cost per crate is required and must be greater than zero for " + boxType.getName() + ".");
        }
        BigDecimal batchUnitPrice = money(unitPriceInput);
        // Keep BoxType.purchasePrice in sync so the UI default reflects the most-recent price.
        boxType.setPurchasePrice(batchUnitPrice);
        boxTypeRepository.save(boxType);

        // Recompute weighted-average cost across stock currently on the books (lost/damaged
        // crates are NOT part of the base). The per-crate cost is always rounded UP to a
        // whole taka (e.g. 183.33 → 184).
        int existingStock = inventory.getInHand() + inventory.getWithCustomers() + inventory.getWithSuppliers();
        BigDecimal oldWac = inventory.getWeightedAvgCost() == null ? BigDecimal.ZERO : inventory.getWeightedAvgCost();
        BigDecimal oldValue = BigDecimal.valueOf(existingStock).multiply(oldWac);
        BigDecimal newValue = BigDecimal.valueOf(quantity).multiply(batchUnitPrice);
        int totalStock = existingStock + quantity;
        BigDecimal newWac = totalStock == 0
                ? BigDecimal.ZERO
                : oldValue.add(newValue).divide(BigDecimal.valueOf(totalStock), 0, java.math.RoundingMode.CEILING);
        inventory.setWeightedAvgCost(newWac);

        inventory.setTotalOwned(inventory.getTotalOwned() + quantity);
        inventory.setInHand(inventory.getInHand() + quantity);
        boxInventoryRepository.save(inventory);

        savePurchaseLedger(wholesaler, boxType, quantity, note, batchUnitPrice, paymentMethod);
        saveTransaction(wholesalerId,
                "Crate purchase — " + quantity + " " + boxType.getName() + " added @ ৳" + batchUnitPrice
                        + " (" + paymentMethod + ")");
    }

    @Transactional
    public CrateDashboardResponse markLostOrDamaged(Long wholesalerId, CrateQuantityRequest request) {
        Wholesaler wholesaler = findWholesaler(wholesalerId);
        if (request == null) {
            throw new BadRequestException("Request body is required.");
        }
        for (CrateOpLine line : opLines(request.lines(), request.crateType(), request.quantity(), null, null)) {
            applyLoss(wholesaler, wholesalerId, line.crateType(), line.quantity(), request.reason(), request.note());
        }
        return getDashboard(wholesalerId);
    }

    /** Marks one crate type lost/damaged: inventory move + loss ledger (WAC snapshot) + transaction. */
    private void applyLoss(Wholesaler wholesaler, Long wholesalerId, String crateType, Integer quantityInput, String reason, String note) {
        BoxType boxType = findBoxType(wholesalerId, crateType);
        int quantity = positiveQuantity(quantityInput);
        BoxInventory inventory = findOrCreateInventory(wholesaler, boxType);

        if (inventory.getInHand() < quantity) {
            throw new BadRequestException("Not enough " + boxType.getName() + " boxes in hand for this update.");
        }

        BoxMovementType movementType = resolveLossMovement(reason);
        inventory.setInHand(inventory.getInHand() - quantity);
        inventory.setLostDamaged(inventory.getLostDamaged() + quantity);
        boxInventoryRepository.save(inventory);

        // Loss is always absorbed against crate capital — snapshot the WAC for the P&L.
        BigDecimal unitCost = money(inventory.getWeightedAvgCost());
        saveLossLedger(wholesaler, boxType, movementType, quantity, note, unitCost);

        saveTransaction(wholesalerId, quantity + " " + boxType.getName() + " crates marked "
                + movementType.name().toLowerCase() + " (absorbed)");
    }

    /**
     * Resolve the lines to process: the multi-type {@code lines} if provided, otherwise a
     * single line built from the request's top-level fields (backward compatible).
     */
    private java.util.List<CrateOpLine> opLines(java.util.List<CrateOpLine> lines, String crateType, Integer quantity, BigDecimal unitPrice, BigDecimal unitSalePrice) {
        if (lines != null && !lines.isEmpty()) {
            return lines;
        }
        return java.util.List.of(new CrateOpLine(crateType, quantity, unitPrice, unitSalePrice));
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
        // Resolve buyer once: permanent customer (account receivable) OR walk-in cash sale.
        WholesalerCustomer customer = null;
        if (request.customerAccountId() != null) {
            customer = wholesalerCustomerRepository
                    .findByWholesaler_IdAndId(wholesalerId, request.customerAccountId())
                    .orElseThrow(() -> new BadRequestException("Customer not found for this wholesaler."));
        }
        // Walk-in sales carry a payment method (CASH lands in the drawer); on-account sales ignore it.
        PaymentMethod walkInMethod = customer == null ? parsePurchaseMethod(request.paymentMethod()) : null;
        for (CrateOpLine line : opLines(request.lines(), request.crateType(), request.quantity(), null, request.unitSalePrice())) {
            applySale(wholesaler, wholesalerId, line.crateType(), line.quantity(), line.unitSalePrice(), customer, walkInMethod, request.note(), request.saleId());
        }
        return getDashboard(wholesalerId);
    }

    /** Sells one crate type: removes from inventory, SOLD ledger (cost+sale snapshot), charges customer or records cash. */
    private void applySale(Wholesaler wholesaler, Long wholesalerId, String crateType, Integer quantityInput, BigDecimal unitSalePriceInput, WholesalerCustomer customer, PaymentMethod walkInMethod, String note, Long saleId) {
        BoxType boxType = findBoxType(wholesalerId, crateType);
        int quantity = positiveQuantity(quantityInput);
        if (unitSalePriceInput == null || unitSalePriceInput.signum() <= 0) {
            throw new BadRequestException("Sale price per crate is required and must be greater than zero for " + boxType.getName() + ".");
        }
        BoxInventory inventory = findOrCreateInventory(wholesaler, boxType);
        if (inventory.getInHand() < quantity) {
            throw new BadRequestException("Not enough " + boxType.getName() + " crates in hand for this sale.");
        }

        BigDecimal unitCost = money(inventory.getWeightedAvgCost());
        BigDecimal unitSale = money(unitSalePriceInput);
        BigDecimal saleAmount = money(unitSale.multiply(BigDecimal.valueOf(quantity)));

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
            // Walk-in: stamp how the buyer paid so the cash book counts CASH sales only.
            ledger.setPaymentMethod(walkInMethod);
        }
        ledger.setMovementType(BoxMovementType.SOLD);
        ledger.setQuantity(quantity);
        ledger.setUnitCostSnapshot(unitCost);
        ledger.setUnitSalePrice(unitSale);
        ledger.setReferenceType(saleId == null ? BoxReferenceType.MANUAL : BoxReferenceType.SALE);
        ledger.setReferenceId(saleId);
        ledger.setNote(clean(note));
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
                            + " (" + walkInMethod + " ৳" + saleAmount + ")");
        }
    }

    @Transactional
    public CrateDashboardResponse refundWalkInCrates(Long wholesalerId, org.example.dto.CrateRefundRequest request) {
        Wholesaler wholesaler = findWholesaler(wholesalerId);
        if (request == null) {
            throw new BadRequestException("Request body is required.");
        }
        List<CrateOpLine> lines = opLines(request.lines(), null, null, null, null);
        int totalQty = lines.stream().mapToInt((line) -> positiveQuantity(line.quantity())).sum();
        BigDecimal refundAmount = positiveMoney(request.refundAmount(), "Refund amount must be greater than zero.");
        BigDecimal refundable = money(boxLedgerRepository.sumWalkInCrateRefundableSales(wholesalerId));
        if (refundAmount.compareTo(refundable) > 0) {
            throw new BadRequestException("Refund cannot exceed refundable walk-in crate money ৳" + refundable.toPlainString() + ".");
        }
        PaymentMethod method = parsePurchaseMethod(request.paymentMethod());
        BigDecimal unitRefund = refundAmount.divide(BigDecimal.valueOf(totalQty), 2, java.math.RoundingMode.HALF_UP);

        for (CrateOpLine line : lines) {
            applyWalkInRefund(wholesaler, wholesalerId, line.crateType(), line.quantity(), unitRefund, method, request.note());
        }
        saveTransaction(wholesalerId, "Walk-in crate refund — " + totalQty + " crates, ৳" + refundAmount + " (" + method + ")");
        return getDashboard(wholesalerId);
    }

    private void applyWalkInRefund(Wholesaler wholesaler, Long wholesalerId, String crateType, Integer quantityInput, BigDecimal unitRefund, PaymentMethod paymentMethod, String note) {
        BoxType boxType = findBoxType(wholesalerId, crateType);
        int quantity = positiveQuantity(quantityInput);
        BoxInventory inventory = findOrCreateInventory(wholesaler, boxType);
        inventory.setInHand(inventory.getInHand() + quantity);
        inventory.setTotalOwned(inventory.getTotalOwned() + quantity);
        boxInventoryRepository.save(inventory);

        BoxLedger ledger = new BoxLedger();
        ledger.setWholesaler(wholesaler);
        ledger.setBoxType(boxType);
        ledger.setPartyType(BoxLedgerPartyType.WHOLESALER);
        ledger.setPartyAccountId(null);
        ledger.setMovementType(BoxMovementType.WALK_IN_REFUND);
        ledger.setQuantity(quantity);
        ledger.setUnitCostSnapshot(money(inventory.getWeightedAvgCost()));
        ledger.setUnitSalePrice(unitRefund);
        ledger.setPaymentMethod(paymentMethod);
        ledger.setReferenceType(BoxReferenceType.MANUAL);
        ledger.setNote(clean(note));
        boxLedgerRepository.save(ledger);
    }

    private static BigDecimal positiveMoney(BigDecimal value, String message) {
        BigDecimal normalized = money(value);
        if (normalized.signum() <= 0) {
            throw new BadRequestException(message);
        }
        return normalized;
    }

    private static BigDecimal money(BigDecimal value) {
        return (value == null ? BigDecimal.ZERO : value).setScale(0, java.math.RoundingMode.CEILING);
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
            BigDecimal batchUnitPrice,
            PaymentMethod paymentMethod
    ) {
        BoxLedger ledger = new BoxLedger();
        ledger.setWholesaler(wholesaler);
        ledger.setBoxType(boxType);
        ledger.setPartyType(BoxLedgerPartyType.WHOLESALER);
        ledger.setMovementType(BoxMovementType.PURCHASE);
        ledger.setQuantity(quantity);
        ledger.setUnitCostSnapshot(batchUnitPrice);
        ledger.setPaymentMethod(paymentMethod);
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
        int customerCratesInShop = safeInt(customerCrateHoldingRepository.sumHeldInShopByBoxType(wholesalerId, boxType.getId()));
        int supplierCratesInShop = safeInt(supplierCrateHoldingRepository.sumHeldInShopByBoxType(wholesalerId, boxType.getId()));

        return new CrateInventoryTypeResponse(
                boxType.getId(),
                boxType.getName(),
                inHand + withCustomers + withSuppliers + lostDamaged,
                inHand,
                customerCratesInShop,
                supplierCratesInShop,
                withCustomers,
                withSuppliers,
                lostDamaged,
                boxType.getPurchasePrice() == null ? BigDecimal.ZERO : boxType.getPurchasePrice(),
                inventory == null || inventory.getWeightedAvgCost() == null ? BigDecimal.ZERO : inventory.getWeightedAvgCost()
        );
    }

    private int safeInt(Integer value) {
        return value == null ? 0 : value;
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
