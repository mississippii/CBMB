package org.example.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

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
        List<CrateTypeQuantity> crateDues,
        Integer totalCratesDue,
        BigDecimal crateDepositHeld,
        String status,
        LocalDateTime createdAt
) {
}
