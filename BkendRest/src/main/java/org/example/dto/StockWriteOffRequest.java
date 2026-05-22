package org.example.dto;

import java.math.BigDecimal;

/** Write off damaged / non-saleable stock from one lot (inventory row). */
public record StockWriteOffRequest(
        Long inventoryId,
        BigDecimal quantity,
        String reason,
        String note
) {
}
