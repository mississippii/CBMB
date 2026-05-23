package org.example.dto;

import java.util.List;

/**
 * Admin creates a product (name only — unit and category tree are decided at
 * shipment time). Optional top-level seed categories may be supplied; nested
 * categories are added later via the receive flow / category endpoints.
 */
public record CreateProductRequest(
        String name,
        List<CategoryInputRequest> categories
) {
    public record CategoryInputRequest(String name) {}
}
