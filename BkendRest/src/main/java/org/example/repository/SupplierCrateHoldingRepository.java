package org.example.repository;

import java.util.List;
import java.util.Optional;
import org.example.model.SupplierCrateHolding;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SupplierCrateHoldingRepository extends JpaRepository<SupplierCrateHolding, Long> {

    Optional<SupplierCrateHolding> findByWholesaler_IdAndWholesalerSupplierIdAndBoxType_Id(
            Long wholesalerId, Long wholesalerSupplierId, Long boxTypeId);

    List<SupplierCrateHolding> findByWholesaler_IdAndWholesalerSupplierId(
            Long wholesalerId, Long wholesalerSupplierId);
}
