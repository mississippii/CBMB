package org.example.repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.example.model.WholesalerCustomer;
import org.example.model.enums.RecordStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface WholesalerCustomerRepository extends JpaRepository<WholesalerCustomer, Long> {

    boolean existsByWholesaler_IdAndCustomer_Id(Long wholesalerId, Long customerId);

    Optional<WholesalerCustomer> findByWholesaler_IdAndCustomer_Id(Long wholesalerId, Long customerId);

    List<WholesalerCustomer> findByWholesaler_IdAndStatusOrderByCreatedAtDesc(Long wholesalerId, RecordStatus status);

    Optional<WholesalerCustomer> findByWholesaler_IdAndId(Long wholesalerId, Long id);

    List<WholesalerCustomer> findByWholesaler_IdOrderByCreatedAtDesc(Long wholesalerId);
    @Query("""
        select coalesce(sum(c.crateDepositHeld), 0)
        from WholesalerCustomer c
        where c.wholesaler.id = :wholesalerId
        """)
    BigDecimal sumCrateDepositHeld(@Param("wholesalerId") Long wholesalerId);

}
