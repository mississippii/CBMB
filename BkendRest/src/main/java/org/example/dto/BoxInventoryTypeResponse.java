package org.example.dto;

public record BoxInventoryTypeResponse(
        Long boxTypeId,
        String boxType,
        Integer total,
        Integer inHand,
        Integer withCustomers,
        Integer withSuppliers,
        Integer lostDamaged
) {
}
