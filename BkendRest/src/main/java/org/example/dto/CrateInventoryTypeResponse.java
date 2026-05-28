package org.example.dto;

import java.math.BigDecimal;

public record CrateInventoryTypeResponse(
        Long crateTypeId,
        String crateType,
        Integer total,
        Integer inHand,
        Integer withCustomers,
        Integer withSuppliers,
        Integer lostDamaged,
        BigDecimal purchasePrice
) {
}
