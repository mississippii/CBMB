package org.example.repository;

import java.util.List;
import java.util.Optional;
import org.example.model.Inventory;
import org.example.model.enums.UnitType;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InventoryRepository extends JpaRepository<Inventory, Long> {

    List<Inventory> findByWholesaler_IdOrderByUpdatedAtDesc(Long wholesalerId);

    /** All inventory rows belonging to one delivery (used to report on-hand per shipment line). */
    List<Inventory> findByDelivery_Id(Long deliveryId);

    /** Lot-scoped lookup keyed by (delivery, product, category, sub_category, unit). */
    Optional<Inventory> findByWholesaler_IdAndDelivery_IdAndProduct_IdAndCategory_IdAndSubCategory_IdAndUnit(
            Long wholesalerId,
            Long deliveryId,
            Long productId,
            Long categoryId,
            Long subCategoryId,
            UnitType unit
    );

    Optional<Inventory> findByWholesaler_IdAndDelivery_IdAndProduct_IdAndCategory_IdAndSubCategoryIsNullAndUnit(
            Long wholesalerId,
            Long deliveryId,
            Long productId,
            Long categoryId,
            UnitType unit
    );

    Optional<Inventory> findByWholesaler_IdAndDelivery_IdAndProduct_IdAndCategoryIsNullAndSubCategoryIsNullAndUnit(
            Long wholesalerId,
            Long deliveryId,
            Long productId,
            UnitType unit
    );

    boolean existsByDelivery_IdAndQuantityOnHandGreaterThan(Long deliveryId, java.math.BigDecimal quantity);
}
