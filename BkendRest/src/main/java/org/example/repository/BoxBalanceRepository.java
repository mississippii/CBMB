package org.example.repository;

import java.util.List;
import java.util.Optional;
import org.example.model.BoxBalance;
import org.example.model.enums.PartyType;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BoxBalanceRepository extends JpaRepository<BoxBalance, Long> {

    Optional<BoxBalance> findByWholesaler_IdAndPartyTypeAndPartyAccountIdAndBoxType_Id(
            Long wholesalerId,
            PartyType partyType,
            Long partyAccountId,
            Long boxTypeId
    );

    List<BoxBalance> findByWholesaler_IdAndPartyTypeAndPartyAccountId(
            Long wholesalerId,
            PartyType partyType,
            Long partyAccountId
    );

    List<BoxBalance> findByWholesaler_Id(Long wholesalerId);
}
