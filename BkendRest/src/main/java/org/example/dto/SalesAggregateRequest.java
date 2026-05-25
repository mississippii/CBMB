package org.example.dto;

import java.time.LocalDateTime;

public record SalesAggregateRequest(
        LocalDateTime from,
        LocalDateTime to,
        Long productId,
        Long categoryId,
        Long subCategoryId,
        Long supplierAccountId,
        String groupBy
) {
}
