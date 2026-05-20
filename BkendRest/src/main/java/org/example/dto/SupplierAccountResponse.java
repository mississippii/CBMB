package org.example.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record SupplierAccountResponse(
        Long id,
        Long wholesalerId,
        Long supplierId,
        String name,
        String phone,
        String address,
        BigDecimal commissionRate,
        BigDecimal openingDue,
        BigDecimal currentDue,
        BigDecimal totalSales,
        BigDecimal totalCommissionEarned,
        Integer banglaCratesDue,
        Integer chinaCratesDue,
        Integer totalCratesDue,
        String status,
        LocalDateTime createdAt
) {
}
