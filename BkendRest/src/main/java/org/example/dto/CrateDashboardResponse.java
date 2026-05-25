package org.example.dto;

import java.util.List;

public record CrateDashboardResponse(
        Long wholesalerId,
        Integer totalCratesOwned,
        Integer cratesInShop,
        Integer cratesWithCustomers,
        Integer cratesWithSuppliers,
        Integer cratesLostDamaged,
        List<CrateInventoryTypeResponse> crateTypes
) {
}
