package org.example.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.example.dto.CrateLineRequest;
import org.example.dto.CrateTypeQuantity;
import org.example.dto.CustomerSettlementRequest;
import org.example.dto.PaymentOperationResponse;
import org.example.dto.SupplierCrateRequest;
import org.example.dto.SupplierSettlementRequest;
import org.example.exception.BadRequestException;
import org.example.model.AccountBalance;
import org.example.model.AccountLedger;
import org.example.model.BoxBalance;
import org.example.model.BoxInventory;
import org.example.model.BoxLedger;
import org.example.model.BoxType;
import org.example.model.Payment;
import org.example.model.SupplierSettlement;
import org.example.model.Transaction;
import org.example.model.Wholesaler;
import org.example.model.WholesalerCustomer;
import org.example.model.WholesalerSupplier;
import org.example.model.enums.AccountReferenceType;
import org.example.model.enums.BoxLedgerPartyType;
import org.example.model.enums.BoxMovementType;
import org.example.model.enums.BoxReferenceType;
import org.example.model.enums.PartyType;
import org.example.model.enums.PaymentMethod;
import org.example.model.enums.PaymentType;
import org.example.model.enums.RecordStatus;
import org.example.model.enums.SettlementType;
import org.example.model.enums.TransactionType;
import org.example.repository.AccountBalanceRepository;
import org.example.repository.AccountLedgerRepository;
import org.example.repository.BoxBalanceRepository;
import org.example.repository.BoxInventoryRepository;
import org.example.repository.BoxLedgerRepository;
import org.example.repository.BoxTypeRepository;
import org.example.repository.PaymentRepository;
import org.example.repository.SupplierSettlementRepository;
import org.example.repository.TransactionRepository;
import org.example.repository.WholesalerCustomerRepository;
import org.example.repository.WholesalerRepository;
import org.example.repository.WholesalerSupplierRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PaymentService {

    private final WholesalerRepository wholesalerRepository;
    private final WholesalerCustomerRepository wholesalerCustomerRepository;
    private final WholesalerSupplierRepository wholesalerSupplierRepository;
    private final AccountBalanceRepository accountBalanceRepository;
    private final AccountLedgerRepository accountLedgerRepository;
    private final AccountBalanceService accountBalanceService;
    private final PaymentRepository paymentRepository;
    private final SupplierSettlementRepository supplierSettlementRepository;
    private final TransactionRepository transactionRepository;
    private final BoxTypeRepository boxTypeRepository;
    private final BoxInventoryRepository boxInventoryRepository;
    private final BoxBalanceRepository boxBalanceRepository;
    private final BoxLedgerRepository boxLedgerRepository;
    private final ExpensePaydownService expensePaydownService;

    public PaymentService(
            WholesalerRepository wholesalerRepository,
            WholesalerCustomerRepository wholesalerCustomerRepository,
            WholesalerSupplierRepository wholesalerSupplierRepository,
            AccountBalanceRepository accountBalanceRepository,
            AccountLedgerRepository accountLedgerRepository,
            AccountBalanceService accountBalanceService,
            PaymentRepository paymentRepository,
            SupplierSettlementRepository supplierSettlementRepository,
            TransactionRepository transactionRepository,
            BoxTypeRepository boxTypeRepository,
            BoxInventoryRepository boxInventoryRepository,
            BoxBalanceRepository boxBalanceRepository,
            BoxLedgerRepository boxLedgerRepository,
            ExpensePaydownService expensePaydownService
    ) {
        this.wholesalerRepository = wholesalerRepository;
        this.wholesalerCustomerRepository = wholesalerCustomerRepository;
        this.wholesalerSupplierRepository = wholesalerSupplierRepository;
        this.accountBalanceRepository = accountBalanceRepository;
        this.accountLedgerRepository = accountLedgerRepository;
        this.accountBalanceService = accountBalanceService;
        this.paymentRepository = paymentRepository;
        this.supplierSettlementRepository = supplierSettlementRepository;
        this.transactionRepository = transactionRepository;
        this.boxTypeRepository = boxTypeRepository;
        this.boxInventoryRepository = boxInventoryRepository;
        this.boxBalanceRepository = boxBalanceRepository;
        this.boxLedgerRepository = boxLedgerRepository;
        this.expensePaydownService = expensePaydownService;
    }

    @Transactional
    public PaymentOperationResponse settleCustomer(Long wholesalerId, CustomerSettlementRequest request) {
        Wholesaler wholesaler = findWholesaler(wholesalerId);
        WholesalerCustomer customerAccount = findCustomerAccount(wholesalerId, request.wholesalerCustomerId());
        BigDecimal cashAmount = nonNegative(request.cashAmount(), "Cash amount cannot be negative.");
        Map<String, Integer> returns = normalizeLines(request.crateReturns(), "Returned crate quantity cannot be negative.");
        int boxesReturned = returns.values().stream().mapToInt(Integer::intValue).sum();

        if (cashAmount.signum() == 0 && boxesReturned == 0) {
            throw new BadRequestException("Enter cash received or returned crates.");
        }

        BigDecimal previousDue = currentBalance(wholesaler, PartyType.WHOLESALER_CUSTOMER, customerAccount.getId(), customerAccount.getOpeningDue());
        if (cashAmount.compareTo(previousDue) > 0) {
            throw new BadRequestException("Cash received cannot be greater than customer due.");
        }
        BigDecimal dueAfter = money(previousDue.subtract(cashAmount));

        AccountBalance balance = getOrCreateBalance(wholesaler, PartyType.WHOLESALER_CUSTOMER, customerAccount.getId(), customerAccount.getOpeningDue());
        balance.setBalance(dueAfter);
        accountBalanceRepository.save(balance);

        Payment payment = new Payment();
        payment.setWholesalerId(wholesaler.getId());
        payment.setWholesalerCustomerId(customerAccount.getId());
        payment.setPaymentType(resolvePaymentType(cashAmount, boxesReturned));
        payment.setCashAmount(cashAmount);
        payment.setBoxesReturned(boxesReturned);
        payment.setPreviousDue(previousDue);
        payment.setDueAfterPayment(dueAfter);
        payment.setPaymentMethod(resolveCustomerPaymentMethod(request.paymentMethod(), cashAmount));
        payment.setNote(clean(request.note()));
        payment = paymentRepository.save(payment);

        if (cashAmount.signum() > 0) {
            saveAccountLedger(wholesaler, PartyType.WHOLESALER_CUSTOMER, customerAccount.getId(), AccountReferenceType.PAYMENT, payment.getId(), BigDecimal.ZERO, cashAmount, "Customer due payment");
        }

        List<CrateTypeQuantity> crateLines = new ArrayList<>();
        for (Map.Entry<String, Integer> line : returns.entrySet()) {
            applyCustomerCrateReturn(wholesaler, customerAccount, line.getKey(), line.getValue(), payment.getId(), request.note());
            crateLines.add(new CrateTypeQuantity(line.getKey(), line.getValue()));
        }
        String description = buildCustomerPaymentDescription(payment.getId(), cashAmount, crateLines);
        Transaction transaction = savePaymentTransaction(
                wholesaler.getId(), payment.getId(), null, customerAccount.getId(), null, cashAmount, dueAfter,
                description
        );
        return response(transaction, payment.getId(), null, customerAccount.getId(), null, previousDue, dueAfter, cashAmount, boxesReturned, crateLines, payment.getPaymentType().name());
    }

    @Transactional
    public PaymentOperationResponse paySupplierProduct(Long wholesalerId, SupplierSettlementRequest request) {
        return settleSupplierMoney(wholesalerId, request, SettlementType.PRODUCT_PAYMENT, true, "Supplier product payment");
    }

    @Transactional
    public PaymentOperationResponse receiveSupplierCommission(Long wholesalerId, SupplierSettlementRequest request) {
        return settleSupplierMoney(wholesalerId, request, SettlementType.COMMISSION_RECEIVE, false, "Supplier commission received");
    }

    @Transactional
    public PaymentOperationResponse receiveSupplierExpense(Long wholesalerId, SupplierSettlementRequest request) {
        if (request != null && request.wholesalerSupplierId() != null && request.amount() != null) {
            BigDecimal outstanding = expensePaydownService.outstandingForSupplier(wholesalerId, request.wholesalerSupplierId());
            if (request.amount().compareTo(outstanding) > 0) {
                throw new BadRequestException("Amount exceeds outstanding expense due of ৳" + outstanding.toPlainString() + ".");
            }
        }
        PaymentOperationResponse response = settleSupplierMoney(wholesalerId, request, SettlementType.EXPENSE_RECEIVE, false, "Supplier expense money received");
        expensePaydownService.payDownForSupplier(wholesalerId, request.wholesalerSupplierId(), request.amount());
        return response;
    }

    @Transactional
    public PaymentOperationResponse borrowCustomerCrates(Long wholesalerId, org.example.dto.CustomerCrateBorrowRequest request) {
        Wholesaler wholesaler = findWholesaler(wholesalerId);
        WholesalerCustomer customerAccount = findCustomerAccount(wholesalerId, request.wholesalerCustomerId());
        Map<String, Integer> lines = normalizeLines(request.crates(), "Crate quantity cannot be negative.");
        int total = lines.values().stream().mapToInt(Integer::intValue).sum();
        if (total == 0) {
            throw new BadRequestException("Enter at least one crate to borrow.");
        }

        List<CrateTypeQuantity> crateLines = new ArrayList<>();
        for (Map.Entry<String, Integer> line : lines.entrySet()) {
            applyCustomerCrateBorrow(wholesaler, customerAccount, line.getKey(), line.getValue(), request.note());
            crateLines.add(new CrateTypeQuantity(line.getKey(), line.getValue()));
        }

        BigDecimal currentDue = currentBalance(wholesaler, PartyType.WHOLESALER_CUSTOMER, customerAccount.getId(), customerAccount.getOpeningDue());
        String description = "Customer crate borrow — " + describeLines(crateLines);
        Transaction transaction = savePaymentTransaction(
                wholesaler.getId(), null, null, customerAccount.getId(), null, BigDecimal.ZERO, currentDue, description
        );
        return response(transaction, null, null, customerAccount.getId(), null, currentDue, currentDue, BigDecimal.ZERO, total, crateLines, "CUSTOMER_CRATE_BORROW");
    }

    @Transactional
    public PaymentOperationResponse giveSupplierCrates(Long wholesalerId, SupplierCrateRequest request) {
        return moveSupplierCrates(wholesalerId, request, true);
    }

    @Transactional
    public PaymentOperationResponse returnSupplierCrates(Long wholesalerId, SupplierCrateRequest request) {
        return moveSupplierCrates(wholesalerId, request, false);
    }

    private PaymentOperationResponse settleSupplierMoney(Long wholesalerId, SupplierSettlementRequest request, SettlementType type, boolean reduceDue, String label) {
        Wholesaler wholesaler = findWholesaler(wholesalerId);
        WholesalerSupplier supplierAccount = findSupplierAccount(wholesalerId, request.wholesalerSupplierId());
        BigDecimal amount = positive(request.amount(), "Amount must be greater than zero.");
        BigDecimal previousDue = currentBalance(wholesaler, PartyType.WHOLESALER_SUPPLIER, supplierAccount.getId(), supplierAccount.getOpeningDue());
        BigDecimal dueAfter = previousDue;

        if (reduceDue) {
            if (amount.compareTo(previousDue) > 0) {
                throw new BadRequestException("Supplier payment cannot be greater than supplier payable amount.");
            }
            dueAfter = money(previousDue.subtract(amount));
            AccountBalance balance = getOrCreateBalance(wholesaler, PartyType.WHOLESALER_SUPPLIER, supplierAccount.getId(), supplierAccount.getOpeningDue());
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
        settlement.setPaymentMethod(requireSupplierPaymentMethod(request.paymentMethod()));
        settlement.setNote(clean(request.note()));
        settlement = supplierSettlementRepository.save(settlement);

        if (reduceDue) {
            saveAccountLedger(wholesaler, PartyType.WHOLESALER_SUPPLIER, supplierAccount.getId(), AccountReferenceType.SUPPLIER_SETTLEMENT, settlement.getId(), amount, BigDecimal.ZERO, label);
        }

        Transaction transaction = savePaymentTransaction(
                wholesaler.getId(), null, settlement.getId(), null, supplierAccount.getId(), amount, dueAfter,
                label + " #" + settlement.getId()
        );
        return response(transaction, null, settlement.getId(), null, supplierAccount.getId(), previousDue, dueAfter, amount, 0, List.of(), type.name());
    }

    private PaymentOperationResponse moveSupplierCrates(Long wholesalerId, SupplierCrateRequest request, boolean giveToSupplier) {
        Wholesaler wholesaler = findWholesaler(wholesalerId);
        WholesalerSupplier supplierAccount = findSupplierAccount(wholesalerId, request.wholesalerSupplierId());
        Map<String, Integer> lines = normalizeLines(request.crates(), "Crate quantity cannot be negative.");
        int total = lines.values().stream().mapToInt(Integer::intValue).sum();
        if (total == 0) {
            throw new BadRequestException("Enter crate quantity.");
        }

        List<CrateTypeQuantity> crateLines = new ArrayList<>();
        for (Map.Entry<String, Integer> line : lines.entrySet()) {
            applySupplierCrateMovement(wholesaler, supplierAccount, line.getKey(), line.getValue(), giveToSupplier, request.note());
            crateLines.add(new CrateTypeQuantity(line.getKey(), line.getValue()));
        }

        BigDecimal currentDue = currentBalance(wholesaler, PartyType.WHOLESALER_SUPPLIER, supplierAccount.getId(), supplierAccount.getOpeningDue());
        String operationType = giveToSupplier ? "SUPPLIER_CRATE_GIVE" : "SUPPLIER_CRATE_RETURN";
        String verb = giveToSupplier ? "Crates given to supplier" : "Crates returned from supplier";
        String description = verb + " — " + describeLines(crateLines);
        Transaction transaction = savePaymentTransaction(
                wholesaler.getId(), null, null, null, supplierAccount.getId(), BigDecimal.ZERO, currentDue, description
        );
        return response(transaction, null, null, null, supplierAccount.getId(), currentDue, currentDue, BigDecimal.ZERO, total, crateLines, operationType);
    }

    /** Collapse request lines into a name→quantity map (uppercased, positive only, merged by type). */
    private Map<String, Integer> normalizeLines(List<CrateLineRequest> lines, String negativeMessage) {
        Map<String, Integer> result = new LinkedHashMap<>();
        if (lines == null) {
            return result;
        }
        for (CrateLineRequest line : lines) {
            if (line == null) {
                continue;
            }
            int qty = nonNegativeInt(line.quantity(), negativeMessage);
            if (qty == 0) {
                continue;
            }
            String type = requireText(line.crateType(), "Crate type is required.").toUpperCase(Locale.ROOT);
            result.merge(type, qty, Integer::sum);
        }
        return result;
    }

    private String describeLines(List<CrateTypeQuantity> lines) {
        if (lines.isEmpty()) {
            return "no crates";
        }
        StringBuilder sb = new StringBuilder();
        for (CrateTypeQuantity line : lines) {
            if (sb.length() > 0) sb.append(", ");
            sb.append(line.crateType()).append(":").append(line.quantity());
        }
        return sb.toString();
    }

    private void applyCustomerCrateBorrow(Wholesaler wholesaler, WholesalerCustomer customerAccount, String crateTypeValue, int quantity, String note) {
        BoxType boxType = findBoxType(wholesaler.getId(), crateTypeValue);
        BoxInventory inventory = findBoxInventory(wholesaler, boxType);
        if (inventory.getInHand() < quantity) {
            throw new BadRequestException("Not enough " + crateTypeValue + " crates in shop.");
        }
        BoxBalance balance = boxBalanceRepository
                .findByWholesaler_IdAndPartyTypeAndPartyAccountIdAndBoxType_Id(wholesaler.getId(), PartyType.WHOLESALER_CUSTOMER, customerAccount.getId(), boxType.getId())
                .orElseGet(() -> {
                    BoxBalance newBalance = new BoxBalance();
                    newBalance.setWholesaler(wholesaler);
                    newBalance.setBoxType(boxType);
                    newBalance.setPartyType(PartyType.WHOLESALER_CUSTOMER);
                    newBalance.setPartyAccountId(customerAccount.getId());
                    newBalance.setBoxesDue(0);
                    return newBalance;
                });
        inventory.setInHand(inventory.getInHand() - quantity);
        inventory.setWithCustomers(inventory.getWithCustomers() + quantity);
        balance.setBoxesDue(balance.getBoxesDue() + quantity);
        boxInventoryRepository.save(inventory);
        boxBalanceRepository.save(balance);
        saveBoxLedger(wholesaler, boxType, BoxLedgerPartyType.WHOLESALER_CUSTOMER, customerAccount.getId(), BoxMovementType.GIVEN_TO_CUSTOMER, quantity, null, note);
    }

    private void applyCustomerCrateReturn(Wholesaler wholesaler, WholesalerCustomer customerAccount, String crateTypeValue, int quantity, Long paymentId, String note) {
        BoxType boxType = findBoxType(wholesaler.getId(), crateTypeValue);
        BoxBalance balance = boxBalanceRepository
                .findByWholesaler_IdAndPartyTypeAndPartyAccountIdAndBoxType_Id(wholesaler.getId(), PartyType.WHOLESALER_CUSTOMER, customerAccount.getId(), boxType.getId())
                .orElseThrow(() -> new BadRequestException(crateTypeValue + " crate due was not found for this customer."));
        if (balance.getBoxesDue() < quantity) {
            throw new BadRequestException("Returned " + crateTypeValue + " crates cannot exceed customer crate due.");
        }
        BoxInventory inventory = findBoxInventory(wholesaler, boxType);
        if (inventory.getWithCustomers() < quantity) {
            throw new BadRequestException("Crate inventory inconsistency for " + crateTypeValue + ": with_customers (" + inventory.getWithCustomers() + ") < returned (" + quantity + "). Reconcile before processing.");
        }
        balance.setBoxesDue(balance.getBoxesDue() - quantity);
        inventory.setInHand(inventory.getInHand() + quantity);
        inventory.setWithCustomers(inventory.getWithCustomers() - quantity);
        boxBalanceRepository.save(balance);
        boxInventoryRepository.save(inventory);
        saveBoxLedger(wholesaler, boxType, BoxLedgerPartyType.WHOLESALER_CUSTOMER, customerAccount.getId(), BoxMovementType.RETURNED_FROM_CUSTOMER, quantity, paymentId, note);
    }

    private void applySupplierCrateMovement(Wholesaler wholesaler, WholesalerSupplier supplierAccount, String crateTypeValue, int quantity, boolean giveToSupplier, String note) {
        BoxType boxType = findBoxType(wholesaler.getId(), crateTypeValue);
        BoxInventory inventory = findBoxInventory(wholesaler, boxType);
        var existing = boxBalanceRepository
                .findByWholesaler_IdAndPartyTypeAndPartyAccountIdAndBoxType_Id(wholesaler.getId(), PartyType.WHOLESALER_SUPPLIER, supplierAccount.getId(), boxType.getId());

        if (!giveToSupplier && existing.isEmpty()) {
            throw new BadRequestException("This supplier has no " + crateTypeValue + " crate balance to return.");
        }

        BoxBalance balance = existing.orElseGet(() -> {
            BoxBalance newBalance = new BoxBalance();
            newBalance.setWholesaler(wholesaler);
            newBalance.setBoxType(boxType);
            newBalance.setPartyType(PartyType.WHOLESALER_SUPPLIER);
            newBalance.setPartyAccountId(supplierAccount.getId());
            newBalance.setBoxesDue(0);
            return newBalance;
        });

        if (giveToSupplier) {
            if (inventory.getInHand() < quantity) {
                throw new BadRequestException("Not enough " + crateTypeValue + " crates in hand.");
            }
            inventory.setInHand(inventory.getInHand() - quantity);
            inventory.setWithSuppliers(inventory.getWithSuppliers() + quantity);
            balance.setBoxesDue(balance.getBoxesDue() + quantity);
            saveBoxLedger(wholesaler, boxType, BoxLedgerPartyType.WHOLESALER_SUPPLIER, supplierAccount.getId(), BoxMovementType.GIVEN_TO_SUPPLIER, quantity, null, note);
        } else {
            if (balance.getBoxesDue() < quantity) {
                throw new BadRequestException("Returned " + crateTypeValue + " crates cannot exceed supplier crate due.");
            }
            if (inventory.getWithSuppliers() < quantity) {
                throw new BadRequestException("Crate inventory inconsistency for " + crateTypeValue + ": with_suppliers (" + inventory.getWithSuppliers() + ") < returned (" + quantity + "). Reconcile before processing.");
            }
            inventory.setInHand(inventory.getInHand() + quantity);
            inventory.setWithSuppliers(inventory.getWithSuppliers() - quantity);
            balance.setBoxesDue(balance.getBoxesDue() - quantity);
            saveBoxLedger(wholesaler, boxType, BoxLedgerPartyType.WHOLESALER_SUPPLIER, supplierAccount.getId(), BoxMovementType.RETURNED_FROM_SUPPLIER, quantity, null, note);
        }
        boxInventoryRepository.save(inventory);
        boxBalanceRepository.save(balance);
    }

    private Transaction savePaymentTransaction(Long wholesalerId, Long paymentId, Long settlementId, Long customerAccountId, Long supplierAccountId, BigDecimal amount, BigDecimal dueAfter, String description) {
        Transaction transaction = new Transaction();
        transaction.setWholesalerId(wholesalerId);
        transaction.setTransactionType(TransactionType.PAYMENT);
        transaction.setPaymentId(paymentId);
        transaction.setSettlementId(settlementId);
        transaction.setWholesalerCustomerId(customerAccountId);
        transaction.setWholesalerSupplierId(supplierAccountId);
        transaction.setSaleAmount(BigDecimal.ZERO);
        transaction.setPaymentAmount(amount);
        transaction.setDueAmount(dueAfter);
        transaction.setDescription(description);
        return transactionRepository.save(transaction);
    }

    private void saveAccountLedger(Wholesaler wholesaler, PartyType partyType, Long partyAccountId, AccountReferenceType referenceType, Long referenceId, BigDecimal debit, BigDecimal credit, String note) {
        AccountLedger ledger = new AccountLedger();
        ledger.setWholesaler(wholesaler);
        ledger.setPartyType(partyType);
        ledger.setPartyAccountId(partyAccountId);
        ledger.setReferenceType(referenceType);
        ledger.setReferenceId(referenceId);
        ledger.setDebit(money(debit));
        ledger.setCredit(money(credit));
        ledger.setNote(note);
        accountLedgerRepository.save(ledger);
    }

    private void saveBoxLedger(Wholesaler wholesaler, BoxType boxType, BoxLedgerPartyType partyType, Long partyAccountId, BoxMovementType movementType, int quantity, Long referenceId, String note) {
        BoxLedger ledger = new BoxLedger();
        ledger.setWholesaler(wholesaler);
        ledger.setBoxType(boxType);
        ledger.setPartyType(partyType);
        ledger.setPartyAccountId(partyAccountId);
        ledger.setMovementType(movementType);
        ledger.setQuantity(quantity);
        ledger.setReferenceType(BoxReferenceType.PAYMENT);
        ledger.setReferenceId(referenceId);
        ledger.setNote(clean(note));
        boxLedgerRepository.save(ledger);
    }

    private PaymentOperationResponse response(Transaction transaction, Long paymentId, Long settlementId, Long customerAccountId, Long supplierAccountId, BigDecimal previousDue, BigDecimal dueAfter, BigDecimal cashAmount, int cratesMoved, List<CrateTypeQuantity> crateLines, String operationType) {
        return new PaymentOperationResponse(
                transaction.getId(),
                paymentId,
                settlementId,
                customerAccountId,
                supplierAccountId,
                money(previousDue),
                money(dueAfter),
                money(cashAmount),
                cratesMoved,
                crateLines,
                operationType,
                transaction.getCreatedAt()
        );
    }

    private PaymentType resolvePaymentType(BigDecimal cashAmount, int boxesReturned) {
        if (cashAmount.signum() > 0 && boxesReturned > 0) {
            return PaymentType.CASH_AND_CRATE_RETURN;
        }
        if (cashAmount.signum() > 0) {
            return PaymentType.CASH_RECEIVE;
        }
        return PaymentType.CRATE_RETURN;
    }

    private PaymentMethod resolveCustomerPaymentMethod(PaymentMethod method, BigDecimal cashAmount) {
        if (cashAmount.signum() == 0) {
            return PaymentMethod.NONE;
        }
        return method == null || method == PaymentMethod.NONE ? PaymentMethod.CASH : method;
    }

    private PaymentMethod requireSupplierPaymentMethod(PaymentMethod method) {
        if (method == null) {
            return PaymentMethod.CASH;
        }
        if (method == PaymentMethod.NONE) {
            throw new BadRequestException("Payment method NONE is not valid for supplier settlements.");
        }
        return method;
    }

    private String buildCustomerPaymentDescription(Long paymentId, BigDecimal cashAmount, List<CrateTypeQuantity> crateLines) {
        StringBuilder sb = new StringBuilder("Customer payment #").append(paymentId);
        if (cashAmount.signum() > 0) {
            sb.append(", cash ").append(money(cashAmount).toPlainString());
        }
        long crates = crateLines.stream().mapToLong(CrateTypeQuantity::quantity).sum();
        if (crates > 0) {
            sb.append(", ").append(crates).append(" crates returned (").append(describeLines(crateLines)).append(")");
        }
        return sb.toString();
    }

    private BigDecimal currentBalance(Wholesaler wholesaler, PartyType partyType, Long partyAccountId, BigDecimal openingDue) {
        return accountBalanceRepository
                .findByWholesaler_IdAndPartyTypeAndPartyAccountId(wholesaler.getId(), partyType, partyAccountId)
                .map(AccountBalance::getBalance)
                .orElse(money(openingDue == null ? BigDecimal.ZERO : openingDue));
    }

    private AccountBalance getOrCreateBalance(Wholesaler wholesaler, PartyType partyType, Long partyAccountId, BigDecimal openingDue) {
        return accountBalanceService.getOrCreate(wholesaler, partyType, partyAccountId, openingDue);
    }

    private Wholesaler findWholesaler(Long wholesalerId) {
        if (wholesalerId == null) {
            throw new BadRequestException("Wholesaler id is required.");
        }
        return wholesalerRepository.findById(wholesalerId)
                .orElseThrow(() -> new BadRequestException("Wholesaler not found."));
    }

    private WholesalerCustomer findCustomerAccount(Long wholesalerId, Long wholesalerCustomerId) {
        if (wholesalerCustomerId == null) {
            throw new BadRequestException("Customer account is required.");
        }
        WholesalerCustomer account = wholesalerCustomerRepository.findById(wholesalerCustomerId)
                .orElseThrow(() -> new BadRequestException("Customer account not found."));
        if (!account.getWholesaler().getId().equals(wholesalerId)) {
            throw new BadRequestException("Customer account does not belong to this wholesaler.");
        }
        return account;
    }

    private WholesalerSupplier findSupplierAccount(Long wholesalerId, Long wholesalerSupplierId) {
        if (wholesalerSupplierId == null) {
            throw new BadRequestException("Supplier account is required.");
        }
        WholesalerSupplier account = wholesalerSupplierRepository.findById(wholesalerSupplierId)
                .orElseThrow(() -> new BadRequestException("Supplier account not found."));
        if (!account.getWholesaler().getId().equals(wholesalerId)) {
            throw new BadRequestException("Supplier account does not belong to this wholesaler.");
        }
        return account;
    }

    private BoxType findBoxType(Long wholesalerId, String crateTypeValue) {
        return boxTypeRepository
                .findByWholesaler_IdAndNameIgnoreCaseAndStatus(wholesalerId, crateTypeValue, RecordStatus.ACTIVE)
                .orElseThrow(() -> new BadRequestException(crateTypeValue + " crate type is not configured for this wholesaler."));
    }

    private BoxInventory findBoxInventory(Wholesaler wholesaler, BoxType boxType) {
        return boxInventoryRepository
                .findByWholesaler_IdAndBoxType_Id(wholesaler.getId(), boxType.getId())
                .orElseThrow(() -> new BadRequestException(boxType.getName() + " crate inventory is not available."));
    }

    private BigDecimal positive(BigDecimal value, String message) {
        BigDecimal normalized = nonNegative(value, message);
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

    private int nonNegativeInt(Integer value, String message) {
        int normalized = value == null ? 0 : value;
        if (normalized < 0) {
            throw new BadRequestException(message);
        }
        return normalized;
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
