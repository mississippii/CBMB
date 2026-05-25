package org.example.repository;

import java.util.List;
import org.example.model.AccountLedger;
import org.example.model.id.AccountLedgerId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AccountLedgerRepository extends JpaRepository<AccountLedger, AccountLedgerId> {

    /**
     * Returns one row per (party_type, party_account_id) for the wholesaler with summed
     * debits and credits. Used by the balance audit to reconcile account_balances against
     * the ledger. Each row: { String partyType, Long partyAccountId, BigDecimal sumDebit, BigDecimal sumCredit }.
     */
    @Query("""
        SELECT l.partyType, l.partyAccountId,
               COALESCE(SUM(l.debit), 0), COALESCE(SUM(l.credit), 0)
        FROM AccountLedger l
        WHERE l.wholesaler.id = :wholesalerId
        GROUP BY l.partyType, l.partyAccountId
        """)
    List<Object[]> findGroupedSums(@Param("wholesalerId") Long wholesalerId);
}
