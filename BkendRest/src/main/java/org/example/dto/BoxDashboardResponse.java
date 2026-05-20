package org.example.dto;

import java.util.List;

public record BoxDashboardResponse(
        Long wholesalerId,
        Integer totalBoxesOwned,
        Integer boxesInShop,
        Integer boxesWithCustomers,
        Integer boxesWithSuppliers,
        Integer boxesLostDamaged,
        List<BoxInventoryTypeResponse> boxTypes
) {
}
