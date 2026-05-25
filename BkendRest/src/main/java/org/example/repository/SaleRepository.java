package org.example.repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import org.example.model.Sale;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SaleRepository extends JpaRepository<Sale, Long> {

    @Query("select coalesce(sum(s.netAmount), 0) from Sale s where s.wholesaler.id = :wholesalerId and s.wholesalerCustomer.id = :customerAccountId")
    BigDecimal sumNetAmountByCustomer(@Param("wholesalerId") Long wholesalerId, @Param("customerAccountId") Long customerAccountId);

    @Query("select coalesce(sum(s.paidAmount), 0) from Sale s where s.wholesaler.id = :wholesalerId and s.wholesalerCustomer.id = :customerAccountId")
    BigDecimal sumPaidAmountByCustomer(@Param("wholesalerId") Long wholesalerId, @Param("customerAccountId") Long customerAccountId);

    /**
     * Sale-level money rollup with EXISTS-subquery filters on SaleItem so multi-item
     * sales aren't double-counted. Returns { totalCash, totalDue }. Used by the
     * aggregate endpoint summary to surface paid-vs-due splits without duplicating
     * the per-sale paidAmount across items.
     */
    @Query("""
        SELECT COALESCE(SUM(s.paidAmount), 0), COALESCE(SUM(s.dueAmount), 0)
        FROM Sale s
        WHERE s.wholesaler.id = :wholesalerId
          AND s.status = org.example.model.enums.PostStatus.POSTED
          AND (:from IS NULL OR s.saleDate >= :from)
          AND (:to IS NULL OR s.saleDate < :to)
          AND EXISTS (
            SELECT 1 FROM SaleItem i
            WHERE i.sale = s
              AND (:productId IS NULL OR i.product.id = :productId)
              AND (:categoryId IS NULL OR i.category.id = :categoryId)
              AND (:subCategoryId IS NULL OR i.subCategory.id = :subCategoryId)
              AND (:supplierId IS NULL OR i.wholesalerSupplier.id = :supplierId)
              AND (:deliveryId IS NULL OR i.delivery.id = :deliveryId)
          )
        """)
    java.util.List<Object[]> aggregateSaleMoney(
            @Param("wholesalerId") Long wholesalerId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            @Param("productId") Long productId,
            @Param("categoryId") Long categoryId,
            @Param("subCategoryId") Long subCategoryId,
            @Param("supplierId") Long supplierId,
            @Param("deliveryId") Long deliveryId
    );
}
