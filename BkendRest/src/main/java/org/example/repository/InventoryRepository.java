package org.example.repository;

import java.util.Optional;
import org.example.model.Inventory;
import org.example.model.enums.UnitType;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InventoryRepository extends JpaRepository<Inventory, Long> {

    Optional<Inventory> findByWholesaler_IdAndWholesalerSupplier_IdAndProduct_IdAndCategory_IdAndUnit(
            Long wholesalerId,
            Long wholesalerSupplierId,
            Long productId,
            Long categoryId,
            UnitType unit
    );
}
