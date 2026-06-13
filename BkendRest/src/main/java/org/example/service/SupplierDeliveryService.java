package org.example.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.example.dto.ReceiveSupplierDeliveryItemRequest;
import org.example.dto.ReceiveSupplierDeliveryRequest;
import org.example.dto.SetShipmentCommissionRequest;
import org.example.dto.SupplierDeliveryItemResponse;
import org.example.dto.SupplierDeliveryResponse;
import org.example.exception.BadRequestException;
import org.example.model.AccountBalance;
import org.example.model.AccountLedger;
import org.example.model.Category;
import org.example.model.Inventory;
import org.example.model.Product;
import org.example.model.StockLedger;
import org.example.model.SupplierDelivery;
import org.example.model.SupplierDeliveryItem;
import org.example.model.SupplierSettlement;
import org.example.model.Transaction;
import org.example.model.Wholesaler;
import org.example.model.WholesalerSupplier;
import org.example.model.enums.AccountReferenceType;
import org.example.model.enums.InventoryStatus;
import org.example.model.enums.PartyType;
import org.example.model.enums.PaymentMethod;
import org.example.model.enums.PostStatus;
import org.example.model.enums.RecordStatus;
import org.example.model.enums.SettlementStatus;
import org.example.model.enums.SettlementType;
import org.example.model.enums.StockDirection;
import org.example.model.enums.StockReferenceType;
import org.example.model.enums.TransactionType;
import org.example.model.enums.UnitType;
import org.example.repository.AccountBalanceRepository;
import org.example.repository.AccountLedgerRepository;
import org.example.repository.CategoryRepository;
import org.example.repository.InventoryRepository;
import org.example.repository.ProductRepository;
import org.example.repository.SaleItemRepository;
import org.example.repository.StockLedgerRepository;
import org.example.repository.SupplierDeliveryItemRepository;
import org.example.repository.SupplierDeliveryRepository;
import org.example.repository.SupplierSettlementRepository;
import org.example.repository.TransactionRepository;
import org.example.repository.WholesalerRepository;
import org.example.repository.WholesalerSupplierRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SupplierDeliveryService {

    private final WholesalerRepository wholesalerRepository;
    private final WholesalerSupplierRepository wholesalerSupplierRepository;
    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final InventoryRepository inventoryRepository;
    private final SupplierDeliveryRepository supplierDeliveryRepository;
    private final SupplierDeliveryItemRepository supplierDeliveryItemRepository;
    private final StockLedgerRepository stockLedgerRepository;
    private final SaleItemRepository saleItemRepository;
    private final AccountBalanceRepository accountBalanceRepository;
    private final AccountLedgerRepository accountLedgerRepository;
    private final AccountBalanceService accountBalanceService;
    private final SupplierSettlementRepository supplierSettlementRepository;
    private final TransactionRepository transactionRepository;
    private final org.example.repository.SupplierExpenseRepository supplierExpenseRepository;
    private final org.example.repository.SubCategoryRepository subCategoryRepository;
    private final ExpensePaydownService expensePaydownService;

    public SupplierDeliveryService(
            WholesalerRepository wholesalerRepository,
            WholesalerSupplierRepository wholesalerSupplierRepository,
            ProductRepository productRepository,
            CategoryRepository categoryRepository,
            InventoryRepository inventoryRepository,
            SupplierDeliveryRepository supplierDeliveryRepository,
            SupplierDeliveryItemRepository supplierDeliveryItemRepository,
            StockLedgerRepository stockLedgerRepository,
            SaleItemRepository saleItemRepository,
            AccountBalanceRepository accountBalanceRepository,
            AccountLedgerRepository accountLedgerRepository,
            AccountBalanceService accountBalanceService,
            SupplierSettlementRepository supplierSettlementRepository,
            TransactionRepository transactionRepository,
            org.example.repository.SupplierExpenseRepository supplierExpenseRepository,
            org.example.repository.SubCategoryRepository subCategoryRepository,
            ExpensePaydownService expensePaydownService
    ) {
        this.wholesalerRepository = wholesalerRepository;
        this.wholesalerSupplierRepository = wholesalerSupplierRepository;
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
        this.inventoryRepository = inventoryRepository;
        this.supplierDeliveryRepository = supplierDeliveryRepository;
        this.supplierDeliveryItemRepository = supplierDeliveryItemRepository;
        this.stockLedgerRepository = stockLedgerRepository;
        this.saleItemRepository = saleItemRepository;
        this.accountBalanceRepository = accountBalanceRepository;
        this.accountLedgerRepository = accountLedgerRepository;
        this.accountBalanceService = accountBalanceService;
        this.supplierSettlementRepository = supplierSettlementRepository;
        this.transactionRepository = transactionRepository;
        this.supplierExpenseRepository = supplierExpenseRepository;
        this.subCategoryRepository = subCategoryRepository;
        this.expensePaydownService = expensePaydownService;
    }


    @Transactional(readOnly = true)
    public List<SupplierDeliveryResponse> listSupplierDeliveries(Long wholesalerId) {
        findWholesaler(wholesalerId);
        return supplierDeliveryRepository.findByWholesaler_IdOrderByDeliveryDateDesc(wholesalerId)
                .stream()
                .map(this::toDeliveryResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<SupplierDeliveryResponse> listShipmentsForSupplier(Long wholesalerId, Long supplierAccountId) {
        findWholesaler(wholesalerId);
        if (supplierAccountId == null) {
            throw new BadRequestException("Supplier account is required.");
        }
        return supplierDeliveryRepository
                .findByWholesaler_IdAndWholesalerSupplier_IdOrderByDeliveryDateDesc(wholesalerId, supplierAccountId)
                .stream()
                .map(this::toDeliveryResponse)
                .toList();
    }

    @Transactional
    public SupplierDeliveryResponse updateShipment(Long wholesalerId, org.example.dto.UpdateShipmentRequest request) {
        findWholesaler(wholesalerId);
        if (request == null || request.deliveryId() == null) {
            throw new BadRequestException("Shipment is required.");
        }
        SupplierDelivery delivery = supplierDeliveryRepository.findById(request.deliveryId())
                .orElseThrow(() -> new BadRequestException("Shipment not found."));
        if (!delivery.getWholesaler().getId().equals(wholesalerId)) {
            throw new BadRequestException("Shipment does not belong to this wholesaler.");
        }
        String name = clean(request.name());
        if (name == null || name.isBlank()) {
            throw new BadRequestException("Shipment name is required.");
        }
        delivery.setName(name);
        delivery.setNote(clean(request.note()));
        delivery = supplierDeliveryRepository.save(delivery);
        return toDeliveryResponse(delivery);
    }

    @Transactional
    public SupplierDeliveryResponse setCommissionRate(Long wholesalerId, SetShipmentCommissionRequest request) {
        findWholesaler(wholesalerId);
        if (request == null || request.deliveryId() == null) {
            throw new BadRequestException("Shipment is required.");
        }
        BigDecimal rate = nonNegative(request.commissionRate(), "Commission rate cannot be negative.");
        if (rate.compareTo(BigDecimal.valueOf(100)) > 0) {
            throw new BadRequestException("Commission rate cannot exceed 100%.");
        }
        SupplierDelivery delivery = supplierDeliveryRepository.findById(request.deliveryId())
                .orElseThrow(() -> new BadRequestException("Shipment not found."));
        if (!delivery.getWholesaler().getId().equals(wholesalerId)) {
            throw new BadRequestException("Shipment does not belong to this wholesaler.");
        }
        delivery.setCommissionRate(rate);
        delivery = supplierDeliveryRepository.save(delivery);
        return toDeliveryResponse(delivery);
    }

    /**
     * Settle = status close only. It does NOT move money or touch the supplier balance —
     * the balance is the live net of (sold − commission − expense) minus payments. Settle
     * just marks a fully-sold lot as done. One-way: re-open is refused.
     */
    @Transactional
    public SupplierDeliveryResponse setSettlementStatus(Long wholesalerId, org.example.dto.SettleShipmentRequest request) {
        findWholesaler(wholesalerId);
        if (request == null || request.deliveryId() == null) {
            throw new BadRequestException("Shipment is required.");
        }
        boolean settle = request.settled() == null || request.settled();
        if (!settle) {
            throw new BadRequestException("Re-opening a settled shipment is not supported. Use manual payment adjustments instead.");
        }
        SupplierDelivery delivery = supplierDeliveryRepository.findById(request.deliveryId())
                .orElseThrow(() -> new BadRequestException("Shipment not found."));
        if (!delivery.getWholesaler().getId().equals(wholesalerId)) {
            throw new BadRequestException("Shipment does not belong to this wholesaler.");
        }
        if (delivery.getSettlementStatus() == SettlementStatus.SETTLED) {
            throw new BadRequestException("Shipment is already settled.");
        }
        if (delivery.getCommissionRate() == null) {
            throw new BadRequestException("Set the commission rate before settling this shipment.");
        }
        if (inventoryRepository.existsByDelivery_IdAndQuantityOnHandGreaterThan(delivery.getId(), BigDecimal.ZERO)) {
            throw new BadRequestException("Cannot settle: this shipment still has unsold stock.");
        }

        // Settle is a status close only — it does NOT move money. The supplier balance is
        // the live net of (sold − commission − expense) minus payments, computed in
        // WholesalerService; settling just marks the lot done.
        delivery.setSettlementStatus(SettlementStatus.SETTLED);
        delivery = supplierDeliveryRepository.save(delivery);
        return toDeliveryResponse(delivery);
    }

    private void recordShipmentSettlement(
            Wholesaler wholesaler,
            WholesalerSupplier supplierAccount,
            SupplierDelivery delivery,
            SettlementType type,
            BigDecimal amount,
            boolean reducesPayable,
            String note
    ) {
        AccountBalance balance = accountBalanceService.getOrCreate(
                wholesaler, PartyType.WHOLESALER_SUPPLIER, supplierAccount.getId(), supplierAccount.getOpeningDue());
        BigDecimal previousDue = money(balance.getBalance());
        BigDecimal dueAfter = reducesPayable ? money(previousDue.subtract(amount)) : previousDue;
        if (reducesPayable) {
            balance.setBalance(dueAfter);
            accountBalanceRepository.save(balance);
        }

        SupplierSettlement settlement = new SupplierSettlement();
        settlement.setWholesaler(wholesaler);
        settlement.setWholesalerSupplier(supplierAccount);
        settlement.setSettlementDate(LocalDateTime.now());
        settlement.setSettlementType(type);
        settlement.setAmount(amount);
        settlement.setPreviousDue(previousDue);
        settlement.setDueAfterSettlement(dueAfter);
        settlement.setPaymentMethod(PaymentMethod.CASH);
        settlement.setNote(note);
        settlement = supplierSettlementRepository.save(settlement);

        if (reducesPayable) {
            AccountLedger ledger = new AccountLedger();
            ledger.setWholesaler(wholesaler);
            ledger.setPartyType(PartyType.WHOLESALER_SUPPLIER);
            ledger.setPartyAccountId(supplierAccount.getId());
            ledger.setReferenceType(AccountReferenceType.SUPPLIER_SETTLEMENT);
            ledger.setReferenceId(settlement.getId());
            ledger.setDebit(amount);
            ledger.setCredit(BigDecimal.ZERO);
            ledger.setNote(note);
            accountLedgerRepository.save(ledger);
        }

        Transaction tx = new Transaction();
        tx.setWholesalerId(wholesaler.getId());
        tx.setTransactionType(TransactionType.PAYMENT);
        tx.setWholesalerSupplierId(supplierAccount.getId());
        tx.setSaleAmount(BigDecimal.ZERO);
        tx.setPaymentAmount(amount);
        tx.setDueAmount(dueAfter);
        tx.setDescription(note);
        transactionRepository.save(tx);
    }

    @Transactional
    public SupplierDeliveryResponse receiveSupplierDelivery(Long wholesalerId, ReceiveSupplierDeliveryRequest request) {
        Wholesaler wholesaler = findWholesaler(wholesalerId);
        if (request.wholesalerSupplierId() == null) {
            throw new BadRequestException("Wholesaler supplier account id is required.");
        }

        WholesalerSupplier wholesalerSupplier = wholesalerSupplierRepository
                .findById(request.wholesalerSupplierId())
                .orElseThrow(() -> new BadRequestException("Supplier account not found."));

        if (!wholesalerSupplier.getWholesaler().getId().equals(wholesalerId)) {
            throw new BadRequestException("Supplier account does not belong to this wholesaler.");
        }

        if (request.items() == null || request.items().isEmpty()) {
            throw new BadRequestException("At least one delivery item is required.");
        }

        BigDecimal estimatedValue = nonNegative(request.estimatedValue(), "Estimated value cannot be negative.");
        BigDecimal advancePaid = nonNegative(request.advancePaid(), "Advance paid cannot be negative.");
        BigDecimal commissionRate = request.commissionRate() == null ? null
                : nonNegative(request.commissionRate(), "Commission rate cannot be negative.");

        String shipmentName = clean(request.name());
        if (shipmentName == null || shipmentName.isBlank()) {
            throw new BadRequestException("Shipment name is required.");
        }

        SupplierDelivery delivery = new SupplierDelivery();
        delivery.setWholesaler(wholesaler);
        delivery.setWholesalerSupplier(wholesalerSupplier);
        delivery.setName(shipmentName);
        delivery.setDeliveryDate(request.deliveryDate() == null ? LocalDateTime.now() : request.deliveryDate());
        delivery.setEstimatedValue(estimatedValue);
        delivery.setAdvancePaid(advancePaid);
        delivery.setCommissionRate(commissionRate);
        delivery.setSettlementStatus(SettlementStatus.OPEN);
        delivery.setNote(clean(request.note()));
        delivery.setStatus(PostStatus.POSTED);
        delivery.setTotalQuantity(BigDecimal.ZERO);
        delivery = supplierDeliveryRepository.save(delivery);

        BigDecimal totalQuantity = BigDecimal.ZERO;
        List<SupplierDeliveryItemResponse> itemResponses = new ArrayList<>();

        for (ReceiveSupplierDeliveryItemRequest itemRequest : request.items()) {
            DeliveryItemContext itemContext = receiveDeliveryItem(wholesaler, wholesalerSupplier, delivery, itemRequest);
            totalQuantity = totalQuantity.add(itemContext.deliveryItem().getQuantity());
            itemResponses.add(toDeliveryItemResponse(itemContext.deliveryItem(), itemContext.inventory()));
        }

        delivery.setTotalQuantity(totalQuantity);
        delivery = supplierDeliveryRepository.save(delivery);

        // Advance against product is money paid to the supplier up front. Record it as
        // a product payment so it reduces the supplier payable and shows in the statement.
        if (advancePaid.signum() > 0) {
            postAdvancePayment(wholesaler, wholesalerSupplier, delivery, advancePaid);
        }

        return toDeliveryResponse(delivery, itemResponses);
    }

    private void postAdvancePayment(
            Wholesaler wholesaler,
            WholesalerSupplier supplierAccount,
            SupplierDelivery delivery,
            BigDecimal amount
    ) {
        AccountBalance balance = accountBalanceService.getOrCreate(
                wholesaler, PartyType.WHOLESALER_SUPPLIER, supplierAccount.getId(), supplierAccount.getOpeningDue());
        BigDecimal previousDue = money(balance.getBalance());
        BigDecimal dueAfter = money(previousDue.subtract(amount)); // may go negative = prepaid
        balance.setBalance(dueAfter);
        accountBalanceRepository.save(balance);

        SupplierSettlement settlement = new SupplierSettlement();
        settlement.setWholesaler(wholesaler);
        settlement.setWholesalerSupplier(supplierAccount);
        settlement.setSettlementDate(LocalDateTime.now());
        settlement.setSettlementType(SettlementType.PRODUCT_PAYMENT);
        settlement.setAmount(money(amount));
        settlement.setPreviousDue(previousDue);
        settlement.setDueAfterSettlement(dueAfter);
        settlement.setPaymentMethod(PaymentMethod.CASH);
        settlement.setNote("Advance for shipment #" + delivery.getId());
        settlement = supplierSettlementRepository.save(settlement);

        AccountLedger ledger = new AccountLedger();
        ledger.setWholesaler(wholesaler);
        ledger.setPartyType(PartyType.WHOLESALER_SUPPLIER);
        ledger.setPartyAccountId(supplierAccount.getId());
        ledger.setReferenceType(AccountReferenceType.SUPPLIER_SETTLEMENT);
        ledger.setReferenceId(settlement.getId());
        ledger.setDebit(money(amount));
        ledger.setCredit(BigDecimal.ZERO);
        ledger.setNote("Shipment advance #" + delivery.getId());
        accountLedgerRepository.save(ledger);

        Transaction tx = new Transaction();
        tx.setWholesalerId(wholesaler.getId());
        tx.setTransactionType(TransactionType.PAYMENT);
        tx.setWholesalerSupplierId(supplierAccount.getId());
        tx.setSaleAmount(BigDecimal.ZERO);
        tx.setPaymentAmount(money(amount));
        tx.setDueAmount(dueAfter);
        tx.setDescription("Shipment #" + delivery.getId() + " advance — ৳" + money(amount).toPlainString());
        transactionRepository.save(tx);
    }


    private SupplierDeliveryResponse toDeliveryResponse(SupplierDelivery delivery) {
        // Map each line to its inventory row (one query) so on-hand / sold reflect reality.
        java.util.Map<String, Inventory> inventoryByKey = new java.util.HashMap<>();
        for (Inventory inv : inventoryRepository.findByDelivery_Id(delivery.getId())) {
            inventoryByKey.put(inventoryKey(
                    inv.getProduct() == null ? null : inv.getProduct().getId(),
                    inv.getCategory() == null ? null : inv.getCategory().getId(),
                    inv.getSubCategory() == null ? null : inv.getSubCategory().getId(),
                    inv.getUnit()), inv);
        }
        List<SupplierDeliveryItemResponse> itemResponses = supplierDeliveryItemRepository.findByDelivery_IdOrderByIdAsc(delivery.getId())
                .stream()
                .map((item) -> toDeliveryItemResponse(item, inventoryByKey.get(inventoryKey(
                        item.getProduct() == null ? null : item.getProduct().getId(),
                        item.getCategory() == null ? null : item.getCategory().getId(),
                        item.getSubCategory() == null ? null : item.getSubCategory().getId(),
                        item.getUnit()))))
                .toList();
        return toDeliveryResponse(delivery, itemResponses);
    }

    private String inventoryKey(Long productId, Long categoryId, Long subCategoryId, UnitType unit) {
        return productId + "|" + categoryId + "|" + subCategoryId + "|" + (unit == null ? "" : unit.name());
    }

    private SupplierDeliveryResponse toDeliveryResponse(SupplierDelivery delivery, List<SupplierDeliveryItemResponse> itemResponses) {
        BigDecimal totalSold = money(zero(saleItemRepository.sumLineTotalByDelivery(delivery.getId())));
        BigDecimal advancePaid = money(zero(delivery.getAdvancePaid()));
        BigDecimal rate = delivery.getCommissionRate();
        BigDecimal commission = rate == null ? BigDecimal.ZERO
                : money(totalSold.multiply(rate).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP));
        BigDecimal expenseTotal = money(zero(supplierExpenseRepository.sumAmountByDelivery(delivery.getId())));
        BigDecimal expenseDue = money(zero(supplierExpenseRepository.sumDueByDelivery(delivery.getId())));
        // Net payable to supplier = total sold − commission − expense. All terms are whole
        // taka (commission ceiled), so this is already an integer. SupplierDueService.netDue
        // sums this exact per-shipment value — keep the two formulas in sync.
        BigDecimal netPayable = totalSold.subtract(commission).subtract(expenseTotal);
        BigDecimal totalUnitsSold = zero(saleItemRepository.sumQuantityByDelivery(delivery.getId()));
        BigDecimal totalKgSold = zero(saleItemRepository.sumSaleWeightByDelivery(delivery.getId()));
        return new SupplierDeliveryResponse(
                delivery.getId(),
                delivery.getWholesaler().getId(),
                delivery.getWholesalerSupplier().getId(),
                delivery.getName(),
                delivery.getDeliveryDate(),
                delivery.getTotalQuantity(),
                delivery.getStatus().name(),
                delivery.getNote(),
                money(zero(delivery.getEstimatedValue())),
                advancePaid,
                rate,
                delivery.getSettlementStatus() == null ? SettlementStatus.OPEN.name() : delivery.getSettlementStatus().name(),
                totalSold,
                commission,
                netPayable,
                expenseTotal,
                expenseDue,
                totalUnitsSold,
                totalKgSold,
                itemResponses
        );
    }

    private DeliveryItemContext receiveDeliveryItem(
            Wholesaler wholesaler,
            WholesalerSupplier wholesalerSupplier,
            SupplierDelivery delivery,
            ReceiveSupplierDeliveryItemRequest request
    ) {
        BigDecimal quantity = positive(request.quantity(), "Quantity must be greater than zero.");
        if (clean(request.unit()) == null) {
            throw new BadRequestException("Unit is required for the delivery line.");
        }
        UnitType unit = parseUnit(request.unit());
        Product product = resolveProduct(request);
        Category category = resolveCategory(request, product);
        org.example.model.SubCategory subCategory = resolveSubCategory(request, category);

        SupplierDeliveryItem deliveryItem = new SupplierDeliveryItem();
        deliveryItem.setWholesaler(wholesaler);
        deliveryItem.setDelivery(delivery);
        deliveryItem.setProduct(product);
        deliveryItem.setCategory(category);
        deliveryItem.setSubCategory(subCategory);
        deliveryItem.setQuantity(quantity);
        deliveryItem.setUnit(unit);
        deliveryItem.setNote(clean(request.note()));
        deliveryItem = supplierDeliveryItemRepository.save(deliveryItem);

        Inventory inventory = findInventory(wholesaler, delivery, product, category, subCategory, unit)
                .orElseGet(() -> {
                    Inventory newInventory = new Inventory();
                    newInventory.setWholesaler(wholesaler);
                    newInventory.setWholesalerSupplier(wholesalerSupplier);
                    newInventory.setDelivery(delivery);
                    newInventory.setProduct(product);
                    newInventory.setCategory(category);
                    newInventory.setSubCategory(subCategory);
                    newInventory.setQuantityOnHand(BigDecimal.ZERO);
                    newInventory.setUnit(unit);
                    return newInventory;
                });
        inventory.setQuantityOnHand((inventory.getQuantityOnHand() == null ? BigDecimal.ZERO : inventory.getQuantityOnHand()).add(quantity));
        inventory.setStatus(InventoryStatus.ACTIVE);
        inventory = inventoryRepository.save(inventory);

        StockLedger stockLedger = new StockLedger();
        stockLedger.setWholesaler(wholesaler);
        stockLedger.setWholesalerSupplier(wholesalerSupplier);
        stockLedger.setProduct(product);
        stockLedger.setCategory(category);
        stockLedger.setReferenceType(StockReferenceType.SUPPLIER_DELIVERY);
        stockLedger.setReferenceId(delivery.getId());
        stockLedger.setDirection(StockDirection.IN);
        stockLedger.setQuantity(quantity);
        stockLedger.setNote(clean(request.note()));
        stockLedgerRepository.save(stockLedger);

        return new DeliveryItemContext(deliveryItem, inventory);
    }

    private java.util.Optional<Inventory> findInventory(
            Wholesaler wholesaler,
            SupplierDelivery delivery,
            Product product,
            Category category,
            org.example.model.SubCategory subCategory,
            UnitType unit
    ) {
        if (category == null) {
            return inventoryRepository.findByWholesaler_IdAndDelivery_IdAndProduct_IdAndCategoryIsNullAndSubCategoryIsNullAndUnit(
                    wholesaler.getId(), delivery.getId(), product.getId(), unit);
        }
        if (subCategory == null) {
            return inventoryRepository.findByWholesaler_IdAndDelivery_IdAndProduct_IdAndCategory_IdAndSubCategoryIsNullAndUnit(
                    wholesaler.getId(), delivery.getId(), product.getId(), category.getId(), unit);
        }
        return inventoryRepository.findByWholesaler_IdAndDelivery_IdAndProduct_IdAndCategory_IdAndSubCategory_IdAndUnit(
                wholesaler.getId(), delivery.getId(), product.getId(), category.getId(), subCategory.getId(), unit);
    }

    private Product resolveProduct(ReceiveSupplierDeliveryItemRequest request) {
        if (request.productId() == null) {
            throw new BadRequestException("Product is required (pick from catalog).");
        }
        return productRepository.findById(request.productId())
                .orElseThrow(() -> new BadRequestException("Product not found."));
    }

    /** Look up the variety (Level-2) for this line, if any. */
    private Category resolveCategory(ReceiveSupplierDeliveryItemRequest request, Product product) {
        if (request.categoryId() == null) {
            return null;
        }
        Category cat = categoryRepository.findById(request.categoryId())
                .orElseThrow(() -> new BadRequestException("Variety not found."));
        if (!cat.getProduct().getId().equals(product.getId())) {
            throw new BadRequestException("Variety does not belong to the selected product.");
        }
        return cat;
    }

    /** Look up the lot (Level-3), validating consistency with the variety's usesLots flag. */
    private org.example.model.SubCategory resolveSubCategory(
            ReceiveSupplierDeliveryItemRequest request, Category category) {
        if (request.subCategoryId() == null) {
            if (category != null && category.isUsesLots()) {
                throw new BadRequestException("Variety \"" + category.getName() + "\" requires a lot (Lot1..LotN).");
            }
            return null;
        }
        if (category == null || !category.isUsesLots()) {
            throw new BadRequestException("Lot can only be set on a variety that uses lots.");
        }
        return subCategoryRepository.findById(request.subCategoryId())
                .orElseThrow(() -> new BadRequestException("Lot not found."));
    }

    private Wholesaler findWholesaler(Long wholesalerId) {
        if (wholesalerId == null) {
            throw new BadRequestException("Wholesaler id is required.");
        }
        return wholesalerRepository.findById(wholesalerId)
                .orElseThrow(() -> new BadRequestException("Wholesaler not found."));
    }

    private SupplierDeliveryItemResponse toDeliveryItemResponse(
            SupplierDeliveryItem deliveryItem,
            Inventory inventory
    ) {
        Category category = deliveryItem.getCategory();
        Product product = deliveryItem.getProduct();
        org.example.model.SubCategory sub = deliveryItem.getSubCategory();
        return new SupplierDeliveryItemResponse(
                deliveryItem.getId(),
                inventory == null ? null : inventory.getId(),
                product.getId(),
                product.getName(),
                category == null ? null : category.getId(),
                category == null ? null : category.getName(),
                sub == null ? null : sub.getId(),
                sub == null ? null : sub.getName(),
                deliveryItem.getQuantity(),
                deliveryItem.getUnit().name(),
                inventory == null ? deliveryItem.getQuantity() : inventory.getQuantityOnHand(),
                deliveryItem.getNote()
        );
    }

    private BigDecimal positive(BigDecimal value, String message) {
        BigDecimal normalized = value == null ? BigDecimal.ZERO : value;
        if (normalized.signum() <= 0) {
            throw new BadRequestException(message);
        }
        return normalized;
    }

    private BigDecimal nonNegative(BigDecimal value, String message) {
        BigDecimal normalized = value == null ? BigDecimal.ZERO : value;
        if (normalized.signum() < 0) {
            throw new BadRequestException(message);
        }
        return normalized;
    }

    private BigDecimal zero(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private BigDecimal money(BigDecimal value) {
        return (value == null ? BigDecimal.ZERO : value).setScale(0, RoundingMode.CEILING);
    }

    private UnitType parseUnit(String value) {
        String cleaned = clean(value);
        if (cleaned == null || cleaned.isBlank()) {
            return UnitType.PCS;
        }
        try {
            return UnitType.valueOf(cleaned.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Invalid unit. Allowed values: PCS, KG, DOZEN, CRATE, BAG, MOUND.");
        }
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

    private record DeliveryItemContext(SupplierDeliveryItem deliveryItem, Inventory inventory) {
    }
}
