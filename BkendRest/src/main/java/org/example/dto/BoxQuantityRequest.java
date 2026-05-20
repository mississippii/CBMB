package org.example.dto;

public record BoxQuantityRequest(
        String boxType,
        Integer quantity,
        String reason,
        String note
) {
}
