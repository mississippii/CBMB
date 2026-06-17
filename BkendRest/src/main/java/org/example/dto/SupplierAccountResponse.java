package org.example.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record SupplierAccountResponse(
        Long id,
        Long wholesalerId,
        Long supplierId,
        String name,
        String businessName,
        String phone,
        String location,
        BigDecimal commissionRate,
        BigDecimal openingDue,
        BigDecimal currentDue,
        BigDecimal totalSales,
        BigDecimal totalCommissionEarned,
        // Leg 1 — the wholesaler's crates this supplier is holding (supplier owes them back).
        List<CrateTypeQuantity> crateDues,
        Integer totalCratesDue,
        // Leg 2 — the supplier's own crates the wholesaler is holding (wholesaler owes them back).
        List<CrateTypeQuantity> crateHoldings,
        Integer totalCratesHeld,
        String status,
        LocalDateTime createdAt
) {
}
