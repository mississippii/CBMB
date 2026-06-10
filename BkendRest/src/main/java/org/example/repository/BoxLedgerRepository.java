package org.example.repository;

import java.time.LocalDateTime;
import java.util.List;
import org.example.model.BoxLedger;
import org.example.model.id.BoxLedgerId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BoxLedgerRepository extends JpaRepository<BoxLedger, BoxLedgerId> {

    @Query(value = """
        SELECT DATE_FORMAT(bl.created_at, '%Y-%m') AS month,
               bt.name AS box_type,
               bl.movement_type AS movement_type,
               SUM(bl.quantity) AS qty
        FROM box_ledger bl
        JOIN box_types bt ON bt.id = bl.box_type_id
        WHERE bl.wholesaler_id = :wholesalerId
          AND bl.movement_type IN ('LOST', 'DAMAGED')
          AND bl.created_at >= :since
        GROUP BY DATE_FORMAT(bl.created_at, '%Y-%m'), bt.name, bl.movement_type
        ORDER BY month ASC
        """, nativeQuery = true)
    List<Object[]> findLostStats(@Param("wholesalerId") Long wholesalerId,
                                  @Param("since") LocalDateTime since);

    /**
     * Per-party grouped sums for the box-balance audit.
     * Each row: { String partyType, Long partyAccountId, Long boxTypeId, String movementType, Long quantity }.
     * Restricted to party-bearing rows (CUSTOMER / SUPPLIER) — warehouse-only rows (LOST/DAMAGED/PURCHASE/ADJUSTMENT under party=WHOLESALER) are excluded.
     */
    @Query("""
        SELECT l.partyType, l.partyAccountId, l.boxType.id, l.movementType,
               COALESCE(SUM(l.quantity), 0)
        FROM BoxLedger l
        WHERE l.wholesaler.id = :wholesalerId
          AND l.partyType <> org.example.model.enums.BoxLedgerPartyType.WHOLESALER
        GROUP BY l.partyType, l.partyAccountId, l.boxType.id, l.movementType
        """)
    List<Object[]> findPartyGroupedSums(@Param("wholesalerId") Long wholesalerId);

    /**
     * Warehouse-level grouped sums for the box-inventory audit.
     * Each row: { Long boxTypeId, String movementType, Long quantity }.
     */
    @Query("""
        SELECT l.boxType.id, l.movementType, COALESCE(SUM(l.quantity), 0)
        FROM BoxLedger l
        WHERE l.wholesaler.id = :wholesalerId
        GROUP BY l.boxType.id, l.movementType
        """)
    List<Object[]> findInventoryGroupedSums(@Param("wholesalerId") Long wholesalerId);

    /** Used by reversal flows to find every crate movement triggered by a given sale or payment. */
    List<BoxLedger> findByWholesaler_IdAndReferenceTypeAndReferenceId(
            Long wholesalerId,
            org.example.model.enums.BoxReferenceType referenceType,
            Long referenceId
    );

    /**
     * Lookup a single box-ledger row by id within a wholesaler — used by the
     * "mark loss compensated" flow. Scans all partitions (rare call path).
     */
    @Query("SELECT l FROM BoxLedger l WHERE l.wholesaler.id = :wholesalerId AND l.id = :id")
    java.util.Optional<BoxLedger> findOneByWholesalerAndId(
            @Param("wholesalerId") Long wholesalerId,
            @Param("id") Long id
    );

    /**
     * Sum of crate loss value (quantity × unit_cost_snapshot) in a period.
     * Every loss is absorbed by the wholesaler, so all LOST/DAMAGED rows count.
     * Returns null if no rows match. Used by the P&L report.
     */
    @Query("""
        SELECT COALESCE(SUM(l.quantity * l.unitCostSnapshot), 0)
        FROM BoxLedger l
        WHERE l.wholesaler.id = :wholesalerId
          AND l.movementType IN (org.example.model.enums.BoxMovementType.LOST,
                                 org.example.model.enums.BoxMovementType.DAMAGED)
          AND l.unitCostSnapshot IS NOT NULL
          AND (:from IS NULL OR l.createdAt >= :from)
          AND (:to   IS NULL OR l.createdAt <  :to)
        """)
    java.math.BigDecimal sumUncompensatedLossValue(
            @Param("wholesalerId") Long wholesalerId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to
    );

    /**
     * Net profit from crate sales in a period: sum(qty × (unitSalePrice − unitCostSnapshot)).
     * Crates are a capital asset so only the gain/loss flows to P&L, never the gross sale.
     */
    @Query("""
        SELECT COALESCE(SUM(l.quantity * (l.unitSalePrice - l.unitCostSnapshot)), 0)
        FROM BoxLedger l
        WHERE l.wholesaler.id = :wholesalerId
          AND l.movementType = org.example.model.enums.BoxMovementType.SOLD
          AND l.unitSalePrice IS NOT NULL
          AND l.unitCostSnapshot IS NOT NULL
          AND (:from IS NULL OR l.createdAt >= :from)
          AND (:to   IS NULL OR l.createdAt <  :to)
        """)
    java.math.BigDecimal sumCrateSalesNetProfit(
            @Param("wholesalerId") Long wholesalerId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to
    );

    /**
     * Gross cash from walk-in crate sales in a period: sum(qty × unitSalePrice) for
     * SOLD rows with no party account (partyType = WHOLESALER). The full sale price
     * enters the drawer immediately, so the cash book counts the gross — not the
     * P&L profit. On-account crate sales (partyType = WHOLESALER_CUSTOMER) are
     * excluded: they raise a receivable and arrive later as a customer collection.
     */
    @Query("""
        SELECT COALESCE(SUM(l.quantity * l.unitSalePrice), 0)
        FROM BoxLedger l
        WHERE l.wholesaler.id = :wholesalerId
          AND l.movementType = org.example.model.enums.BoxMovementType.SOLD
          AND l.partyType = org.example.model.enums.BoxLedgerPartyType.WHOLESALER
          AND l.unitSalePrice IS NOT NULL
          AND (:from IS NULL OR l.createdAt >= :from)
          AND (:to   IS NULL OR l.createdAt <  :to)
        """)
    java.math.BigDecimal sumWalkInCrateCashSales(
            @Param("wholesalerId") Long wholesalerId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to
    );
}
