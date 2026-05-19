package org.example.dto;

public record CategoryCatalogResponse(
        Long id,
        String name,
        String grade,
        String status
) {
}
