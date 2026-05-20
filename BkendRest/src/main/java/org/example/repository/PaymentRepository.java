package org.example.repository;

import java.math.BigDecimal;
import org.example.model.Payment;
import org.example.model.id.PaymentId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PaymentRepository extends JpaRepository<Payment, PaymentId> {

    @Query("select coalesce(sum(p.cashAmount), 0) from Payment p where p.wholesalerId = :wholesalerId and p.wholesalerCustomerId = :customerAccountId")
    BigDecimal sumCashAmountByCustomer(@Param("wholesalerId") Long wholesalerId, @Param("customerAccountId") Long customerAccountId);
}
