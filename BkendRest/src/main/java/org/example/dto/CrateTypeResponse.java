package org.example.dto;

import java.time.LocalDateTime;

public record CrateTypeResponse(
        Long id,
        String name,
        String status,
        LocalDateTime createdAt
) {
}
