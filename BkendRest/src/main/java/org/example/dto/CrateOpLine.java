package org.example.dto;

import java.math.BigDecimal;

/**
 * One crate-type line for a multi-type toolkit operation. Price fields are
 * used selectively: {@code unitPrice} for purchase batches, {@code unitSalePrice}
 * for sales, neither for lost/damaged.
 */
public record CrateOpLine(
        String crateType,
        Integer quantity,
        BigDecimal unitPrice,
        BigDecimal unitSalePrice
) {
}
