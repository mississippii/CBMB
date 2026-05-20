package org.example.repository;

import java.util.List;
import java.util.Optional;
import org.example.model.WholesalerCustomer;
import org.example.model.enums.RecordStatus;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WholesalerCustomerRepository extends JpaRepository<WholesalerCustomer, Long> {

    boolean existsByWholesaler_IdAndCustomer_Id(Long wholesalerId, Long customerId);

    Optional<WholesalerCustomer> findByWholesaler_IdAndCustomer_Id(Long wholesalerId, Long customerId);

    List<WholesalerCustomer> findByWholesaler_IdAndStatusOrderByCreatedAtDesc(Long wholesalerId, RecordStatus status);

    List<WholesalerCustomer> findByWholesaler_IdOrderByCreatedAtDesc(Long wholesalerId);
}
