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
        SELECT e FROM SupplierExpense e
        WHERE e.wholesaler.id = :wholesalerId
          AND e.wholesalerSupplier.id = :supplierId
          AND e.dueAmount > 0
        ORDER BY e.expenseDate ASC, e.id ASC
        """)
    List<SupplierExpense> findOutstandingBySupplier(@Param("wholesalerId") Long wholesalerId,
                                                    @Param("supplierId") Long supplierId);

    @Query("""
        SELECT COALESCE(SUM(e.dueAmount), 0) FROM SupplierExpense e
        WHERE e.wholesaler.id = :wholesalerId
          AND e.wholesalerSupplier.id = :supplierId
        """)
    java.math.BigDecimal sumOutstandingBySupplier(@Param("wholesalerId") Long wholesalerId,
                                                   @Param("supplierId") Long supplierId);

    /** Total expense amount booked against a supplier (deducted from net payable). */
    @Query("""
        SELECT COALESCE(SUM(e.amount), 0) FROM SupplierExpense e
        WHERE e.wholesaler.id = :wholesalerId
          AND e.wholesalerSupplier.id = :supplierId
        """)
    java.math.BigDecimal sumAmountBySupplier(@Param("wholesalerId") Long wholesalerId,
                                             @Param("supplierId") Long supplierId);

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

    /**
     * Cash the wholesaler fronted on supplier/shipment expenses in [from, to) — the
     * wholesaler-funded slice (amount − supplier-funded) = dueAmount. This is a drawer
     * outflow for the cash book; the expense is a deduction from the supplier's net due.
     */
    @Query("""
        SELECT COALESCE(SUM(e.dueAmount), 0) FROM SupplierExpense e
        WHERE e.wholesaler.id = :wholesalerId
          AND (:from IS NULL OR e.expenseDate >= :from)
          AND (:to IS NULL OR e.expenseDate < :to)
        """)
    java.math.BigDecimal sumWholesalerFrontedInPeriod(@Param("wholesalerId") Long wholesalerId,
                                                      @Param("from") LocalDateTime from,
                                                      @Param("to") LocalDateTime to);

    // Shipment-wise expense rollups.
    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM SupplierExpense e WHERE e.delivery.id = :deliveryId")
    java.math.BigDecimal sumAmountByDelivery(@Param("deliveryId") Long deliveryId);

    @Query("SELECT COALESCE(SUM(e.dueAmount), 0) FROM SupplierExpense e WHERE e.delivery.id = :deliveryId")
    java.math.BigDecimal sumDueByDelivery(@Param("deliveryId") Long deliveryId);

    /**
     * Per (supplier, category) outstanding-due rollup used by the balance audit
     * to reconcile other_due_balances against the underlying expense rows.
     * Each row: { Long wholesalerSupplierId, Long categoryId, BigDecimal sumDue }.
     */
    @Query("""
        SELECT e.wholesalerSupplier.id, e.category.id, COALESCE(SUM(e.dueAmount), 0)
        FROM SupplierExpense e
        WHERE e.wholesaler.id = :wholesalerId
        GROUP BY e.wholesalerSupplier.id, e.category.id
        """)
    List<Object[]> findOutstandingGroupedBySupplierAndCategory(@Param("wholesalerId") Long wholesalerId);
}
