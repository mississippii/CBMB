package org.example.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import org.example.model.AccountBalance;
import org.example.model.AccountLedger;
import org.example.model.Wholesaler;
import org.example.model.enums.AccountReferenceType;
import org.example.model.enums.PartyType;
import org.example.repository.AccountBalanceRepository;
import org.example.repository.AccountLedgerRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Single owner of the "find-or-create AccountBalance" path. Centralized so that
 * every first-time materialization of a party balance also writes an OPENING_DUE
 * ledger row — without this, the sum(account_ledger) ≠ account_balances.balance
 * invariant breaks from the very first transaction against any party.
 *
 * Sign convention for the OPENING_DUE row:
 *   WHOLESALER_CUSTOMER: positive opening_due means customer owes you → DEBIT.
 *   WHOLESALER_SUPPLIER: positive opening_due means you owe supplier  → CREDIT.
 *   Negative opening_due flips the side.
 */
@Service
public class AccountBalanceService {

    private final AccountBalanceRepository balanceRepository;
    private final AccountLedgerRepository ledgerRepository;

    public AccountBalanceService(AccountBalanceRepository balanceRepository,
                                 AccountLedgerRepository ledgerRepository) {
        this.balanceRepository = balanceRepository;
        this.ledgerRepository = ledgerRepository;
    }

    @Transactional
    public AccountBalance getOrCreate(Wholesaler wholesaler, PartyType partyType, Long partyAccountId, BigDecimal openingDue) {
        return balanceRepository
                .findByWholesaler_IdAndPartyTypeAndPartyAccountId(wholesaler.getId(), partyType, partyAccountId)
                .orElseGet(() -> create(wholesaler, partyType, partyAccountId, openingDue));
    }

    private AccountBalance create(Wholesaler wholesaler, PartyType partyType, Long partyAccountId, BigDecimal openingDue) {
        BigDecimal opening = money(openingDue == null ? BigDecimal.ZERO : openingDue);
        AccountBalance balance = new AccountBalance();
        balance.setWholesaler(wholesaler);
        balance.setPartyType(partyType);
        balance.setPartyAccountId(partyAccountId);
        balance.setBalance(opening);
        AccountBalance saved = balanceRepository.save(balance);

        if (opening.signum() != 0) {
            writeOpeningLedger(wholesaler, partyType, partyAccountId, opening);
        }
        return saved;
    }

    private void writeOpeningLedger(Wholesaler wholesaler, PartyType partyType, Long partyAccountId, BigDecimal opening) {
        BigDecimal absAmount = opening.abs();
        boolean positive = opening.signum() > 0;
        // Customer-positive = customer owes (debit). Supplier-positive = you owe (credit).
        // The check constraint forbids both sides on one row, so split by sign.
        boolean debitSide = (partyType == PartyType.WHOLESALER_CUSTOMER) == positive;

        AccountLedger ledger = new AccountLedger();
        ledger.setWholesaler(wholesaler);
        ledger.setPartyType(partyType);
        ledger.setPartyAccountId(partyAccountId);
        ledger.setReferenceType(AccountReferenceType.OPENING_DUE);
        ledger.setReferenceId(partyAccountId);
        ledger.setDebit(debitSide ? absAmount : BigDecimal.ZERO);
        ledger.setCredit(debitSide ? BigDecimal.ZERO : absAmount);
        ledger.setNote("Opening due");
        ledgerRepository.save(ledger);
    }

    private static BigDecimal money(BigDecimal value) {
        return value.setScale(0, RoundingMode.CEILING);
    }
}
