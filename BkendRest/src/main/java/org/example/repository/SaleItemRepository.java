package org.example.repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;
import org.example.model.SaleItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SaleItemRepository extends JpaRepository<SaleItem, Long> {

    Optional<SaleItem> findFirstBySale_Id(Long saleId);

    @Query("select coalesce(sum(i.lineTotal), 0) from SaleItem i where i.wholesaler.id = :wholesalerId and i.wholesalerSupplier.id = :supplierAccountId")
    BigDecimal sumLineTotalBySupplier(@Param("wholesalerId") Long wholesalerId, @Param("supplierAccountId") Long supplierAccountId);

    @Query("select coalesce(sum(i.commissionAmount), 0) from SaleItem i where i.wholesaler.id = :wholesalerId and i.wholesalerSupplier.id = :supplierAccountId")
    BigDecimal sumCommissionBySupplier(@Param("wholesalerId") Long wholesalerId, @Param("supplierAccountId") Long supplierAccountId);

    @Query("select coalesce(sum(i.lineTotal), 0) from SaleItem i where i.wholesaler.id = :wholesalerId and i.wholesalerSupplier.id = :supplierAccountId and i.sale.saleDate >= :startDate and i.sale.saleDate < :endDate")
    BigDecimal sumLineTotalBySupplierBetween(@Param("wholesalerId") Long wholesalerId, @Param("supplierAccountId") Long supplierAccountId, @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);

    @Query("select coalesce(sum(i.commissionAmount), 0) from SaleItem i where i.wholesaler.id = :wholesalerId and i.wholesalerSupplier.id = :supplierAccountId and i.sale.saleDate >= :startDate and i.sale.saleDate < :endDate")
    BigDecimal sumCommissionBySupplierBetween(@Param("wholesalerId") Long wholesalerId, @Param("supplierAccountId") Long supplierAccountId, @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);
}
