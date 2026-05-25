package org.example.dto;

public record CrateQuantityRequest(
        String crateType,
        Integer quantity,
        String reason,
        String note
) {
}
