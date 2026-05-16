package org.example.dto;

public record CreateWholesalerRequest(
        String name,
        String email,
        String password,
        String businessName,
        String phone,
        String address
) {
}
