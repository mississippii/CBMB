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
        List<CrateTypeQuantity> crateDues,
        Integer totalCratesDue,
        String status,
        LocalDateTime createdAt
) {
}
