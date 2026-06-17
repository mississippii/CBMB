package org.example.repository;

import java.util.List;
import java.util.Optional;
import org.example.model.SupplierCrateHolding;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SupplierCrateHoldingRepository extends JpaRepository<SupplierCrateHolding, Long> {

    Optional<SupplierCrateHolding> findByWholesaler_IdAndWholesalerSupplierIdAndBoxType_Id(
            Long wholesalerId, Long wholesalerSupplierId, Long boxTypeId);

    List<SupplierCrateHolding> findByWholesaler_IdAndWholesalerSupplierId(
            Long wholesalerId, Long wholesalerSupplierId);

    @Query("""
            SELECT COALESCE(SUM(h.quantity), 0)
            FROM SupplierCrateHolding h
            WHERE h.wholesaler.id = :wholesalerId
              AND h.quantity > 0
            """)
    Integer sumHeldInShop(@Param("wholesalerId") Long wholesalerId);

    @Query("""
            SELECT COALESCE(SUM(h.quantity), 0)
            FROM SupplierCrateHolding h
            WHERE h.wholesaler.id = :wholesalerId
              AND h.boxType.id = :boxTypeId
              AND h.quantity > 0
            """)
    Integer sumHeldInShopByBoxType(@Param("wholesalerId") Long wholesalerId, @Param("boxTypeId") Long boxTypeId);
}
