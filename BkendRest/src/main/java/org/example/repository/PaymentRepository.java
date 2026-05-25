package org.example.repository;

import java.math.BigDecimal;
import java.util.Optional;
import org.example.model.Payment;
import org.example.model.id.PaymentId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PaymentRepository extends JpaRepository<Payment, PaymentId> {

    Optional<Payment> findFirstByWholesalerIdAndId(Long wholesalerId, Long id);

    @Query("""
        select coalesce(sum(p.cashAmount), 0) from Payment p
        where p.wholesalerId = :wholesalerId
          and p.wholesalerCustomerId = :customerAccountId
          and p.status = org.example.model.enums.PostStatus.POSTED
        """)
    BigDecimal sumCashAmountByCustomer(@Param("wholesalerId") Long wholesalerId, @Param("customerAccountId") Long customerAccountId);

    /** Sum of customer-settlement cash received in [from, to). Excludes CANCELLED payments. */
    @Query("""
        select coalesce(sum(p.cashAmount), 0) from Payment p
        where p.wholesalerId = :wholesalerId
          and p.status = org.example.model.enums.PostStatus.POSTED
          and (:from is null or p.createdAt >= :from)
          and (:to is null or p.createdAt < :to)
        """)
    BigDecimal sumCashAmountInPeriod(@Param("wholesalerId") Long wholesalerId,
                                     @Param("from") java.time.LocalDateTime from,
                                     @Param("to") java.time.LocalDateTime to);
}
