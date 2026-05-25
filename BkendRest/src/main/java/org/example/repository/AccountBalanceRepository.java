package org.example.repository;

import java.util.List;
import java.util.Optional;
import org.example.model.AccountBalance;
import org.example.model.enums.PartyType;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AccountBalanceRepository extends JpaRepository<AccountBalance, Long> {

    Optional<AccountBalance> findByWholesaler_IdAndPartyTypeAndPartyAccountId(
            Long wholesalerId,
            PartyType partyType,
            Long partyAccountId
    );

    List<AccountBalance> findByWholesaler_Id(Long wholesalerId);

    /**
     * Sum of positive party balances. For WHOLESALER_CUSTOMER this is "customers owe you";
     * for WHOLESALER_SUPPLIER it's "you owe suppliers".
     */
    @org.springframework.data.jpa.repository.Query("""
        select coalesce(sum(b.balance), 0) from AccountBalance b
        where b.wholesaler.id = :wholesalerId
          and b.partyType = :partyType
          and b.balance > 0
        """)
    java.math.BigDecimal sumPositiveBalances(@org.springframework.data.repository.query.Param("wholesalerId") Long wholesalerId,
                                              @org.springframework.data.repository.query.Param("partyType") PartyType partyType);

    /**
     * Absolute sum of negative party balances. For WHOLESALER_SUPPLIER this is "supplier prepaid"
     * (you paid the supplier ahead); for WHOLESALER_CUSTOMER it's "you owe customer / refund due".
     */
    @org.springframework.data.jpa.repository.Query("""
        select coalesce(sum(-b.balance), 0) from AccountBalance b
        where b.wholesaler.id = :wholesalerId
          and b.partyType = :partyType
          and b.balance < 0
        """)
    java.math.BigDecimal sumNegativeBalancesAbs(@org.springframework.data.repository.query.Param("wholesalerId") Long wholesalerId,
                                                  @org.springframework.data.repository.query.Param("partyType") PartyType partyType);
}
