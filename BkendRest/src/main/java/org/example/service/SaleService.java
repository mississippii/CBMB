package org.example.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import org.example.dto.CreateSaleRequest;
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
import org.example.model.enums.UnitType;
import org.example.repository.AccountBalanceRepository;
import org.example.repository.AccountLedgerRepository;
import org.example.repository.BoxBalanceRepository;
import org.example.repository.BoxInventoryRepository;
import org.example.repository.BoxLedgerRepository;
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
            BoxLedgerRepository boxLedgerRepository
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
    }

    @Transactional
    public SaleResponse createSale(Long wholesalerId, CreateSaleRequest request) {
        Wholesaler wholesaler = findWholesaler(wholesalerId);
        Inventory inventory = inventoryRepository.findById(request.inventoryId())
                .orElseThrow(() -> new BadRequestException("Inventory item not found."));
        if (!inventory.getWholesaler().getId().equals(wholesalerId)) {
            throw new BadRequestException("Inventory item does not belong to this wholesaler.");
        }

        BigDecimal quantity = positive(request.quantity(), "Quantity must be greater than zero.");
        BigDecimal unitPrice = nonNegative(request.unitPrice(), "Unit price cannot be negative.");
        BigDecimal paidAmount = nonNegative(request.paymentAmount(), "Payment amount cannot be negative.");
        BigDecimal grossAmount = money(quantity.multiply(unitPrice));
        BigDecimal discountAmount = nonNegative(request.discountAmount(), "Discount cannot be negative.");
        if (discountAmount.compareTo(grossAmount) > 0) {
            throw new BadRequestException("Discount cannot exceed the sale amount.");
        }
        // Net = gross - discount. Everything downstream (due, commission, supplier payable)
        // works off the net (discounted) amount.
        BigDecimal netAmount = money(grossAmount.subtract(discountAmount));
        boolean oneTimeCustomer = request.wholesalerCustomerId() == null;
        boolean crateSale = inventory.getUnit() == UnitType.CRATE && !oneTimeCustomer;
        Integer banglaCratesGiven = resolveSpecificCrates(request.banglaCratesGiven());
        Integer chinaCratesGiven = resolveSpecificCrates(request.chinaCratesGiven());
        Integer cratesGiven = resolveCratesGiven(quantity, crateSale, request.crateType(), request.cratesGiven(), banglaCratesGiven, chinaCratesGiven);
        BigDecimal jamanotAmount = crateSale
                ? nonNegative(request.jamanotAmount(), "Jamanot amount cannot be negative.")
                : BigDecimal.ZERO;
        if (!crateSale) {
            banglaCratesGiven = 0;
            chinaCratesGiven = 0;
        } else if (banglaCratesGiven == 0 && chinaCratesGiven == 0) {
            if ("CHINA".equals(normalizeCrateType(request.crateType()))) {
                chinaCratesGiven = cratesGiven;
            } else {
                banglaCratesGiven = cratesGiven;
            }
        }
        if (inventory.getQuantityOnHand().compareTo(quantity) < 0) {
            throw new BadRequestException("Insufficient stock for selected product.");
        }

        WholesalerCustomer customerAccount = oneTimeCustomer ? null : resolveCustomerAccount(wholesaler, request);
        String customerNameSnapshot = oneTimeCustomer ? requireText(request.customerName(), "Customer name is required.") : customerAccount.getCustomer().getName();
        String customerPhoneSnapshot = oneTimeCustomer ? requireText(request.customerPhone(), "Customer phone is required.") : customerAccount.getCustomer().getPhone();
        if (oneTimeCustomer && paidAmount.compareTo(netAmount) != 0) {
            throw new BadRequestException("One-time customer must pay the full sale amount.");
        }
        if (paidAmount.compareTo(netAmount) > 0) {
            throw new BadRequestException("Paid amount cannot exceed sale amount. To settle prior due, use the customer settle endpoint after this sale.");
        }
        BigDecimal dueAmount = money(netAmount.subtract(paidAmount));

        Sale sale = new Sale();
        sale.setWholesaler(wholesaler);
        sale.setWholesalerCustomer(customerAccount);
        sale.setCustomerNameSnapshot(customerNameSnapshot);
        sale.setCustomerPhoneSnapshot(customerPhoneSnapshot);
        sale.setCustomerType(oneTimeCustomer ? "ONE_TIME" : "PERMANENT");
        sale.setSaleDate(LocalDateTime.now());
        sale.setSaleType(dueAmount.signum() == 0 ? SaleType.PAY_INSTANT : SaleType.PAY_LATER);
        sale.setGrossAmount(grossAmount);
        sale.setDiscountAmount(discountAmount);
        sale.setNetAmount(netAmount);
        sale.setPaidAmount(paidAmount);
        sale.setDueAmount(dueAmount);
        sale.setBoxesGiven(cratesGiven);
        sale.setJamanotAmount(jamanotAmount);
        sale.setNote(clean(request.note()));
        sale.setStatus(PostStatus.POSTED);
        sale = saleRepository.save(sale);

        WholesalerSupplier supplierAccount = inventory.getWholesalerSupplier();
        // Commission is negotiated per shipment, usually after the sell. If the shipment's
        // rate is already set, snapshot it; otherwise it stays 0 here and is computed at the
        // shipment level once the rate is agreed.
        org.example.model.SupplierDelivery delivery = inventory.getDelivery();
        BigDecimal commissionRate = delivery != null && delivery.getCommissionRate() != null
                ? delivery.getCommissionRate()
                : BigDecimal.ZERO;
        BigDecimal commissionAmount = money(netAmount.multiply(commissionRate).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP));

        SaleItem item = new SaleItem();
        item.setWholesaler(wholesaler);
        item.setSale(sale);
        item.setWholesalerSupplier(supplierAccount);
        item.setDelivery(delivery);
        item.setProduct(inventory.getProduct());
        item.setCategory(inventory.getCategory());
        item.setSubCategory(inventory.getSubCategory());
        item.setQuantity(quantity);
        item.setUnit(inventory.getUnit());
        item.setUnitPrice(unitPrice);
        item.setLineTotal(netAmount);
        item.setCommissionRate(commissionRate);
        item.setCommissionAmount(commissionAmount);
        saleItemRepository.save(item);

        inventory.setQuantityOnHand(inventory.getQuantityOnHand().subtract(quantity));
        inventory.setStatus(inventory.getQuantityOnHand().signum() == 0 ? InventoryStatus.STOCK_OUT : InventoryStatus.ACTIVE);
        inventory = inventoryRepository.save(inventory);

        saveStockLedger(wholesaler, supplierAccount, inventory, sale, quantity);
        BigDecimal customerBalance = oneTimeCustomer ? BigDecimal.ZERO : applyCustomerSaleBalance(wholesaler, customerAccount, sale, netAmount, paidAmount);
        BigDecimal customerJamanotBalance = oneTimeCustomer ? BigDecimal.ZERO : applyCustomerCrateMovement(wholesaler, customerAccount, sale, banglaCratesGiven, chinaCratesGiven, jamanotAmount);
        BigDecimal supplierBalance = applySupplierSaleBalance(wholesaler, supplierAccount, sale, netAmount);
        Transaction transaction = saveTransaction(wholesaler, customerAccount, supplierAccount, sale, netAmount, paidAmount, customerBalance);

        Category category = inventory.getCategory();
        return new SaleResponse(
                sale.getId(),
                transaction.getId(),
                customerAccount == null ? null : customerAccount.getId(),
                customerNameSnapshot,
                customerPhoneSnapshot,
                oneTimeCustomer ? "ONE_TIME" : "PERMANENT",
                inventory.getId(),
                inventory.getProduct().getId(),
                inventory.getProduct().getName(),
                category == null ? null : category.getId(),
                category == null ? null : category.getName(),
                inventory.getSubCategory() == null ? null : inventory.getSubCategory().getId(),
                inventory.getSubCategory() == null ? null : inventory.getSubCategory().getName(),
                supplierAccount.getId(),
                supplierAccount.getSupplier().getName(),
                quantity,
                inventory.getUnit().name(),
                unitPrice,
                grossAmount,
                discountAmount,
                netAmount,
                paidAmount,
                dueAmount,
                customerBalance,
                commissionAmount,
                supplierBalance,
                cratesGiven,
                banglaCratesGiven,
                chinaCratesGiven,
                jamanotAmount,
                customerJamanotBalance,
                inventory.getQuantityOnHand(),
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

        balance.setBalance(money(balance.getBalance().add(netAmount).subtract(paidAmount)));
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

    private BigDecimal applyCustomerCrateMovement(
            Wholesaler wholesaler,
            WholesalerCustomer customerAccount,
            Sale sale,
            Integer banglaCratesGiven,
            Integer chinaCratesGiven,
            BigDecimal jamanotAmount
    ) {
        int banglaCrates = banglaCratesGiven == null ? 0 : banglaCratesGiven;
        int chinaCrates = chinaCratesGiven == null ? 0 : chinaCratesGiven;
        if (banglaCrates <= 0 && chinaCrates <= 0) {
            return customerAccount.getJamanotBalance() == null ? BigDecimal.ZERO : customerAccount.getJamanotBalance();
        }

        applyCustomerCrateTypeMovement(wholesaler, customerAccount, sale, "BANGLA", banglaCrates);
        applyCustomerCrateTypeMovement(wholesaler, customerAccount, sale, "CHINA", chinaCrates);

        customerAccount.setJamanotBalance(money((customerAccount.getJamanotBalance() == null ? BigDecimal.ZERO : customerAccount.getJamanotBalance()).add(jamanotAmount)));
        wholesalerCustomerRepository.save(customerAccount);
        return customerAccount.getJamanotBalance();
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

    private Integer resolveCratesGiven(BigDecimal quantity, boolean crateSale, String crateType, Integer requestedCrates, Integer banglaCratesGiven, Integer chinaCratesGiven) {
        int banglaCrates = banglaCratesGiven == null ? 0 : banglaCratesGiven;
        int chinaCrates = chinaCratesGiven == null ? 0 : chinaCratesGiven;
        int splitCrates = banglaCrates + chinaCrates;
        if (!crateSale) {
            if ((requestedCrates != null && requestedCrates > 0) || splitCrates > 0) {
                throw new BadRequestException("Crates can only be assigned to permanent customer crate sales.");
            }
            return 0;
        }
        try {
            int saleCrates = quantity.intValueExact();
            if (splitCrates > 0) {
                if (splitCrates != saleCrates) {
                    throw new BadRequestException("Bangla and China crate quantities must match sold crate quantity.");
                }
                return splitCrates;
            }
            if (requestedCrates != null && requestedCrates > 0 && requestedCrates != saleCrates) {
                throw new BadRequestException("Crates given must match sold crate quantity.");
            }
            normalizeCrateType(crateType);
            return saleCrates;
        } catch (ArithmeticException exception) {
            throw new BadRequestException("Crate sale quantity must be a whole number.");
        }
    }

    private String normalizeCrateType(String value) {
        String cleaned = requireText(value, "Crate type is required for permanent customer crate sale.").toUpperCase();
        if (!cleaned.equals("BANGLA") && !cleaned.equals("CHINA")) {
            throw new BadRequestException("Invalid crate type. Allowed values: BANGLA, CHINA.");
        }
        return cleaned;
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

        balance.setBalance(money(balance.getBalance().add(saleAmount)));
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
        return money(normalized);
    }

    private BigDecimal money(BigDecimal value) {
        return value.setScale(2, RoundingMode.HALF_UP);
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
}
