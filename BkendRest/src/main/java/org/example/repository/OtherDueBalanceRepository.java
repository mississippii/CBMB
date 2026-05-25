package org.example.repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.example.model.OtherDueBalance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OtherDueBalanceRepository extends JpaRepository<OtherDueBalance, Long> {

    Optional<OtherDueBalance> findByWholesaler_IdAndWholesalerSupplier_IdAndCategory_Id(
            Long wholesalerId, Long wholesalerSupplierId, Long categoryId);

    List<OtherDueBalance> findByWholesaler_IdAndWholesalerSupplier_Id(Long wholesalerId, Long wholesalerSupplierId);

    List<OtherDueBalance> findByWholesaler_Id(Long wholesalerId);

    @Query("""
        SELECT COALESCE(SUM(b.dueAmount), 0) FROM OtherDueBalance b
        WHERE b.wholesaler.id = :wholesalerId AND b.wholesalerSupplier.id = :supplierId
        """)
    BigDecimal sumDueBySupplier(@Param("wholesalerId") Long wholesalerId, @Param("supplierId") Long supplierId);
}
