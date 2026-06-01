package org.example.dto;

/** A crate type (by catalog name) paired with a quantity — used on the response side
 *  for per-type crate dues, payment crate lines, and loss-stat type totals. */
public record CrateTypeQuantity(
        String crateType,
        long quantity
) {
}
