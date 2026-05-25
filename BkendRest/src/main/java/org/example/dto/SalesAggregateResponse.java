package org.example.dto;

import java.math.BigDecimal;
import java.util.List;

public record SalesAggregateResponse(
        Summary summary,
        String groupBy,
        List<Group> groups
) {
    public record Summary(
            BigDecimal totalSold,
            BigDecimal cashAtSale,
            BigDecimal dueCreated,
            BigDecimal totalQuantity,
            BigDecimal commissionEarned,
            long saleCount
    ) {
    }

    public record Group(
            Long id,
            String name,
            BigDecimal totalSold,
            BigDecimal totalQuantity,
            BigDecimal commissionEarned,
            long saleCount
    ) {
    }
}
