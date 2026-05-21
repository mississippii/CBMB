package org.example.dto;

import java.util.List;

public record CreateProductRequest(
        String name,
        String unitType,
        String defaultUnit,
        List<CategoryInputRequest> categories
) {
    public record CategoryInputRequest(String name, String grade) {}
}
