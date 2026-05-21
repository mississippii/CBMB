package org.example.repository;

import java.time.LocalDateTime;
import java.util.List;
import org.example.model.BoxLedger;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BoxLedgerRepository extends JpaRepository<BoxLedger, Long> {

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
}
