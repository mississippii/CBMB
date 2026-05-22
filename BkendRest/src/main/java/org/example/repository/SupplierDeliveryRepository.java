package org.example.repository;

import java.util.List;
import org.example.model.SupplierDelivery;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SupplierDeliveryRepository extends JpaRepository<SupplierDelivery, Long> {

    List<SupplierDelivery> findByWholesaler_IdOrderByDeliveryDateDesc(Long wholesalerId);

    List<SupplierDelivery> findByWholesaler_IdAndWholesalerSupplier_IdOrderByDeliveryDateDesc(
            Long wholesalerId, Long wholesalerSupplierId);
}
