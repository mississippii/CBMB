package org.example.dto;

public record LoginResponse(
        Long id,
        Long wholesalerId,
        Long supplierId,
        String email,
        String fullName,
        String role,
        String status,
        String businessName,
        String phone,
        String address,
        String supplierPortalToken
) {
}
