package org.example.dto;

/** A variety under a product (flat). */
public record CategoryCatalogResponse(
        Long id,
        String name,
        boolean usesLots,
        String status
) {
}
