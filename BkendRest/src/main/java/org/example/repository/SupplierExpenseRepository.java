package org.example.repository;

import java.time.LocalDateTime;
import java.util.List;
import org.example.model.SupplierExpense;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SupplierExpenseRepository extends JpaRepository<SupplierExpense, Long> {

    List<SupplierExpense> findByWholesaler_IdAndWholesalerSupplier_IdOrderByExpenseDateDesc(
            Long wholesalerId, Long wholesalerSupplierId);

    List<SupplierExpense> findByDelivery_Id(Long deliveryId);

    @Query("""
        SELECT COALESCE(SUM(e.amount), 0) FROM SupplierExpense e
        WHERE e.wholesaler.id = :wholesalerId
          AND e.wholesalerSupplier.id = :supplierId
          AND e.expenseDate >= :from AND e.expenseDate < :to
        """)
    java.math.BigDecimal sumAmountBetween(@Param("wholesalerId") Long wholesalerId,
                                          @Param("supplierId") Long supplierId,
                                          @Param("from") LocalDateTime from,
                                          @Param("to") LocalDateTime to);

    // Shipment-wise expense rollups.
    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM SupplierExpense e WHERE e.delivery.id = :deliveryId")
    java.math.BigDecimal sumAmountByDelivery(@Param("deliveryId") Long deliveryId);

    @Query("SELECT COALESCE(SUM(e.dueAmount), 0) FROM SupplierExpense e WHERE e.delivery.id = :deliveryId")
    java.math.BigDecimal sumDueByDelivery(@Param("deliveryId") Long deliveryId);
}
