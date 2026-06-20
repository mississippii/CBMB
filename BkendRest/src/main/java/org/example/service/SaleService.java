package org.example.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import org.example.dto.CreateSaleRequest;
import org.example.dto.SaleDetailResponse;
import org.example.dto.SaleResponse;
import org.example.exception.BadRequestException;
import org.example.model.AccountBalance;
import org.example.model.AccountLedger;
import org.example.model.BoxBalance;
import org.example.model.BoxInventory;
import org.example.model.BoxLedger;
import org.example.model.BoxType;
import org.example.model.Category;
import org.example.model.Inventory;
import org.example.model.Sale;
import org.example.model.SaleItem;
import org.example.model.StockLedger;
import org.example.model.Transaction;
import org.example.model.Wholesaler;
import org.example.model.WholesalerCustomer;
import org.example.model.WholesalerSupplier;
import org.example.model.enums.AccountReferenceType;
import org.example.model.enums.BoxLedgerPartyType;
import org.example.model.enums.BoxMovementType;
import org.example.model.enums.BoxReferenceType;
import org.example.model.enums.InventoryStatus;
import org.example.model.enums.PartyType;
import org.example.model.enums.PostStatus;
import org.example.model.enums.RecordStatus;
import org.example.model.enums.SaleType;
import org.example.model.enums.StockDirection;
import org.example.model.enums.StockReferenceType;
import org.example.model.enums.TransactionType;
import org.example.repository.AccountBalanceRepository;
import org.example.repository.AccountLedgerRepository;
import org.example.repository.BoxBalanceRepository;
import org.example.repository.BoxInventoryRepository;
import org.example.repository.BoxLedgerRepository;
import org.example.repository.CrateDepositMovementRepository;
import org.example.repository.BoxTypeRepository;
import org.example.repository.InventoryRepository;
import org.example.repository.SaleItemRepository;
import org.example.repository.SaleRepository;
import org.example.repository.StockLedgerRepository;
import org.example.repository.TransactionRepository;
import org.example.repository.WholesalerCustomerRepository;
import org.example.repository.WholesalerRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SaleService {

    private static final String TRANSACTION_CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private static final int TRANSACTION_CODE_LENGTH = 10;
    private static final SecureRandom TRANSACTION_CODE_RANDOM = new SecureRandom();

    private final WholesalerRepository wholesalerRepository;
    private final InventoryRepository inventoryRepository;
    private final WholesalerCustomerRepository wholesalerCustomerRepository;
    private final SaleRepository saleRepository;
    private final SaleItemRepository saleItemRepository;
    private final StockLedgerRepository stockLedgerRepository;
    private final TransactionRepository transactionRepository;
    private final AccountBalanceRepository accountBalanceRepository;
    private final AccountLedgerRepository accountLedgerRepository;
    private final AccountBalanceService accountBalanceService;
    private final BoxTypeRepository boxTypeRepository;
    private final BoxInventoryRepository boxInventoryRepository;
    private final BoxBalanceRepository boxBalanceRepository;
    private final BoxLedgerRepository boxLedgerRepository;
    private final CrateDepositMovementRepository crateDepositMovementRepository;
    // Crate movement that rides along with a sale is delegated to these so the whole sale stays
    // atomic (same transaction) without duplicating crate borrow/sell/deposit logic.
    private final PaymentService paymentService;
    private final CrateService crateService;

    public SaleService(
            WholesalerRepository wholesalerRepository,
            InventoryRepository inventoryRepository,
            WholesalerCustomerRepository wholesalerCustomerRepository,
            SaleRepository saleRepository,
            SaleItemRepository saleItemRepository,
            StockLedgerRepository stockLedgerRepository,
            TransactionRepository transactionRepository,
            AccountBalanceRepository accountBalanceRepository,
            AccountLedgerRepository accountLedgerRepository,
            AccountBalanceService accountBalanceService,
            BoxTypeRepository boxTypeRepository,
            BoxInventoryRepository boxInventoryRepository,
            BoxBalanceRepository boxBalanceRepository,
            BoxLedgerRepository boxLedgerRepository,
            CrateDepositMovementRepository crateDepositMovementRepository,
            PaymentService paymentService,
            CrateService crateService
    ) {
        this.wholesalerRepository = wholesalerRepository;
        this.inventoryRepository = inventoryRepository;
        this.wholesalerCustomerRepository = wholesalerCustomerRepository;
        this.saleRepository = saleRepository;
        this.saleItemRepository = saleItemRepository;
        this.stockLedgerRepository = stockLedgerRepository;
        this.transactionRepository = transactionRepository;
        this.accountBalanceRepository = accountBalanceRepository;
        this.accountLedgerRepository = accountLedgerRepository;
        this.accountBalanceService = accountBalanceService;
        this.boxTypeRepository = boxTypeRepository;
        this.boxInventoryRepository = boxInventoryRepository;
        this.boxBalanceRepository = boxBalanceRepository;
        this.boxLedgerRepository = boxLedgerRepository;
        this.crateDepositMovementRepository = crateDepositMovementRepository;
        this.paymentService = paymentService;
        this.crateService = crateService;
    }

    /** A request line resolved against its inventory, with computed gross + allocated net. */
    private static final class ResolvedSaleLine {
        Inventory inventory;
        BigDecimal quantity;
        BigDecimal saleWeightKg;
        BigDecimal unitPrice;
        BigDecimal lineGross;
        BigDecimal lineNet;
    }

    @Transactional(readOnly = true)
    public SaleDetailResponse detail(Long wholesalerId, Long saleId) {
        Sale sale = findSaleForWholesaler(wholesalerId, saleId);
        return detailForSale(sale);
    }

    @Transactional(readOnly = true)
    public SaleDetailResponse detailByTransactionCode(Long wholesalerId, String transactionCode) {
        String cleanCode = transactionCode == null ? "" : transactionCode.trim().toUpperCase(java.util.Locale.ROOT);
        Sale sale = saleRepository.findByWholesaler_IdAndTransactionCode(wholesalerId, cleanCode)
                .orElseThrow(() -> new BadRequestException("Sale not found for this transaction ID."));
        return detailForSale(sale);
    }

    private SaleDetailResponse detailForSale(Sale sale) {
        java.util.List<SaleDetailResponse.Item> items = saleItemRepository.findBySale_Id(sale.getId())
                .stream()
                .map(this::toSaleDetailItem)
                .toList();
        return toSaleDetailResponse(sale, sale.getGrossAmount(), sale.getDiscountAmount(), sale.getNetAmount(),
                sale.getPaidAmount(), sale.getDueAmount(), items);
    }

    @Transactional(readOnly = true)
    public SaleDetailResponse detailForSupplier(Long wholesalerId, Long saleId, Long wholesalerSupplierId) {
        Sale sale = findSaleForWholesaler(wholesalerId, saleId);
        java.util.List<SaleDetailResponse.Item> items = saleItemRepository
                .findBySale_IdAndWholesalerSupplier_Id(saleId, wholesalerSupplierId)
                .stream()
                .map(this::toSaleDetailItem)
                .toList();
        if (items.isEmpty()) {
            throw new BadRequestException("Sale not found for this supplier.");
        }
        BigDecimal supplierSaleAmount = cashMoney(items.stream()
                .map(SaleDetailResponse.Item::lineTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add));
        BigDecimal supplierPaidAmount = transactionRepository
                .findFirstByWholesalerIdAndSaleIdAndWholesalerSupplierIdOrderByCreatedAtDesc(
                        wholesalerId, saleId, wholesalerSupplierId)
                .map(Transaction::getPaymentAmount)
                .orElse(BigDecimal.ZERO);
        return toSaleDetailResponse(sale, supplierSaleAmount, BigDecimal.ZERO, supplierSaleAmount,
                supplierPaidAmount, supplierSaleAmount.subtract(supplierPaidAmount).max(BigDecimal.ZERO), items);
    }

    private Sale findSaleForWholesaler(Long wholesalerId, Long saleId) {
        Sale sale = saleRepository.findById(saleId)
                .orElseThrow(() -> new BadRequestException("Sale not found."));
        if (!sale.getWholesaler().getId().equals(wholesalerId)) {
            throw new BadRequestException("Sale does not belong to this wholesaler.");
        }
        return sale;
    }

    private SaleDetailResponse toSaleDetailResponse(
            Sale sale,
            BigDecimal grossAmount,
            BigDecimal discountAmount,
            BigDecimal netAmount,
            BigDecimal paidAmount,
            BigDecimal dueAmount,
            java.util.List<SaleDetailResponse.Item> items
    ) {
        String customerName = sale.getCustomerNameSnapshot();
        String customerPhone = sale.getCustomerPhoneSnapshot();
        if (sale.getWholesalerCustomer() != null && sale.getWholesalerCustomer().getCustomer() != null) {
            customerName = sale.getWholesalerCustomer().getCustomer().getName();
            customerPhone = sale.getWholesalerCustomer().getCustomer().getPhone();
        }

        return new SaleDetailResponse(
                sale.getId(),
                sale.getTransactionCode(),
                sale.getWholesalerCustomer() == null ? null : sale.getWholesalerCustomer().getId(),
                customerName,
                customerPhone,
                sale.getCustomerType(),
                sale.getSaleType().name(),
                sale.getBoxesGiven(),
                saleCrateLines(sale),
                saleCrateDepositAmount(sale),
                saleCrateSaleAmount(sale),
                sale.getNote(),
                grossAmount,
                discountAmount,
                netAmount,
                paidAmount,
                dueAmount,
                sale.getPaymentMethod().name(),
                sale.getStatus().name(),
                sale.getSaleDate(),
                items
        );
    }

    private java.util.List<org.example.dto.CrateTypeQuantity> saleCrateLines(Sale sale) {
        java.util.Map<String, Long> byType = new java.util.LinkedHashMap<>();
        for (BoxLedger ledger : boxLedgerRepository.findByWholesaler_IdAndReferenceTypeAndReferenceId(
                sale.getWholesaler().getId(), BoxReferenceType.SALE, sale.getId())) {
            String name = ledger.getBoxType() == null ? "CRATE" : ledger.getBoxType().getName();
            byType.merge(name, Long.valueOf(ledger.getQuantity()), Long::sum);
        }
        return byType.entrySet().stream()
                .map(entry -> new org.example.dto.CrateTypeQuantity(entry.getKey(), entry.getValue()))
                .toList();
    }

    private BigDecimal saleCrateDepositAmount(Sale sale) {
        return crateDepositMovementRepository.findByWholesalerIdAndSaleId(sale.getWholesaler().getId(), sale.getId())
                .stream()
                .map(org.example.model.CrateDepositMovement::getAmount)
                .filter(amount -> amount != null && amount.signum() > 0)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal saleCrateSaleAmount(Sale sale) {
        return boxLedgerRepository.findByWholesaler_IdAndReferenceTypeAndReferenceId(
                sale.getWholesaler().getId(), BoxReferenceType.SALE, sale.getId())
                .stream()
                .filter(ledger -> ledger.getMovementType() == BoxMovementType.SOLD)
                .map(ledger -> {
                    BigDecimal unitSale = ledger.getUnitSalePrice() == null ? BigDecimal.ZERO : ledger.getUnitSalePrice();
                    return unitSale.multiply(BigDecimal.valueOf(ledger.getQuantity()));
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private SaleDetailResponse.Item toSaleDetailItem(SaleItem item) {
        return new SaleDetailResponse.Item(
                item.getId(),
                item.getWholesalerSupplier().getId(),
                item.getWholesalerSupplier().getSupplier().getName(),
                item.getDelivery() == null ? null : item.getDelivery().getId(),
                item.getDelivery() == null ? null : item.getDelivery().getName(),
                item.getProduct().getId(),
                item.getProduct().getName(),
                item.getCategory() == null ? null : item.getCategory().getId(),
                item.getCategory() == null ? null : item.getCategory().getName(),
                item.getSubCategory() == null ? null : item.getSubCategory().getId(),
                item.getSubCategory() == null ? null : item.getSubCategory().getName(),
                item.getQuantity(),
                item.getSaleWeightKg(),
                item.getUnit().name(),
                item.getUnitPrice(),
                item.getLineTotal(),
                item.getCommissionRate(),
                item.getCommissionAmount()
        );
    }

    @Transactional
    public SaleResponse createSale(Long wholesalerId, CreateSaleRequest request) {
        Wholesaler wholesaler = findWholesaler(wholesalerId);
        boolean oneTimeCustomer = request.wholesalerCustomerId() == null;

        // Normalize to a list of lines. Single-line callers (the "Single Sale" tab and any legacy
        // caller) send the top-level inventoryId/quantity/unitPrice; multi-line callers send `lines`.
        java.util.List<CreateSaleRequest.SaleLine> rawLines =
                (request.lines() != null && !request.lines().isEmpty())
                        ? request.lines()
                        : java.util.List.of(new CreateSaleRequest.SaleLine(
                                request.inventoryId(), request.quantity(),
                                request.saleWeightKg(), request.unitPrice()));

        // Resolve + validate every line and compute its gross. Cumulative quantity per inventory
        // is tracked so the same item sold twice in one sale cannot oversell.
        java.util.List<ResolvedSaleLine> resolved = new java.util.ArrayList<>(rawLines.size());
        java.util.Map<Long, BigDecimal> requestedByInventory = new java.util.HashMap<>();
        BigDecimal grossAmount = BigDecimal.ZERO;
        for (CreateSaleRequest.SaleLine line : rawLines) {
            if (line.inventoryId() == null) {
                throw new BadRequestException("Each sale line needs a product.");
            }
            Inventory inventory = inventoryRepository.findById(line.inventoryId())
                    .orElseThrow(() -> new BadRequestException("Inventory item not found."));
            if (!inventory.getWholesaler().getId().equals(wholesalerId)) {
                throw new BadRequestException("Inventory item does not belong to this wholesaler.");
            }
            BigDecimal quantity = positive(line.quantity(), "Quantity must be greater than zero.");
            BigDecimal unitPrice = preciseMoney(line.unitPrice(), "Unit price cannot be negative.");
            // Weight-priced line: gross = saleWeightKg × unitPrice (per-kg). Pack-priced (default):
            // gross = quantity × unitPrice (per-pack). Inventory deducts `quantity` either way.
            BigDecimal saleWeightKg = null;
            if (line.saleWeightKg() != null && line.saleWeightKg().signum() > 0) {
                saleWeightKg = money3(line.saleWeightKg());
            } else if (line.saleWeightKg() != null && line.saleWeightKg().signum() < 0) {
                throw new BadRequestException("Sale weight cannot be negative.");
            }
            BigDecimal lineGross = saleWeightKg != null
                    ? cashMoney(saleWeightKg.multiply(unitPrice))
                    : cashMoney(quantity.multiply(unitPrice));

            BigDecimal cumulative = requestedByInventory.merge(inventory.getId(), quantity, BigDecimal::add);
            if (inventory.getQuantityOnHand().compareTo(cumulative) < 0) {
                throw new BadRequestException("Insufficient stock for selected product.");
            }

            ResolvedSaleLine r = new ResolvedSaleLine();
            r.inventory = inventory;
            r.quantity = quantity;
            r.saleWeightKg = saleWeightKg;
            r.unitPrice = unitPrice;
            r.lineGross = lineGross;
            resolved.add(r);
            grossAmount = grossAmount.add(lineGross);
        }
        grossAmount = cashMoney(grossAmount);

        BigDecimal discountAmount = cashMoney(nonNegative(request.discountAmount(), "Discount cannot be negative."));
        if (discountAmount.compareTo(grossAmount) > 0) {
            throw new BadRequestException("Discount cannot exceed the sale amount.");
        }
        // Net = gross - discount. Everything downstream (due, commission, supplier payable)
        // works off the net (discounted) amount.
        BigDecimal netAmount = cashMoney(grossAmount.subtract(discountAmount));

        // Allocate the sale-level net across lines pro-rata to each line's gross, so per-supplier
        // commission and payable stay correct. The last line absorbs the rounding remainder.
        BigDecimal allocatedNet = BigDecimal.ZERO;
        for (int i = 0; i < resolved.size(); i++) {
            ResolvedSaleLine r = resolved.get(i);
            BigDecimal lineNet;
            if (i == resolved.size() - 1) {
                lineNet = cashMoney(netAmount.subtract(allocatedNet));
            } else if (grossAmount.signum() == 0) {
                lineNet = BigDecimal.ZERO;
            } else {
                lineNet = cashMoney(netAmount.multiply(r.lineGross).divide(grossAmount, 0, RoundingMode.HALF_UP));
            }
            r.lineNet = lineNet;
            allocatedNet = allocatedNet.add(lineNet);
        }

        BigDecimal paidAmount = cashMoney(nonNegative(request.paymentAmount(), "Payment amount cannot be negative."));
        WholesalerCustomer customerAccount = oneTimeCustomer ? null : resolveCustomerAccount(wholesaler, request);
        String customerNameSnapshot = oneTimeCustomer ? requireText(request.customerName(), "Customer name is required.") : customerAccount.getCustomer().getName();
        String customerPhoneSnapshot = oneTimeCustomer ? requireText(request.customerPhone(), "Customer phone is required.") : customerAccount.getCustomer().getPhone();
        if (oneTimeCustomer && paidAmount.compareTo(netAmount) != 0) {
            throw new BadRequestException("One-time customer must pay the full sale amount.");
        }
        if (paidAmount.compareTo(netAmount) > 0) {
            throw new BadRequestException("Paid amount cannot exceed sale amount. To settle prior due, use the customer settle endpoint after this sale.");
        }
        BigDecimal dueAmount = cashMoney(netAmount.subtract(paidAmount));

        // Legacy single-type crate borrow (kept for back-compat). Multi-line crates ride via crateLines.
        String saleCrateType = oneTimeCustomer ? null : clean(request.crateType());
        Integer cratesGiven = oneTimeCustomer ? 0 : resolveSpecificCrates(request.cratesGiven());
        if (cratesGiven > 0 && (saleCrateType == null || saleCrateType.isBlank())) {
            throw new BadRequestException("Crate type is required when lending crates with a sale.");
        }

        Sale sale = new Sale();
        sale.setWholesaler(wholesaler);
        sale.setWholesalerCustomer(customerAccount);
        sale.setCustomerNameSnapshot(customerNameSnapshot);
        sale.setCustomerPhoneSnapshot(customerPhoneSnapshot);
        sale.setCustomerType(oneTimeCustomer ? "ONE_TIME" : "PERMANENT");
        sale.setTransactionCode(generateTransactionCode());
        sale.setSaleDate(LocalDateTime.now());
        sale.setSaleType(dueAmount.signum() == 0 ? SaleType.PAY_INSTANT : SaleType.PAY_LATER);
        sale.setGrossAmount(grossAmount);
        sale.setDiscountAmount(discountAmount);
        sale.setNetAmount(netAmount);
        sale.setPaidAmount(paidAmount);
        sale.setPaymentMethod(paidAmount.signum() > 0 ? parsePaymentMethod(request.paymentMethod()) : org.example.model.enums.PaymentMethod.NONE);
        sale.setDueAmount(dueAmount);
        sale.setBoxesGiven(cratesGiven);
        sale.setNote(clean(request.note()));
        sale.setStatus(PostStatus.POSTED);
        sale = saleRepository.save(sale);

        // Per line: snapshot commission from its lot, write the SaleItem, deduct inventory, ledger it.
        // Accumulate per-supplier net so each supplier gets one balance update + one transaction.
        java.util.Map<Long, WholesalerSupplier> supplierById = new java.util.LinkedHashMap<>();
        java.util.Map<Long, BigDecimal> netBySupplier = new java.util.LinkedHashMap<>();
        BigDecimal totalCommission = BigDecimal.ZERO;
        for (ResolvedSaleLine r : resolved) {
            Inventory inventory = r.inventory;
            WholesalerSupplier supplierAccount = inventory.getWholesalerSupplier();
            org.example.model.SupplierDelivery delivery = inventory.getDelivery();
            BigDecimal commissionRate = delivery != null && delivery.getCommissionRate() != null
                    ? delivery.getCommissionRate()
                    : BigDecimal.ZERO;
            BigDecimal commissionAmount = cashMoney(r.lineNet.multiply(commissionRate).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP));
            totalCommission = totalCommission.add(commissionAmount);

            SaleItem item = new SaleItem();
            item.setWholesaler(wholesaler);
            item.setSale(sale);
            item.setWholesalerSupplier(supplierAccount);
            item.setDelivery(delivery);
            item.setProduct(inventory.getProduct());
            item.setCategory(inventory.getCategory());
            item.setSubCategory(inventory.getSubCategory());
            item.setQuantity(r.quantity);
            item.setSaleWeightKg(r.saleWeightKg);
            item.setUnit(inventory.getUnit());
            item.setUnitPrice(r.unitPrice);
            item.setLineTotal(r.lineNet);
            item.setCommissionRate(commissionRate);
            item.setCommissionAmount(commissionAmount);
            saleItemRepository.save(item);

            inventory.setQuantityOnHand(inventory.getQuantityOnHand().subtract(r.quantity));
            inventory.setStatus(inventory.getQuantityOnHand().signum() == 0 ? InventoryStatus.STOCK_OUT : InventoryStatus.ACTIVE);
            r.inventory = inventoryRepository.save(inventory);

            saveStockLedger(wholesaler, supplierAccount, r.inventory, sale, r.quantity);

            supplierById.putIfAbsent(supplierAccount.getId(), supplierAccount);
            netBySupplier.merge(supplierAccount.getId(), r.lineNet, BigDecimal::add);
        }

        BigDecimal customerBalance = oneTimeCustomer ? BigDecimal.ZERO
                : applyCustomerSaleBalance(wholesaler, customerAccount, sale, netAmount, paidAmount);
        applySaleCrates(wholesalerId, wholesaler, customerAccount, sale, oneTimeCustomer, request, saleCrateType, cratesGiven);

        // One supplier balance update + one Transaction per supplier. The customer pays once, so
        // the paid amount is split across suppliers pro-rata to their net for the transaction rows.
        Long firstTransactionId = null;
        BigDecimal firstSupplierBalance = null;
        BigDecimal allocatedPaid = BigDecimal.ZERO;
        int supplierIdx = 0;
        int supplierCount = netBySupplier.size();
        for (java.util.Map.Entry<Long, BigDecimal> entry : netBySupplier.entrySet()) {
            WholesalerSupplier supplierAccount = supplierById.get(entry.getKey());
            BigDecimal supplierNet = entry.getValue();
            BigDecimal supplierBalance = applySupplierSaleBalance(wholesaler, supplierAccount, sale, supplierNet);
            if (firstSupplierBalance == null) {
                firstSupplierBalance = supplierBalance;
            }

            BigDecimal supplierPaid;
            if (supplierIdx == supplierCount - 1) {
                supplierPaid = cashMoney(paidAmount.subtract(allocatedPaid));
            } else if (netAmount.signum() == 0) {
                supplierPaid = BigDecimal.ZERO;
            } else {
                supplierPaid = cashMoney(paidAmount.multiply(supplierNet).divide(netAmount, 0, RoundingMode.HALF_UP));
            }
            allocatedPaid = allocatedPaid.add(supplierPaid);
            Transaction tx = saveTransaction(wholesaler, customerAccount, supplierAccount, sale, supplierNet, supplierPaid, customerBalance);
            if (firstTransactionId == null) {
                firstTransactionId = tx.getId();
            }
            supplierIdx++;
        }

        // Response is single-product shaped: report the first line + sale-level totals. Multi-line
        // callers refresh their views afterward, so first-line detail is enough for the toast/echo.
        ResolvedSaleLine head = resolved.get(0);
        Inventory headInv = head.inventory;
        WholesalerSupplier headSupplier = headInv.getWholesalerSupplier();
        Category category = headInv.getCategory();
        return new SaleResponse(
                sale.getId(),
                firstTransactionId,
                sale.getTransactionCode(),
                customerAccount == null ? null : customerAccount.getId(),
                customerNameSnapshot,
                customerPhoneSnapshot,
                oneTimeCustomer ? "ONE_TIME" : "PERMANENT",
                headInv.getId(),
                headInv.getProduct().getId(),
                headInv.getProduct().getName(),
                category == null ? null : category.getId(),
                category == null ? null : category.getName(),
                headInv.getSubCategory() == null ? null : headInv.getSubCategory().getId(),
                headInv.getSubCategory() == null ? null : headInv.getSubCategory().getName(),
                headSupplier.getId(),
                headSupplier.getSupplier().getName(),
                head.quantity,
                head.saleWeightKg,
                headInv.getUnit().name(),
                head.unitPrice,
                grossAmount,
                discountAmount,
                netAmount,
                paidAmount,
                dueAmount,
                customerBalance,
                totalCommission,
                firstSupplierBalance,
                saleCrateType,
                cratesGiven,
                headInv.getQuantityOnHand(),
                sale.getSaleDate()
        );
    }

    private WholesalerCustomer resolveCustomerAccount(Wholesaler wholesaler, CreateSaleRequest request) {
        if (request.wholesalerCustomerId() != null) {
            WholesalerCustomer account = wholesalerCustomerRepository.findById(request.wholesalerCustomerId())
                    .orElseThrow(() -> new BadRequestException("Customer account not found."));
            if (!account.getWholesaler().getId().equals(wholesaler.getId())) {
                throw new BadRequestException("Customer account does not belong to this wholesaler.");
            }
            return account;
        }

        throw new BadRequestException("Permanent customer account is required for due or crate sale.");
    }

    private void saveStockLedger(Wholesaler wholesaler, WholesalerSupplier supplierAccount, Inventory inventory, Sale sale, BigDecimal quantity) {
        StockLedger stockLedger = new StockLedger();
        stockLedger.setWholesaler(wholesaler);
        stockLedger.setWholesalerSupplier(supplierAccount);
        stockLedger.setProduct(inventory.getProduct());
        stockLedger.setCategory(inventory.getCategory());
        stockLedger.setReferenceType(StockReferenceType.SALE);
        stockLedger.setReferenceId(sale.getId());
        stockLedger.setDirection(StockDirection.OUT);
        stockLedger.setQuantity(quantity);
        stockLedger.setNote("Sale #" + sale.getId());
        stockLedgerRepository.save(stockLedger);
    }

    private BigDecimal applyCustomerSaleBalance(
            Wholesaler wholesaler,
            WholesalerCustomer customerAccount,
            Sale sale,
            BigDecimal netAmount,
            BigDecimal paidAmount
    ) {
        AccountBalance balance = accountBalanceService.getOrCreate(
                wholesaler, PartyType.WHOLESALER_CUSTOMER, customerAccount.getId(), customerAccount.getOpeningDue());

        balance.setBalance(cashMoney(balance.getBalance().add(netAmount).subtract(paidAmount)));
        accountBalanceRepository.save(balance);

        AccountLedger saleLedger = new AccountLedger();
        saleLedger.setWholesaler(wholesaler);
        saleLedger.setPartyType(PartyType.WHOLESALER_CUSTOMER);
        saleLedger.setPartyAccountId(customerAccount.getId());
        saleLedger.setReferenceType(AccountReferenceType.SALE);
        saleLedger.setReferenceId(sale.getId());
        saleLedger.setDebit(netAmount);
        saleLedger.setCredit(BigDecimal.ZERO);
        saleLedger.setNote("Sale amount");
        accountLedgerRepository.save(saleLedger);

        if (paidAmount.signum() > 0) {
            AccountLedger paymentLedger = new AccountLedger();
            paymentLedger.setWholesaler(wholesaler);
            paymentLedger.setPartyType(PartyType.WHOLESALER_CUSTOMER);
            paymentLedger.setPartyAccountId(customerAccount.getId());
            paymentLedger.setReferenceType(AccountReferenceType.PAYMENT);
            paymentLedger.setReferenceId(sale.getId());
            paymentLedger.setDebit(BigDecimal.ZERO);
            paymentLedger.setCredit(paidAmount);
            paymentLedger.setNote("Payment received with sale");
            accountLedgerRepository.save(paymentLedger);
        }

        return balance.getBalance();
    }

    /**
     * Move crates that ride along with a sale, in the SAME transaction so the sale is atomic.
     * Walk-in (one-time) → SELL each crate line (delegates to CrateService, which snapshots cost,
     * posts the SOLD ledger + cash). Permanent customer → BORROW all lines + optional deposit
     * (delegates to PaymentService). Falls back to the legacy single-type field when no lines
     * are supplied. All delegate calls join this transaction, so any failure rolls back the sale.
     */
    private void applySaleCrates(
            Long wholesalerId,
            Wholesaler wholesaler,
            WholesalerCustomer customerAccount,
            Sale sale,
            boolean oneTimeCustomer,
            CreateSaleRequest request,
            String legacyCrateType,
            Integer legacyCratesGiven
    ) {
        java.util.List<org.example.dto.CrateOpLine> lines = request.crateLines();
        if (lines != null && !lines.isEmpty()) {
            if (oneTimeCustomer) {
                crateService.sellCrates(wholesalerId, new org.example.dto.SellCratesRequest(
                        null, null, null, null, "Sold with sale #" + sale.getId(),
                        request.cratePaymentMethod(), lines, sale.getId()));
            } else {
                java.util.List<org.example.dto.CrateLineRequest> borrowLines = lines.stream()
                        .map(l -> new org.example.dto.CrateLineRequest(l.crateType(), l.quantity()))
                        .toList();
                paymentService.borrowCustomerCrates(wholesalerId, new org.example.dto.CustomerCrateBorrowRequest(
                        customerAccount.getId(), borrowLines, request.crateDeposit(), "Borrowed with sale #" + sale.getId(), sale.getId()));
            }
            return;
        }
        // Legacy single-type borrow (kept for back-compat; the SaleForm now sends crateLines).
        if (!oneTimeCustomer && legacyCratesGiven != null && legacyCratesGiven > 0) {
            applyCustomerCrateTypeMovement(wholesaler, customerAccount, sale, legacyCrateType, legacyCratesGiven);
        }
    }

    private void applyCustomerCrateTypeMovement(
            Wholesaler wholesaler,
            WholesalerCustomer customerAccount,
            Sale sale,
            String crateTypeValue,
            Integer cratesGiven
    ) {
        if (cratesGiven == null || cratesGiven <= 0) {
            return;
        }

        BoxType boxType = boxTypeRepository
                .findByWholesaler_IdAndNameIgnoreCaseAndStatus(wholesaler.getId(), crateTypeValue, RecordStatus.ACTIVE)
                .orElseThrow(() -> new BadRequestException("Selected crate type is not configured for this wholesaler."));
        BoxInventory boxInventory = boxInventoryRepository
                .findByWholesaler_IdAndBoxType_Id(wholesaler.getId(), boxType.getId())
                .orElseThrow(() -> new BadRequestException("Crate inventory is not available for selected type."));
        if (boxInventory.getInHand() < cratesGiven) {
            throw new BadRequestException("Not enough " + crateTypeValue + " crates in hand for this sale.");
        }

        boxInventory.setInHand(boxInventory.getInHand() - cratesGiven);
        boxInventory.setWithCustomers(boxInventory.getWithCustomers() + cratesGiven);
        boxInventoryRepository.save(boxInventory);

        BoxBalance balance = boxBalanceRepository
                .findByWholesaler_IdAndPartyTypeAndPartyAccountIdAndBoxType_Id(
                        wholesaler.getId(), PartyType.WHOLESALER_CUSTOMER, customerAccount.getId(), boxType.getId()
                )
                .orElseGet(() -> {
                    BoxBalance newBalance = new BoxBalance();
                    newBalance.setWholesaler(wholesaler);
                    newBalance.setBoxType(boxType);
                    newBalance.setPartyType(PartyType.WHOLESALER_CUSTOMER);
                    newBalance.setPartyAccountId(customerAccount.getId());
                    newBalance.setBoxesDue(0);
                    return newBalance;
                });
        balance.setBoxesDue(balance.getBoxesDue() + cratesGiven);
        boxBalanceRepository.save(balance);

        BoxLedger ledger = new BoxLedger();
        ledger.setWholesaler(wholesaler);
        ledger.setBoxType(boxType);
        ledger.setPartyType(BoxLedgerPartyType.WHOLESALER_CUSTOMER);
        ledger.setPartyAccountId(customerAccount.getId());
        ledger.setMovementType(BoxMovementType.GIVEN_TO_CUSTOMER);
        ledger.setQuantity(cratesGiven);
        ledger.setReferenceType(BoxReferenceType.SALE);
        ledger.setReferenceId(sale.getId());
        ledger.setNote(crateTypeValue + " crates given with sale #" + sale.getId());
        boxLedgerRepository.save(ledger);
    }

    private Integer resolveSpecificCrates(Integer value) {
        int normalized = value == null ? 0 : value;
        if (normalized < 0) {
            throw new BadRequestException("Crate quantity cannot be negative.");
        }
        return normalized;
    }

    private BigDecimal applySupplierSaleBalance(
            Wholesaler wholesaler,
            WholesalerSupplier supplierAccount,
            Sale sale,
            BigDecimal saleAmount
    ) {
        AccountBalance balance = accountBalanceService.getOrCreate(
                wholesaler, PartyType.WHOLESALER_SUPPLIER, supplierAccount.getId(), supplierAccount.getOpeningDue());
        if (saleAmount.signum() <= 0) {
            return balance.getBalance();
        }

        balance.setBalance(cashMoney(balance.getBalance().add(saleAmount)));
        accountBalanceRepository.save(balance);

        AccountLedger ledger = new AccountLedger();
        ledger.setWholesaler(wholesaler);
        ledger.setPartyType(PartyType.WHOLESALER_SUPPLIER);
        ledger.setPartyAccountId(supplierAccount.getId());
        ledger.setReferenceType(AccountReferenceType.SALE);
        ledger.setReferenceId(sale.getId());
        ledger.setDebit(BigDecimal.ZERO);
        ledger.setCredit(saleAmount);
        ledger.setNote("Supplier sale amount");
        accountLedgerRepository.save(ledger);
        return balance.getBalance();
    }

    private Transaction saveTransaction(
            Wholesaler wholesaler,
            WholesalerCustomer customerAccount,
            WholesalerSupplier supplierAccount,
            Sale sale,
            BigDecimal netAmount,
            BigDecimal paidAmount,
            BigDecimal dueAmount
    ) {
        Transaction transaction = new Transaction();
        transaction.setWholesalerId(wholesaler.getId());
        transaction.setTransactionType(TransactionType.SALE);
        transaction.setSaleId(sale.getId());
        transaction.setWholesalerCustomerId(customerAccount == null ? null : customerAccount.getId());
        transaction.setWholesalerSupplierId(supplierAccount.getId());
        transaction.setSaleAmount(netAmount);
        transaction.setPaymentAmount(paidAmount);
        transaction.setDueAmount(dueAmount);
        transaction.setDescription("Sale #" + sale.getId());
        return transactionRepository.save(transaction);
    }

    private String generateTransactionCode() {
        for (int attempt = 0; attempt < 20; attempt++) {
            StringBuilder code = new StringBuilder(TRANSACTION_CODE_LENGTH);
            for (int i = 0; i < TRANSACTION_CODE_LENGTH; i++) {
                code.append(TRANSACTION_CODE_CHARS.charAt(
                        TRANSACTION_CODE_RANDOM.nextInt(TRANSACTION_CODE_CHARS.length())));
            }
            String transactionCode = code.toString();
            if (!saleRepository.existsByTransactionCode(transactionCode)) {
                return transactionCode;
            }
        }
        throw new BadRequestException("Could not generate a unique transaction ID. Please try again.");
    }

    private Wholesaler findWholesaler(Long wholesalerId) {
        if (wholesalerId == null) {
            throw new BadRequestException("Wholesaler id is required.");
        }
        return wholesalerRepository.findById(wholesalerId)
                .orElseThrow(() -> new BadRequestException("Wholesaler not found."));
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
        return normalized.setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal preciseMoney(BigDecimal value, String message) {
        return nonNegative(value, message);
    }

    private BigDecimal cashMoney(BigDecimal value) {
        return (value == null ? BigDecimal.ZERO : value).setScale(0, RoundingMode.CEILING);
    }

    /** Three-decimal scale for weight (kg). */
    private BigDecimal money3(BigDecimal value) {
        return value.setScale(3, RoundingMode.HALF_UP);
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

    /** Parse the at-sale payment method; defaults to CASH when missing/unknown. */
    private org.example.model.enums.PaymentMethod parsePaymentMethod(String value) {
        if (value == null || value.isBlank()) {
            return org.example.model.enums.PaymentMethod.CASH;
        }
        try {
            return org.example.model.enums.PaymentMethod.valueOf(value.trim().toUpperCase(java.util.Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            return org.example.model.enums.PaymentMethod.CASH;
        }
    }
}
