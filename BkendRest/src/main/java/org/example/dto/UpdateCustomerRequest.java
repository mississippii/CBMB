package org.example.dto;

public record UpdateCustomerRequest(
        Long accountId,
        String name,
        String ownerName,
        String phone,
        String address
) {
}
