package org.example.repository;

import java.util.List;
import java.util.Optional;
import org.example.model.CustomerCrateHolding;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CustomerCrateHoldingRepository extends JpaRepository<CustomerCrateHolding, Long> {

    Optional<CustomerCrateHolding> findByWholesaler_IdAndWholesalerCustomerIdAndBoxType_Id(
            Long wholesalerId, Long wholesalerCustomerId, Long boxTypeId);

    List<CustomerCrateHolding> findByWholesaler_IdAndWholesalerCustomerId(
            Long wholesalerId, Long wholesalerCustomerId);

    @Query("""
            SELECT COALESCE(SUM(h.quantity), 0)
            FROM CustomerCrateHolding h
            WHERE h.wholesaler.id = :wholesalerId
              AND h.quantity > 0
            """)
    Integer sumHeldInShop(@Param("wholesalerId") Long wholesalerId);

    @Query("""
            SELECT COALESCE(SUM(h.quantity), 0)
            FROM CustomerCrateHolding h
            WHERE h.wholesaler.id = :wholesalerId
              AND h.boxType.id = :boxTypeId
              AND h.quantity > 0
            """)
    Integer sumHeldInShopByBoxType(@Param("wholesalerId") Long wholesalerId, @Param("boxTypeId") Long boxTypeId);
}
