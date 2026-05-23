package org.example.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record TransactionResponse(
        Long id,
        String transactionType,
        Long saleId,
        Long paymentId,
        Long wholesalerCustomerId,
        String customerName,
        String customerPhone,
        Long wholesalerSupplierId,
        String supplierName,
        String supplierPhone,
        Long productId,
        String productName,
        Long categoryId,
        String categoryName,
        Long subCategoryId,
        String subCategoryName,
        BigDecimal quantity,
        String unit,
        BigDecimal unitPrice,
        BigDecimal saleAmount,
        BigDecimal grossAmount,
        BigDecimal discountAmount,
        BigDecimal paymentAmount,
        BigDecimal dueAmount,
        Integer boxesReturned,
        BigDecimal jamanotAmount,
        String paymentType,
        String description,
        LocalDateTime createdAt
) {
}
