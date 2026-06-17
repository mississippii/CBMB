package org.example.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * Read-only overview for the supplier portal: who the supplier supplies to and
 * how each account stands. Positive netDue = the wholesaler owes the supplier;
 * negative = the supplier holds an advance from the wholesaler.
 */
public record SupplierPortalOverviewResponse(
        Long supplierId,
        String name,
        String businessName,
        String phone,
        BigDecimal totalPayableToSupplier,
        BigDecimal totalAdvanceHeldBySupplier,
        List<WholesalerLink> wholesalers
) {

    public record WholesalerLink(
            Long accountId,          // wholesaler_suppliers id
            Long wholesalerId,
            String businessName,
            String ownerName,
            String phone,
            String address,
            BigDecimal commissionRate,
            String status,
            BigDecimal netDue,
            int shipmentCount,
            List<CrateTypeQuantity> crateDues,   // crates the supplier currently holds, per type
            int totalCratesDue
    ) {
    }
}
