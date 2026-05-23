package org.example.dto;

import java.math.BigDecimal;

public record CreateExpenseRequest(
        Long wholesalerSupplierId,
        Long deliveryId,        // shipment this expense belongs to (optional)
        Long categoryId,
        String categoryName,   // if categoryId not given, find/create by name
        BigDecimal amount,     // total expense cost
        BigDecimal paidAmount, // how much the supplier funded upfront (0 = wholesaler fronted all)
        String note
) {
}
