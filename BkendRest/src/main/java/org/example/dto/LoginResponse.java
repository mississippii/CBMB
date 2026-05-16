package org.example.dto;

public record LoginResponse(
        Long id,
        Long wholesalerId,
        String email,
        String fullName,
        String role,
        String status
) {
}
