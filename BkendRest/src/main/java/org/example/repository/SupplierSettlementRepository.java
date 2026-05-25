package org.example.repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import org.example.model.SupplierSettlement;
import org.example.model.enums.SettlementType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SupplierSettlementRepository extends JpaRepository<SupplierSettlement, Long> {

    @Query("""
        select coalesce(sum(s.amount), 0) from SupplierSettlement s
        where s.wholesaler.id = :wholesalerId
          and s.wholesalerSupplier.id = :supplierAccountId
          and s.settlementType = :settlementType
          and s.status = org.example.model.enums.PostStatus.POSTED
        """)
    BigDecimal sumAmountBySupplierAndType(@Param("wholesalerId") Long wholesalerId, @Param("supplierAccountId") Long supplierAccountId, @Param("settlementType") SettlementType settlementType);

    /** Sum of settlements of a given type across the wholesaler in [from, to). Excludes CANCELLED. */
    @Query("""
        select coalesce(sum(s.amount), 0) from SupplierSettlement s
        where s.wholesaler.id = :wholesalerId
          and s.settlementType = :settlementType
          and s.status = org.example.model.enums.PostStatus.POSTED
          and (:from is null or s.settlementDate >= :from)
          and (:to is null or s.settlementDate < :to)
        """)
    BigDecimal sumAmountByTypeInPeriod(@Param("wholesalerId") Long wholesalerId,
                                       @Param("settlementType") SettlementType settlementType,
                                       @Param("from") LocalDateTime from,
                                       @Param("to") LocalDateTime to);

    java.util.Optional<SupplierSettlement> findFirstByIdAndWholesaler_Id(Long id, Long wholesalerId);
}
