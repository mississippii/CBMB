package org.example.dto;

import java.math.BigDecimal;

/**
 * Used by add-crates and mark-lost-or-damaged endpoints.
 *
 * Add-crates only:
 *   - unitPrice: optional cost-per-crate for THIS batch. If provided, the box_ledger
 *     PURCHASE row is stamped with it, box_inventory.weighted_avg_cost is recomputed,
 *     and box_types.purchase_price is updated as the new "current" cost.
 *
 * Compensation fields are only meaningful for the lost/damaged flow:
 *   - compensationPartyType: "WHOLESALER_CUSTOMER" / "WHOLESALER_SUPPLIER" / null/empty for absorbed
 *   - compensationPartyAccountId: the WholesalerCustomer.id or WholesalerSupplier.id being charged
 *   - compensationAmount: optional override; if null, defaults to quantity × box_type.purchase_price
 */
public record CrateQuantityRequest(
        String crateType,
        Integer quantity,
        BigDecimal unitPrice,
        String reason,
        String note
) {
}
