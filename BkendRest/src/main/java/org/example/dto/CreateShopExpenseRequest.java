package org.example.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record CreateShopExpenseRequest(
        Long categoryId,
        String categoryName,
        BigDecimal amount,
        String paymentMethod,
        LocalDateTime expenseDate,
        String note
) {
}
