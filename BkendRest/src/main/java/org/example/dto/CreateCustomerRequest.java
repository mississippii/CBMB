package org.example.dto;

import java.math.BigDecimal;

public record CreateCustomerRequest(
        String name,
        String ownerName,
        String phone,
        String address,
        BigDecimal openingDue
) {
}
