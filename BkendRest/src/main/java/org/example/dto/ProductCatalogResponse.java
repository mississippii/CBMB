package org.example.dto;

import java.util.List;

public record ProductCatalogResponse(
        Long id,
        String name,
        String defaultUnit,
        String unitType,
        String status,
        List<CategoryCatalogResponse> categories
) {
}
