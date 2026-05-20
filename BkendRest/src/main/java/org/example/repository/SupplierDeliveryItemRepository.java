package org.example.repository;

import java.util.List;
import org.example.model.SupplierDeliveryItem;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SupplierDeliveryItemRepository extends JpaRepository<SupplierDeliveryItem, Long> {

    List<SupplierDeliveryItem> findByDelivery_IdOrderByIdAsc(Long deliveryId);
}
