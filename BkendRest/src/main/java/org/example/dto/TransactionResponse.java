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
        BigDecimal saleAmount,
        BigDecimal paymentAmount,
        BigDecimal dueAmount,
        String description,
        LocalDateTime createdAt
) {
}
