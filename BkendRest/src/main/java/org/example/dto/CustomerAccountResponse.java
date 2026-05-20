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
        BigDecimal currentDue,
        BigDecimal totalPurchases,
        BigDecimal totalPaid,
        BigDecimal jamanotBalance,
        Integer banglaCratesDue,
        Integer chinaCratesDue,
        Integer totalCratesDue,
        String status,
        LocalDateTime createdAt
) {
}
