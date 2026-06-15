package org.example.dto;

import java.math.BigDecimal;
import java.util.List;

public record CrateDashboardResponse(
        Long wholesalerId,
        Integer totalCratesOwned,
        Integer cratesInShop,
        Integer cratesWithCustomers,
        Integer cratesWithSuppliers,
        Integer cratesLostDamaged,
        /** Capital tied up in live crates: Σ (inHand + withCustomers + withSuppliers) × weighted-avg cost. */
        BigDecimal totalCrateValue,
        List<CrateInventoryTypeResponse> crateTypes
) {
}
