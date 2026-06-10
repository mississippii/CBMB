package org.example.dto;

public record UpdateWholesalerRequest(
        String name,
        String businessName,
        String phone,
        String address
) {
}
