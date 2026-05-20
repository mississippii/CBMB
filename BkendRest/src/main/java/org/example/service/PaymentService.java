package org.example.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
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
    private final PaymentRepository paymentRepository;
    private final SupplierSettlementRepository supplierSettlementRepository;
    private final TransactionRepository transactionRepository;
    private final BoxTypeRepository boxTypeRepository;
    private final BoxInventoryRepository boxInventoryRepository;
    private final BoxBalanceRepository boxBalanceRepository;
    private final BoxLedgerRepository boxLedgerRepository;

    public PaymentService(
            WholesalerRepository wholesalerRepository,
            WholesalerCustomerRepository wholesalerCustomerRepository,
            WholesalerSupplierRepository wholesalerSupplierRepository,
            AccountBalanceRepository accountBalanceRepository,
            AccountLedgerRepository accountLedgerRepository,
            PaymentRepository paymentRepository,
            SupplierSettlementRepository supplierSettlementRepository,
            TransactionRepository transactionRepository,
            BoxTypeRepository boxTypeRepository,
            BoxInventoryRepository boxInventoryRepository,
            BoxBalanceRepository boxBalanceRepository,
            BoxLedgerRepository boxLedgerRepository
    ) {
        this.wholesalerRepository = wholesalerRepository;
        this.wholesalerCustomerRepository = wholesalerCustomerRepository;
        this.wholesalerSupplierRepository = wholesalerSupplierRepository;
        this.accountBalanceRepository = accountBalanceRepository;
        this.accountLedgerRepository = accountLedgerRepository;
        this.paymentRepository = paymentRepository;
        this.supplierSettlementRepository = supplierSettlementRepository;
        this.transactionRepository = transactionRepository;
        this.boxTypeRepository = boxTypeRepository;
        this.boxInventoryRepository = boxInventoryRepository;
        this.boxBalanceRepository = boxBalanceRepository;
        this.boxLedgerRepository = boxLedgerRepository;
    }

    @Transactional
    public PaymentOperationResponse settleCustomer(Long wholesalerId, CustomerSettlementRequest request) {
        Wholesaler wholesaler = findWholesaler(wholesalerId);
        WholesalerCustomer customerAccount = findCustomerAccount(wholesalerId, request.wholesalerCustomerId());
        BigDecimal cashAmount = nonNegative(request.cashAmount(), "Cash amount cannot be negative.");
        BigDecimal jamanotAmount = nonNegative(request.jamanotAmount(), "Jamanot amount cannot be negative.");
        int banglaReturned = nonNegativeInt(request.banglaCratesReturned(), "Bangla crate quantity cannot be negative.");
        int chinaReturned = nonNegativeInt(request.chinaCratesReturned(), "China crate quantity cannot be negative.");
        int boxesReturned = banglaReturned + chinaReturned;

        if (cashAmount.signum() == 0 && boxesReturned == 0) {
            throw new BadRequestException("Enter cash received or returned crates.");
        }
        if (boxesReturned == 0 && jamanotAmount.signum() > 0) {
            throw new BadRequestException("Jamanot can be settled only when customer returns crates.");
        }

        BigDecimal previousDue = currentBalance(wholesaler, PartyType.WHOLESALER_CUSTOMER, customerAccount.getId(), customerAccount.getOpeningDue());
        if (cashAmount.compareTo(previousDue) > 0) {
            throw new BadRequestException("Cash received cannot be greater than customer due.");
        }
        BigDecimal dueAfter = money(previousDue.subtract(cashAmount));
        BigDecimal previousJamanot = money(customerAccount.getJamanotBalance() == null ? BigDecimal.ZERO : customerAccount.getJamanotBalance());
        if (jamanotAmount.compareTo(previousJamanot) > 0) {
            throw new BadRequestException("Jamanot refund cannot be greater than customer jamanot balance.");
        }
        BigDecimal jamanotAfter = money(previousJamanot.subtract(jamanotAmount));

        AccountBalance balance = getOrCreateBalance(wholesaler, PartyType.WHOLESALER_CUSTOMER, customerAccount.getId(), customerAccount.getOpeningDue());
        balance.setBalance(dueAfter);
        accountBalanceRepository.save(balance);
        if (cashAmount.signum() > 0) {
            saveAccountLedger(wholesaler, PartyType.WHOLESALER_CUSTOMER, customerAccount.getId(), AccountReferenceType.PAYMENT, null, BigDecimal.ZERO, cashAmount, "Customer due payment");
        }

        Payment payment = new Payment();
        payment.setWholesalerId(wholesaler.getId());
        payment.setWholesalerCustomerId(customerAccount.getId());
        payment.setPaymentType(resolvePaymentType(cashAmount, boxesReturned));
        payment.setCashAmount(cashAmount);
        payment.setBoxesReturned(boxesReturned);
        payment.setJamanotAmount(jamanotAmount);
        payment.setPreviousDue(previousDue);
        payment.setDueAfterPayment(dueAfter);
        payment.setPreviousJamanot(previousJamanot);
        payment.setJamanotAfterPayment(jamanotAfter);
        payment.setPaymentMethod(resolvePaymentMethod(request.paymentMethod()));
        payment.setNote(clean(request.note()));
        payment = paymentRepository.save(payment);

        if (banglaReturned > 0) {
            applyCustomerCrateReturn(wholesaler, customerAccount, "BANGLA", banglaReturned, payment.getId(), request.note());
        }
        if (chinaReturned > 0) {
            applyCustomerCrateReturn(wholesaler, customerAccount, "CHINA", chinaReturned, payment.getId(), request.note());
        }
        if (jamanotAmount.signum() > 0) {
            customerAccount.setJamanotBalance(jamanotAfter);
            wholesalerCustomerRepository.save(customerAccount);
        }

        Transaction transaction = savePaymentTransaction(
                wholesaler.getId(), payment.getId(), customerAccount.getId(), null, cashAmount, dueAfter,
                "Customer payment #" + payment.getId()
        );
        return response(transaction, payment.getId(), null, customerAccount.getId(), null, previousDue, dueAfter, cashAmount, banglaReturned, chinaReturned, previousJamanot, jamanotAfter, payment.getPaymentType().name());
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
        return settleSupplierMoney(wholesalerId, request, SettlementType.EXPENSE_RECEIVE, false, "Supplier expense money received");
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
            saveAccountLedger(wholesaler, PartyType.WHOLESALER_SUPPLIER, supplierAccount.getId(), AccountReferenceType.SUPPLIER_SETTLEMENT, null, amount, BigDecimal.ZERO, label);
        }

        SupplierSettlement settlement = new SupplierSettlement();
        settlement.setWholesaler(wholesaler);
        settlement.setWholesalerSupplier(supplierAccount);
        settlement.setSettlementDate(LocalDateTime.now());
        settlement.setSettlementType(type);
        settlement.setAmount(amount);
        settlement.setPreviousDue(previousDue);
        settlement.setDueAfterSettlement(dueAfter);
        settlement.setPaymentMethod(resolvePaymentMethod(request.paymentMethod()));
        settlement.setNote(clean(request.note()));
        settlement = supplierSettlementRepository.save(settlement);

        Transaction transaction = savePaymentTransaction(
                wholesaler.getId(), null, null, supplierAccount.getId(), amount, dueAfter,
                label + " #" + settlement.getId()
        );
        return response(transaction, null, settlement.getId(), null, supplierAccount.getId(), previousDue, dueAfter, amount, 0, 0, BigDecimal.ZERO, BigDecimal.ZERO, type.name());
    }

    private PaymentOperationResponse moveSupplierCrates(Long wholesalerId, SupplierCrateRequest request, boolean giveToSupplier) {
        Wholesaler wholesaler = findWholesaler(wholesalerId);
        WholesalerSupplier supplierAccount = findSupplierAccount(wholesalerId, request.wholesalerSupplierId());
        int bangla = nonNegativeInt(request.banglaCrates(), "Bangla crate quantity cannot be negative.");
        int china = nonNegativeInt(request.chinaCrates(), "China crate quantity cannot be negative.");
        if (bangla + china == 0) {
            throw new BadRequestException("Enter crate quantity.");
        }

        if (bangla > 0) {
            applySupplierCrateMovement(wholesaler, supplierAccount, "BANGLA", bangla, giveToSupplier, request.note());
        }
        if (china > 0) {
            applySupplierCrateMovement(wholesaler, supplierAccount, "CHINA", china, giveToSupplier, request.note());
        }

        BigDecimal currentDue = currentBalance(wholesaler, PartyType.WHOLESALER_SUPPLIER, supplierAccount.getId(), supplierAccount.getOpeningDue());
        String operationType = giveToSupplier ? "SUPPLIER_CRATE_GIVE" : "SUPPLIER_CRATE_RETURN";
        Transaction transaction = savePaymentTransaction(
                wholesaler.getId(), null, null, supplierAccount.getId(), BigDecimal.ZERO, currentDue,
                operationType + " for supplier #" + supplierAccount.getId()
        );
        return response(transaction, null, null, null, supplierAccount.getId(), currentDue, currentDue, BigDecimal.ZERO, bangla, china, BigDecimal.ZERO, BigDecimal.ZERO, operationType);
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
        balance.setBoxesDue(balance.getBoxesDue() - quantity);
        inventory.setInHand(inventory.getInHand() + quantity);
        inventory.setWithCustomers(Math.max(inventory.getWithCustomers() - quantity, 0));
        boxBalanceRepository.save(balance);
        boxInventoryRepository.save(inventory);
        saveBoxLedger(wholesaler, boxType, BoxLedgerPartyType.WHOLESALER_CUSTOMER, customerAccount.getId(), BoxMovementType.RETURNED_FROM_CUSTOMER, quantity, paymentId, note);
    }

    private void applySupplierCrateMovement(Wholesaler wholesaler, WholesalerSupplier supplierAccount, String crateTypeValue, int quantity, boolean giveToSupplier, String note) {
        BoxType boxType = findBoxType(wholesaler.getId(), crateTypeValue);
        BoxInventory inventory = findBoxInventory(wholesaler, boxType);
        BoxBalance balance = boxBalanceRepository
                .findByWholesaler_IdAndPartyTypeAndPartyAccountIdAndBoxType_Id(wholesaler.getId(), PartyType.WHOLESALER_SUPPLIER, supplierAccount.getId(), boxType.getId())
                .orElseGet(() -> {
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
            inventory.setInHand(inventory.getInHand() + quantity);
            inventory.setWithSuppliers(Math.max(inventory.getWithSuppliers() - quantity, 0));
            balance.setBoxesDue(balance.getBoxesDue() - quantity);
            saveBoxLedger(wholesaler, boxType, BoxLedgerPartyType.WHOLESALER_SUPPLIER, supplierAccount.getId(), BoxMovementType.RETURNED_FROM_SUPPLIER, quantity, null, note);
        }
        boxInventoryRepository.save(inventory);
        boxBalanceRepository.save(balance);
    }

    private Transaction savePaymentTransaction(Long wholesalerId, Long paymentId, Long customerAccountId, Long supplierAccountId, BigDecimal amount, BigDecimal dueAfter, String description) {
        Transaction transaction = new Transaction();
        transaction.setWholesalerId(wholesalerId);
        transaction.setTransactionType(TransactionType.PAYMENT);
        transaction.setPaymentId(paymentId);
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

    private PaymentOperationResponse response(Transaction transaction, Long paymentId, Long settlementId, Long customerAccountId, Long supplierAccountId, BigDecimal previousDue, BigDecimal dueAfter, BigDecimal cashAmount, int banglaCrates, int chinaCrates, BigDecimal previousJamanot, BigDecimal jamanotAfter, String operationType) {
        return new PaymentOperationResponse(
                transaction.getId(),
                paymentId,
                settlementId,
                customerAccountId,
                supplierAccountId,
                money(previousDue),
                money(dueAfter),
                money(cashAmount),
                banglaCrates,
                chinaCrates,
                money(previousJamanot),
                money(jamanotAfter),
                operationType,
                transaction.getCreatedAt()
        );
    }

    private PaymentType resolvePaymentType(BigDecimal cashAmount, int boxesReturned) {
        if (cashAmount.signum() > 0 && boxesReturned > 0) {
            return PaymentType.CASH_AND_BOX_RETURN;
        }
        if (cashAmount.signum() > 0) {
            return PaymentType.CASH_RECEIVE;
        }
        return PaymentType.BOX_RETURN;
    }

    private PaymentMethod resolvePaymentMethod(PaymentMethod method) {
        return method == null || method == PaymentMethod.NONE ? PaymentMethod.CASH : method;
    }

    private BigDecimal currentBalance(Wholesaler wholesaler, PartyType partyType, Long partyAccountId, BigDecimal openingDue) {
        return accountBalanceRepository
                .findByWholesaler_IdAndPartyTypeAndPartyAccountId(wholesaler.getId(), partyType, partyAccountId)
                .map(AccountBalance::getBalance)
                .orElse(money(openingDue == null ? BigDecimal.ZERO : openingDue));
    }

    private AccountBalance getOrCreateBalance(Wholesaler wholesaler, PartyType partyType, Long partyAccountId, BigDecimal openingDue) {
        return accountBalanceRepository
                .findByWholesaler_IdAndPartyTypeAndPartyAccountId(wholesaler.getId(), partyType, partyAccountId)
                .orElseGet(() -> {
                    AccountBalance balance = new AccountBalance();
                    balance.setWholesaler(wholesaler);
                    balance.setPartyType(partyType);
                    balance.setPartyAccountId(partyAccountId);
                    balance.setBalance(money(openingDue == null ? BigDecimal.ZERO : openingDue));
                    return balance;
                });
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

    private String clean(String value) {
        return value == null ? null : value.trim();
    }
}
