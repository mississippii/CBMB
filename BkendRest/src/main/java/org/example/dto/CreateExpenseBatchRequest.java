package org.example.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * Records several expenses against one shipment in a single atomic call.
 * The supplier + shipment are shared by every line.
 */
public record CreateExpenseBatchRequest(
        Long wholesalerSupplierId,
        Long deliveryId,        // shipment these expenses belong to (optional)
        List<Line> lines
) {
    public record Line(
            Long categoryId,
            String categoryName,   // if categoryId not given, find/create by name
            BigDecimal amount,     // total expense cost
            BigDecimal paidAmount, // how much the supplier funded upfront (0 = wholesaler fronted all)
            String note
    ) {
    }
}
