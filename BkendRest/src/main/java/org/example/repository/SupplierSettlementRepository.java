package org.example.repository;

import java.math.BigDecimal;
import org.example.model.SupplierSettlement;
import org.example.model.enums.SettlementType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SupplierSettlementRepository extends JpaRepository<SupplierSettlement, Long> {

    @Query("select coalesce(sum(s.amount), 0) from SupplierSettlement s where s.wholesaler.id = :wholesalerId and s.wholesalerSupplier.id = :supplierAccountId and s.settlementType = :settlementType")
    BigDecimal sumAmountBySupplierAndType(@Param("wholesalerId") Long wholesalerId, @Param("supplierAccountId") Long supplierAccountId, @Param("settlementType") SettlementType settlementType);
}
