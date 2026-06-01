package org.example.dto;

public record UpdateCrateTypeRequest(
        Long id,
        String name,
        String status
) {
}
