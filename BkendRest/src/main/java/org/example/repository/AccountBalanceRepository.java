package org.example.repository;

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
}
