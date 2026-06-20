package org.example.dto;

import java.math.BigDecimal;

public record UpdateSupplierRequest(
        Long accountId,
        String name,
        String businessName,
        String phone,
        String location,
        BigDecimal commissionRate
) {
}
