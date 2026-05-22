package org.example.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record ExpenseResponse(
        Long id,
        Long wholesalerSupplierId,
        Long categoryId,
        String categoryName,
        BigDecimal amount,
        BigDecimal paidAmount,
        BigDecimal dueAmount,
        String note,
        LocalDateTime expenseDate
) {
}
