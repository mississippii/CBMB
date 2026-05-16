package org.example.dto;

import java.time.LocalDateTime;

public record WholesalerResponse(
        Long id,
        Long userId,
        String name,
        String email,
        String businessName,
        String phone,
        String address,
        String status,
        LocalDateTime createdAt
) {
}
