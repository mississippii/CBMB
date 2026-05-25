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
}
