package org.example.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import org.example.dto.PaymentCancellationResponse;
import org.example.exception.BadRequestException;
import org.example.model.AccountBalance;
import org.example.model.AccountLedger;
import org.example.model.BoxBalance;
import org.example.model.BoxInventory;
import org.example.model.BoxLedger;
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
import org.example.model.enums.PostStatus;
import org.example.model.enums.SettlementType;
import org.example.model.enums.TransactionType;
import org.example.repository.AccountBalanceRepository;
import org.example.repository.AccountLedgerRepository;
import org.example.repository.BoxBalanceRepository;
import org.example.repository.BoxInventoryRepository;
import org.example.repository.BoxLedgerRepository;
import org.example.repository.CrateDepositMovementRepository;
import org.example.repository.PaymentRepository;
import org.example.repository.SupplierSettlementRepository;
import org.example.repository.TransactionRepository;
import org.example.repository.WholesalerCustomerRepository;
import org.example.repository.WholesalerRepository;
import org.example.repository.WholesalerSupplierRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Cancels a POSTED customer Payment or supplier SupplierSettlement by writing reversing
 * entries — the original rows stay (status flips to CANCELLED).
 *
 * Cancellable supplier settlement type: PRODUCT_PAYMENT (restores the supplier payable).
 * Manual ADJUSTMENT settlements are not cancellable — post an opposite ADJUSTMENT instead.
 */
@Service
public class PaymentCancellationService {

    private final WholesalerRepository wholesalerRepository;
    private final PaymentRepository paymentRepository;
    private final SupplierSettlementRepository supplierSettlementRepository;
    private final WholesalerCustomerRepository wholesalerCustomerRepository;
    private final WholesalerSupplierRepository wholesalerSupplierRepository;
    private final AccountBalanceRepository accountBalanceRepository;
    private final AccountLedgerRepository accountLedgerRepository;
    private final BoxBalanceRepository boxBalanceRepository;
    private final BoxInventoryRepository boxInventoryRepository;
    private final BoxLedgerRepository boxLedgerRepository;
    private final CrateDepositMovementRepository crateDepositMovementRepository;
    private final TransactionRepository transactionRepository;
    private final AccountBalanceService accountBalanceService;

    public PaymentCancellationService(
            WholesalerRepository wholesalerRepository,
            PaymentRepository paymentRepository,
            SupplierSettlementRepository supplierSettlementRepository,
            WholesalerCustomerRepository wholesalerCustomerRepository,
            WholesalerSupplierRepository wholesalerSupplierRepository,
            AccountBalanceRepository accountBalanceRepository,
            AccountLedgerRepository accountLedgerRepository,
            BoxBalanceRepository boxBalanceRepository,
            BoxInventoryRepository boxInventoryRepository,
            BoxLedgerRepository boxLedgerRepository,
            CrateDepositMovementRepository crateDepositMovementRepository,
            TransactionRepository transactionRepository,
            AccountBalanceService accountBalanceService
    ) {
        this.wholesalerRepository = wholesalerRepository;
        this.paymentRepository = paymentRepository;
        this.supplierSettlementRepository = supplierSettlementRepository;
        this.wholesalerCustomerRepository = wholesalerCustomerRepository;
        this.wholesalerSupplierRepository = wholesalerSupplierRepository;
        this.accountBalanceRepository = accountBalanceRepository;
        this.accountLedgerRepository = accountLedgerRepository;
        this.boxBalanceRepository = boxBalanceRepository;
        this.boxInventoryRepository = boxInventoryRepository;
        this.boxLedgerRepository = boxLedgerRepository;
        this.crateDepositMovementRepository = crateDepositMovementRepository;
        this.transactionRepository = transactionRepository;
        this.accountBalanceService = accountBalanceService;
    }

    @Transactional
    public PaymentCancellationResponse cancelCustomerPayment(Long wholesalerId, Long paymentId, String reason) {
        Wholesaler wholesaler = findWholesaler(wholesalerId);
        Payment payment = paymentRepository.findFirstByWholesalerIdAndId(wholesalerId, paymentId)
                .orElseThrow(() -> new BadRequestException("Payment not found."));
        if (payment.getStatus() != PostStatus.POSTED) {
            throw new BadRequestException("Payment is already " + payment.getStatus().name() + ".");
        }

        WholesalerCustomer customer = wholesalerCustomerRepository.findById(payment.getWholesalerCustomerId())
                .orElseThrow(() -> new BadRequestException("Customer account not found."));
        String cleanReason = "Cancellation of payment #" + paymentId + (reason == null || reason.isBlank() ? "" : " — " + reason.trim());

        // 1. Reverse cash: customer balance was reduced by cashAmount; restore it and write DUE_ADJUSTMENT debit.
        BigDecimal customerBalanceAfter = null;
        BigDecimal cash = money(payment.getCashAmount());
        AccountBalance balance = accountBalanceService.getOrCreate(
                wholesaler, PartyType.WHOLESALER_CUSTOMER, customer.getId(), customer.getOpeningDue());
        if (cash.signum() > 0) {
            balance.setBalance(money(balance.getBalance().add(cash)));
            accountBalanceRepository.save(balance);
            writeAccountAdjustment(wholesaler, PartyType.WHOLESALER_CUSTOMER, customer.getId(),
                    paymentId, cash, BigDecimal.ZERO, cleanReason + " — reverse cash credit");
        }
        customerBalanceAfter = money(balance.getBalance());

        // 2. Reverse crate returns: each customer-return BoxLedger entry against this payment.
        int cratesReinstated = reverseCrateReturns(wholesaler, customer, payment, cleanReason);

        // 3. Reverse any crate-deposit refund made with this payment: the money comes back in,
        //    and the held deposit is restored. Record a compensating movement for the audit/cash book.
        for (org.example.model.CrateDepositMovement refund : crateDepositMovementRepository
                .findByWholesalerIdAndPaymentId(wholesaler.getId(), payment.getId())) {
            if (refund.getMovementType() != org.example.model.enums.CrateDepositMovementType.REFUNDED) {
                continue;
            }
            BigDecimal restore = money(refund.getAmount().negate()); // refund amount stored negative → positive
            org.example.model.CrateDepositMovement reversal = new org.example.model.CrateDepositMovement();
            reversal.setWholesalerId(wholesaler.getId());
            reversal.setWholesalerCustomerId(customer.getId());
            reversal.setAmount(restore);
            reversal.setMovementType(org.example.model.enums.CrateDepositMovementType.TAKEN);
            reversal.setPaymentId(payment.getId());
            reversal.setNote(cleanReason + " — restore crate deposit refund");
            crateDepositMovementRepository.save(reversal);
            BigDecimal held = customer.getCrateDepositHeld() == null ? BigDecimal.ZERO : customer.getCrateDepositHeld();
            customer.setCrateDepositHeld(money(held.add(restore)));
            wholesalerCustomerRepository.save(customer);
        }

        payment.setStatus(PostStatus.CANCELLED);
        payment.setNote(joinNote(payment.getNote(), cleanReason));
        paymentRepository.save(payment);

        Transaction tx = recordCancellationTransaction(wholesalerId, paymentId, null, customer.getId(), null,
                customerBalanceAfter, cleanReason);
        return new PaymentCancellationResponse(
                paymentId, null, payment.getStatus().name(),
                customer.getId(), null,
                customerBalanceAfter, null,
                cratesReinstated,
                tx.getId(), LocalDateTime.now()
        );
    }

    @Transactional
    public PaymentCancellationResponse cancelSupplierSettlement(Long wholesalerId, Long settlementId, String reason) {
        Wholesaler wholesaler = findWholesaler(wholesalerId);
        SupplierSettlement settlement = supplierSettlementRepository.findFirstByIdAndWholesaler_Id(settlementId, wholesalerId)
                .orElseThrow(() -> new BadRequestException("Settlement not found."));
        if (settlement.getStatus() != PostStatus.POSTED) {
            throw new BadRequestException("Settlement is already " + settlement.getStatus().name() + ".");
        }
        SettlementType type = settlement.getSettlementType();
        if (type == SettlementType.ADJUSTMENT) {
            throw new BadRequestException("Manual ADJUSTMENT settlements cannot be cancelled. Post an opposite ADJUSTMENT entry.");
        }

        WholesalerSupplier supplier = settlement.getWholesalerSupplier();
        String cleanReason = "Cancellation of settlement #" + settlementId + (reason == null || reason.isBlank() ? "" : " — " + reason.trim());
        BigDecimal amount = money(settlement.getAmount());
        BigDecimal supplierBalanceAfter = null;

        boolean reducesPayable = type == SettlementType.PRODUCT_PAYMENT;
        if (reducesPayable) {
            AccountBalance balance = accountBalanceService.getOrCreate(
                    wholesaler, PartyType.WHOLESALER_SUPPLIER, supplier.getId(), supplier.getOpeningDue());
            // Original settlement debited (reduced) the balance. Reverse with a credit.
            balance.setBalance(money(balance.getBalance().add(amount)));
            accountBalanceRepository.save(balance);
            writeAccountAdjustment(wholesaler, PartyType.WHOLESALER_SUPPLIER, supplier.getId(),
                    settlementId, BigDecimal.ZERO, amount, cleanReason + " — reverse " + type.name());
            supplierBalanceAfter = money(balance.getBalance());
        }

        settlement.setStatus(PostStatus.CANCELLED);
        settlement.setNote(joinNote(settlement.getNote(), cleanReason));
        supplierSettlementRepository.save(settlement);

        Transaction tx = recordCancellationTransaction(wholesalerId, null, settlementId, null, supplier.getId(),
                supplierBalanceAfter == null ? BigDecimal.ZERO : supplierBalanceAfter, cleanReason);
        return new PaymentCancellationResponse(
                null, settlementId, settlement.getStatus().name(),
                null, supplier.getId(),
                null, supplierBalanceAfter,
                0,
                tx.getId(), LocalDateTime.now()
        );
    }

    private int reverseCrateReturns(Wholesaler wholesaler, WholesalerCustomer customer, Payment payment, String reason) {
        List<BoxLedger> entries = boxLedgerRepository.findByWholesaler_IdAndReferenceTypeAndReferenceId(
                wholesaler.getId(), BoxReferenceType.PAYMENT, payment.getId());
        int total = 0;
        for (BoxLedger entry : entries) {
            if (entry.getMovementType() != BoxMovementType.RETURNED_FROM_CUSTOMER) {
                continue;
            }
            // Filter to this customer (a single payment id could in theory match other party rows, but normally won't).
            if (entry.getPartyAccountId() == null || !entry.getPartyAccountId().equals(customer.getId())) {
                continue;
            }
            int qty = entry.getQuantity();

            BoxInventory inv = boxInventoryRepository
                    .findByWholesaler_IdAndBoxType_Id(wholesaler.getId(), entry.getBoxType().getId())
                    .orElseThrow(() -> new BadRequestException("Crate inventory missing for " + entry.getBoxType().getName() + "."));
            if (inv.getInHand() < qty) {
                throw new BadRequestException("Cannot cancel: " + entry.getBoxType().getName() + " crates in_hand (" + inv.getInHand() + ") < " + qty + ". They were re-issued after return.");
            }
            inv.setInHand(inv.getInHand() - qty);
            inv.setWithCustomers(inv.getWithCustomers() + qty);
            boxInventoryRepository.save(inv);

            BoxBalance balance = boxBalanceRepository
                    .findByWholesaler_IdAndPartyTypeAndPartyAccountIdAndBoxType_Id(
                            wholesaler.getId(), PartyType.WHOLESALER_CUSTOMER, customer.getId(), entry.getBoxType().getId())
                    .orElseGet(() -> {
                        BoxBalance b = new BoxBalance();
                        b.setWholesaler(wholesaler);
                        b.setBoxType(entry.getBoxType());
                        b.setPartyType(PartyType.WHOLESALER_CUSTOMER);
                        b.setPartyAccountId(customer.getId());
                        b.setBoxesDue(0);
                        return b;
                    });
            balance.setBoxesDue(balance.getBoxesDue() + qty);
            boxBalanceRepository.save(balance);

            BoxLedger reversal = new BoxLedger();
            reversal.setWholesaler(wholesaler);
            reversal.setBoxType(entry.getBoxType());
            reversal.setPartyType(BoxLedgerPartyType.WHOLESALER_CUSTOMER);
            reversal.setPartyAccountId(customer.getId());
            reversal.setMovementType(BoxMovementType.GIVEN_TO_CUSTOMER);
            reversal.setQuantity(qty);
            reversal.setReferenceType(BoxReferenceType.PAYMENT);
            reversal.setReferenceId(payment.getId());
            reversal.setNote(reason);
            boxLedgerRepository.save(reversal);

            total += qty;
        }
        return total;
    }

    private void writeAccountAdjustment(Wholesaler wholesaler, PartyType partyType, Long partyAccountId,
                                        Long referenceId, BigDecimal debit, BigDecimal credit, String note) {
        AccountLedger ledger = new AccountLedger();
        ledger.setWholesaler(wholesaler);
        ledger.setPartyType(partyType);
        ledger.setPartyAccountId(partyAccountId);
        ledger.setReferenceType(AccountReferenceType.DUE_ADJUSTMENT);
        ledger.setReferenceId(referenceId);
        ledger.setDebit(money(debit));
        ledger.setCredit(money(credit));
        ledger.setNote(note);
        accountLedgerRepository.save(ledger);
    }

    private Transaction recordCancellationTransaction(Long wholesalerId, Long paymentId, Long settlementId,
                                                      Long customerAccountId, Long supplierAccountId,
                                                      BigDecimal dueAfter, String description) {
        Transaction tx = new Transaction();
        tx.setWholesalerId(wholesalerId);
        tx.setTransactionType(TransactionType.PAYMENT);
        tx.setPaymentId(paymentId);
        tx.setWholesalerCustomerId(customerAccountId);
        tx.setWholesalerSupplierId(supplierAccountId);
        tx.setSaleAmount(BigDecimal.ZERO);
        tx.setPaymentAmount(BigDecimal.ZERO);
        tx.setDueAmount(dueAfter == null ? BigDecimal.ZERO : dueAfter);
        tx.setDescription(description);
        return transactionRepository.save(tx);
    }

    private Wholesaler findWholesaler(Long wholesalerId) {
        if (wholesalerId == null) {
            throw new BadRequestException("Wholesaler id is required.");
        }
        return wholesalerRepository.findById(wholesalerId)
                .orElseThrow(() -> new BadRequestException("Wholesaler not found."));
    }

    private static String joinNote(String existing, String addition) {
        if (existing == null || existing.isBlank()) return addition;
        return existing + " | " + addition;
    }

    private static BigDecimal money(BigDecimal value) {
        return (value == null ? BigDecimal.ZERO : value).setScale(0, RoundingMode.CEILING);
    }
}
