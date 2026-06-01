package org.example.dto;

/** A single crate movement line: a crate type (by catalog name) and a quantity. */
public record CrateLineRequest(
        String crateType,
        Integer quantity
) {
}
