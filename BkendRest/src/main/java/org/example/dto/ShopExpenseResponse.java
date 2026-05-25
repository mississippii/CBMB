package org.example.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record ShopExpenseResponse(
        Long id,
        Long categoryId,
        String categoryName,
        BigDecimal amount,
        String paymentMethod,
        LocalDateTime expenseDate,
        String note,
        String status,
        LocalDateTime createdAt
) {
}
