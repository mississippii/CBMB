package org.example.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record CustomerAccountResponse(
        Long id,
        Long wholesalerId,
        Long customerId,
        String name,
        String ownerName,
        String phone,
        String address,
        BigDecimal openingDue,
        BigDecimal jamanotBalance,
        String status,
        LocalDateTime createdAt
) {
}
