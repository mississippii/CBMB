package org.example.dto;

import java.time.LocalDateTime;

public record AdminResponse(
        Long id,
        String name,
        String email,
        String role,
        String status,
        LocalDateTime createdAt
) {}
