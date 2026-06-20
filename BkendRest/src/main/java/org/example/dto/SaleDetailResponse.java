package org.example.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record SaleDetailResponse(
        Long saleId,
        String transactionCode,
        Long wholesalerCustomerId,
        String customerName,
        String customerPhone,
        String customerType,
        String saleType,
        Integer boxesGiven,
        java.util.List<CrateTypeQuantity> crateLines,
        BigDecimal crateDepositAmount,
        BigDecimal crateSaleAmount,
        String note,
        BigDecimal grossAmount,
        BigDecimal discountAmount,
        BigDecimal netAmount,
        BigDecimal paidAmount,
        BigDecimal dueAmount,
        String paymentMethod,
        String status,
        LocalDateTime saleDate,
        List<Item> items
) {
    public record Item(
            Long saleItemId,
            Long wholesalerSupplierId,
            String supplierName,
            Long deliveryId,
            String deliveryName,
            Long productId,
            String productName,
            Long categoryId,
            String categoryName,
            Long subCategoryId,
            String subCategoryName,
            BigDecimal quantity,
            BigDecimal saleWeightKg,
            String unit,
            BigDecimal unitPrice,
            BigDecimal lineTotal,
            BigDecimal commissionRate,
            BigDecimal commissionAmount
    ) {
    }
}
