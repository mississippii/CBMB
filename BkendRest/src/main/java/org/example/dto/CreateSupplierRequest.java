package org.example.dto;

import java.math.BigDecimal;

public record CreateSupplierRequest(
        String name,
        String phone,
        String address,
        BigDecimal commissionRate,
        BigDecimal openingDue
) {
}
