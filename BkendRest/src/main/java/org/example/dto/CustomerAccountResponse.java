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
        // Leg 1 — the wholesaler's crates this customer is holding (customer owes them back).
        List<CrateTypeQuantity> crateDues,
        Integer totalCratesDue,
        // Leg 2 — the customer's own crates the wholesaler is holding (wholesaler owes them back).
        List<CrateTypeQuantity> crateHoldings,
        Integer totalCratesHeld,
        BigDecimal crateDepositHeld,
        String status,
        LocalDateTime createdAt
) {
}
