package org.example.dto;

import java.math.BigDecimal;
import java.util.List;

public record CrateDashboardResponse(
        Long wholesalerId,
        Integer totalCratesOwned,
        Integer cratesInShop,
        Integer customerCratesInShop,
        Integer supplierCratesInShop,
        Integer cratesWithCustomers,
        Integer cratesWithSuppliers,
        Integer cratesLostDamaged,
        /** Capital tied up in live crates: Σ (inHand + withCustomers + withSuppliers) × weighted-avg cost. */
        BigDecimal totalCrateValue,
        /** Money currently held from walk-in crate sales; refundable when the crate is returned by sale/transaction reference. */
        BigDecimal refundableWalkInCrateSales,
        List<CrateInventoryTypeResponse> crateTypes
) {
}
