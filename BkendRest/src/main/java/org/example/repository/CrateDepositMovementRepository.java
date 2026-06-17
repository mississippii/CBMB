package org.example.repository;

import java.math.BigDecimal;
import java.util.List;
import org.example.model.CrateDepositMovement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CrateDepositMovementRepository extends JpaRepository<CrateDepositMovement, Long> {

    /** Deposit movements recorded against a customer payment (used to reverse on cancellation). */
    List<CrateDepositMovement> findByWholesalerIdAndPaymentId(Long wholesalerId, Long paymentId);

    /** Deposit money TAKEN (cash in) in [from, to). */
    @Query("""
        select coalesce(sum(m.amount), 0) from CrateDepositMovement m
        where m.wholesalerId = :wholesalerId
          and m.movementType = org.example.model.enums.CrateDepositMovementType.TAKEN
          and (:from is null or m.createdAt >= :from)
          and (:to is null or m.createdAt < :to)
        """)
    BigDecimal sumTakenInPeriod(@Param("wholesalerId") Long wholesalerId,
                                @Param("from") java.time.LocalDateTime from,
                                @Param("to") java.time.LocalDateTime to);

    /** Deposit money REFUNDED (cash out) in [from, to), as a positive amount. */
    @Query("""
        select coalesce(-sum(m.amount), 0) from CrateDepositMovement m
        where m.wholesalerId = :wholesalerId
          and m.movementType = org.example.model.enums.CrateDepositMovementType.REFUNDED
          and (:from is null or m.createdAt >= :from)
          and (:to is null or m.createdAt < :to)
        """)
    BigDecimal sumRefundedInPeriod(@Param("wholesalerId") Long wholesalerId,
                                   @Param("from") java.time.LocalDateTime from,
                                   @Param("to") java.time.LocalDateTime to);
}
