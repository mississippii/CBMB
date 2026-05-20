package org.example.repository;

import java.util.List;
import java.util.Optional;
import org.example.model.WholesalerSupplier;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WholesalerSupplierRepository extends JpaRepository<WholesalerSupplier, Long> {

    boolean existsByWholesaler_IdAndSupplier_Id(Long wholesalerId, Long supplierId);

    List<WholesalerSupplier> findByWholesaler_IdOrderByCreatedAtDesc(Long wholesalerId);

    Optional<WholesalerSupplier> findByWholesaler_IdAndId(Long wholesalerId, Long id);
}
