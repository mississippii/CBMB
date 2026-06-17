package org.example.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record SaleResponse(
        Long saleId,
        Long transactionId,
        String transactionCode,
        Long wholesalerCustomerId,
        String customerName,
        String customerPhone,
        String customerType,
        Long inventoryId,
        Long productId,
        String productName,
        Long categoryId,
        String categoryName,
        Long subCategoryId,
        String subCategoryName,
        Long wholesalerSupplierId,
        String supplierName,
        BigDecimal quantity,
        BigDecimal saleWeightKg,
        String unit,
        BigDecimal unitPrice,
        BigDecimal grossAmount,
        BigDecimal discountAmount,
        BigDecimal netAmount,
        BigDecimal paidAmount,
        BigDecimal dueAmount,
        BigDecimal customerDueBalance,
        BigDecimal commissionAmount,
        BigDecimal supplierDueBalance,
        String crateType,
        Integer cratesGiven,
        BigDecimal inventoryQuantityOnHand,
        LocalDateTime saleDate
) {
}
