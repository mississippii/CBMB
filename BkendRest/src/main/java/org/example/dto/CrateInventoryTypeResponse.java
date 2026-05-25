package org.example.dto;

public record CrateInventoryTypeResponse(
        Long crateTypeId,
        String crateType,
        Integer total,
        Integer inHand,
        Integer withCustomers,
        Integer withSuppliers,
        Integer lostDamaged
) {
}
