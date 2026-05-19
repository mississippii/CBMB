package org.example.repository;

import org.example.model.SupplierDeliveryItem;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SupplierDeliveryItemRepository extends JpaRepository<SupplierDeliveryItem, Long> {
}
