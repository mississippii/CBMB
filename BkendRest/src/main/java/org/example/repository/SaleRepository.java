package org.example.repository;

import java.math.BigDecimal;
import org.example.model.Sale;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SaleRepository extends JpaRepository<Sale, Long> {

    @Query("select coalesce(sum(s.netAmount), 0) from Sale s where s.wholesaler.id = :wholesalerId and s.wholesalerCustomer.id = :customerAccountId")
    BigDecimal sumNetAmountByCustomer(@Param("wholesalerId") Long wholesalerId, @Param("customerAccountId") Long customerAccountId);

    @Query("select coalesce(sum(s.paidAmount), 0) from Sale s where s.wholesaler.id = :wholesalerId and s.wholesalerCustomer.id = :customerAccountId")
    BigDecimal sumPaidAmountByCustomer(@Param("wholesalerId") Long wholesalerId, @Param("customerAccountId") Long customerAccountId);
}
