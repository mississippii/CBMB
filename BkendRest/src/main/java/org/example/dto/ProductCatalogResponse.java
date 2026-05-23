package org.example.dto;

import java.util.List;

public record ProductCatalogResponse(
        Long id,
        String name,
        String status,
        List<CategoryCatalogResponse> categories
) {
}
