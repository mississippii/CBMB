package org.example.repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.example.model.SaleItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SaleItemRepository extends JpaRepository<SaleItem, Long> {

    Optional<SaleItem> findFirstBySale_Id(Long saleId);

    List<SaleItem> findBySale_Id(Long saleId);

    @Query("select coalesce(sum(i.lineTotal), 0) from SaleItem i where i.wholesaler.id = :wholesalerId and i.wholesalerSupplier.id = :supplierAccountId")
    BigDecimal sumLineTotalBySupplier(@Param("wholesalerId") Long wholesalerId, @Param("supplierAccountId") Long supplierAccountId);

    @Query("select coalesce(sum(i.commissionAmount), 0) from SaleItem i where i.wholesaler.id = :wholesalerId and i.wholesalerSupplier.id = :supplierAccountId")
    BigDecimal sumCommissionBySupplier(@Param("wholesalerId") Long wholesalerId, @Param("supplierAccountId") Long supplierAccountId);

    @Query("select coalesce(sum(i.lineTotal), 0) from SaleItem i where i.wholesaler.id = :wholesalerId and i.wholesalerSupplier.id = :supplierAccountId and i.sale.saleDate >= :startDate and i.sale.saleDate < :endDate")
    BigDecimal sumLineTotalBySupplierBetween(@Param("wholesalerId") Long wholesalerId, @Param("supplierAccountId") Long supplierAccountId, @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);

    @Query("select coalesce(sum(i.commissionAmount), 0) from SaleItem i where i.wholesaler.id = :wholesalerId and i.wholesalerSupplier.id = :supplierAccountId and i.sale.saleDate >= :startDate and i.sale.saleDate < :endDate")
    BigDecimal sumCommissionBySupplierBetween(@Param("wholesalerId") Long wholesalerId, @Param("supplierAccountId") Long supplierAccountId, @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);

    // Shipment-wise: total sold value of one lot.
    @Query("select coalesce(sum(i.lineTotal), 0) from SaleItem i where i.delivery.id = :deliveryId")
    BigDecimal sumLineTotalByDelivery(@Param("deliveryId") Long deliveryId);

    @Query("select coalesce(sum(i.lineTotal), 0) from SaleItem i where i.delivery.id = :deliveryId and i.sale.saleDate >= :startDate and i.sale.saleDate < :endDate")
    BigDecimal sumLineTotalByDeliveryBetween(@Param("deliveryId") Long deliveryId, @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);

    @Query("select coalesce(sum(i.quantity), 0) from SaleItem i where i.delivery.id = :deliveryId")
    BigDecimal sumQuantityByDelivery(@Param("deliveryId") Long deliveryId);

    /**
     * Single-row aggregate across all matching sale_items for the wholesaler.
     * Null filters are wildcards. CANCELLED sales are excluded. Commission uses the
     * live shipment.commission_rate (fresh) rather than the per-sale snapshot so rate
     * changes after the sell are reflected.
     * Returns Object[]: { totalSold, totalQuantity, commissionEarned, saleCount }.
     */
    @Query("""
        SELECT COALESCE(SUM(i.lineTotal), 0),
               COALESCE(SUM(i.quantity), 0),
               COALESCE(SUM(i.lineTotal * COALESCE(i.delivery.commissionRate, 0)) / 100, 0),
               COUNT(DISTINCT i.sale.id)
        FROM SaleItem i
        WHERE i.wholesaler.id = :wholesalerId
          AND i.sale.status = org.example.model.enums.PostStatus.POSTED
          AND (:from IS NULL OR i.sale.saleDate >= :from)
          AND (:to IS NULL OR i.sale.saleDate < :to)
          AND (:productId IS NULL OR i.product.id = :productId)
          AND (:categoryId IS NULL OR i.category.id = :categoryId)
          AND (:subCategoryId IS NULL OR i.subCategory.id = :subCategoryId)
          AND (:supplierId IS NULL OR i.wholesalerSupplier.id = :supplierId)
        """)
    List<Object[]> aggregateSummary(
            @Param("wholesalerId") Long wholesalerId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            @Param("productId") Long productId,
            @Param("categoryId") Long categoryId,
            @Param("subCategoryId") Long subCategoryId,
            @Param("supplierId") Long supplierId
    );

    /**
     * GROUP BY product. Rows: { productId, productName, totalSold, totalQuantity, commissionEarned, saleCount }.
     */
    @Query("""
        SELECT i.product.id, i.product.name,
               COALESCE(SUM(i.lineTotal), 0),
               COALESCE(SUM(i.quantity), 0),
               COALESCE(SUM(i.lineTotal * COALESCE(i.delivery.commissionRate, 0)) / 100, 0),
               COUNT(DISTINCT i.sale.id)
        FROM SaleItem i
        WHERE i.wholesaler.id = :wholesalerId
          AND i.sale.status = org.example.model.enums.PostStatus.POSTED
          AND (:from IS NULL OR i.sale.saleDate >= :from)
          AND (:to IS NULL OR i.sale.saleDate < :to)
          AND (:productId IS NULL OR i.product.id = :productId)
          AND (:categoryId IS NULL OR i.category.id = :categoryId)
          AND (:subCategoryId IS NULL OR i.subCategory.id = :subCategoryId)
          AND (:supplierId IS NULL OR i.wholesalerSupplier.id = :supplierId)
        GROUP BY i.product.id, i.product.name
        ORDER BY SUM(i.lineTotal) DESC
        """)
    List<Object[]> aggregateGroupByProduct(
            @Param("wholesalerId") Long wholesalerId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            @Param("productId") Long productId,
            @Param("categoryId") Long categoryId,
            @Param("subCategoryId") Long subCategoryId,
            @Param("supplierId") Long supplierId
    );

    @Query("""
        SELECT i.category.id, i.category.name,
               COALESCE(SUM(i.lineTotal), 0),
               COALESCE(SUM(i.quantity), 0),
               COALESCE(SUM(i.lineTotal * COALESCE(i.delivery.commissionRate, 0)) / 100, 0),
               COUNT(DISTINCT i.sale.id)
        FROM SaleItem i
        WHERE i.wholesaler.id = :wholesalerId
          AND i.sale.status = org.example.model.enums.PostStatus.POSTED
          AND (:from IS NULL OR i.sale.saleDate >= :from)
          AND (:to IS NULL OR i.sale.saleDate < :to)
          AND (:productId IS NULL OR i.product.id = :productId)
          AND (:categoryId IS NULL OR i.category.id = :categoryId)
          AND (:subCategoryId IS NULL OR i.subCategory.id = :subCategoryId)
          AND (:supplierId IS NULL OR i.wholesalerSupplier.id = :supplierId)
        GROUP BY i.category.id, i.category.name
        ORDER BY SUM(i.lineTotal) DESC
        """)
    List<Object[]> aggregateGroupByCategory(
            @Param("wholesalerId") Long wholesalerId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            @Param("productId") Long productId,
            @Param("categoryId") Long categoryId,
            @Param("subCategoryId") Long subCategoryId,
            @Param("supplierId") Long supplierId
    );

    @Query("""
        SELECT i.subCategory.id, i.subCategory.name,
               COALESCE(SUM(i.lineTotal), 0),
               COALESCE(SUM(i.quantity), 0),
               COALESCE(SUM(i.lineTotal * COALESCE(i.delivery.commissionRate, 0)) / 100, 0),
               COUNT(DISTINCT i.sale.id)
        FROM SaleItem i
        WHERE i.wholesaler.id = :wholesalerId
          AND i.sale.status = org.example.model.enums.PostStatus.POSTED
          AND (:from IS NULL OR i.sale.saleDate >= :from)
          AND (:to IS NULL OR i.sale.saleDate < :to)
          AND (:productId IS NULL OR i.product.id = :productId)
          AND (:categoryId IS NULL OR i.category.id = :categoryId)
          AND (:subCategoryId IS NULL OR i.subCategory.id = :subCategoryId)
          AND (:supplierId IS NULL OR i.wholesalerSupplier.id = :supplierId)
        GROUP BY i.subCategory.id, i.subCategory.name
        ORDER BY SUM(i.lineTotal) DESC
        """)
    List<Object[]> aggregateGroupBySubCategory(
            @Param("wholesalerId") Long wholesalerId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            @Param("productId") Long productId,
            @Param("categoryId") Long categoryId,
            @Param("subCategoryId") Long subCategoryId,
            @Param("supplierId") Long supplierId
    );

    @Query("""
        SELECT i.wholesalerSupplier.id, i.wholesalerSupplier.supplier.name,
               COALESCE(SUM(i.lineTotal), 0),
               COALESCE(SUM(i.quantity), 0),
               COALESCE(SUM(i.lineTotal * COALESCE(i.delivery.commissionRate, 0)) / 100, 0),
               COUNT(DISTINCT i.sale.id)
        FROM SaleItem i
        WHERE i.wholesaler.id = :wholesalerId
          AND i.sale.status = org.example.model.enums.PostStatus.POSTED
          AND (:from IS NULL OR i.sale.saleDate >= :from)
          AND (:to IS NULL OR i.sale.saleDate < :to)
          AND (:productId IS NULL OR i.product.id = :productId)
          AND (:categoryId IS NULL OR i.category.id = :categoryId)
          AND (:subCategoryId IS NULL OR i.subCategory.id = :subCategoryId)
          AND (:supplierId IS NULL OR i.wholesalerSupplier.id = :supplierId)
        GROUP BY i.wholesalerSupplier.id, i.wholesalerSupplier.supplier.name
        ORDER BY SUM(i.lineTotal) DESC
        """)
    List<Object[]> aggregateGroupBySupplier(
            @Param("wholesalerId") Long wholesalerId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            @Param("productId") Long productId,
            @Param("categoryId") Long categoryId,
            @Param("subCategoryId") Long subCategoryId,
            @Param("supplierId") Long supplierId
    );

    /**
     * GROUP BY shipment (delivery). Items without a delivery (legacy data) collapse
     * into the NULL row, surfaced as "Unassigned" by the service.
     */
    @Query("""
        SELECT i.delivery.id, i.delivery.name,
               COALESCE(SUM(i.lineTotal), 0),
               COALESCE(SUM(i.quantity), 0),
               COALESCE(SUM(i.lineTotal * COALESCE(i.delivery.commissionRate, 0)) / 100, 0),
               COUNT(DISTINCT i.sale.id)
        FROM SaleItem i
        WHERE i.wholesaler.id = :wholesalerId
          AND i.sale.status = org.example.model.enums.PostStatus.POSTED
          AND (:from IS NULL OR i.sale.saleDate >= :from)
          AND (:to IS NULL OR i.sale.saleDate < :to)
          AND (:productId IS NULL OR i.product.id = :productId)
          AND (:categoryId IS NULL OR i.category.id = :categoryId)
          AND (:subCategoryId IS NULL OR i.subCategory.id = :subCategoryId)
          AND (:supplierId IS NULL OR i.wholesalerSupplier.id = :supplierId)
        GROUP BY i.delivery.id, i.delivery.name
        ORDER BY SUM(i.lineTotal) DESC
        """)
    List<Object[]> aggregateGroupByShipment(
            @Param("wholesalerId") Long wholesalerId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            @Param("productId") Long productId,
            @Param("categoryId") Long categoryId,
            @Param("subCategoryId") Long subCategoryId,
            @Param("supplierId") Long supplierId
    );
}
