package org.example.repository;

import java.util.List;
import org.example.model.WholesalerCustomer;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WholesalerCustomerRepository extends JpaRepository<WholesalerCustomer, Long> {

    boolean existsByWholesaler_IdAndCustomer_Id(Long wholesalerId, Long customerId);

    List<WholesalerCustomer> findByWholesaler_IdOrderByCreatedAtDesc(Long wholesalerId);
}
