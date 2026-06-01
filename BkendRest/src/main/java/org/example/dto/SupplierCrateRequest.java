package org.example.dto;

import java.util.List;

public record SupplierCrateRequest(
        Long wholesalerSupplierId,
        List<CrateLineRequest> crates,
        String note
) {
}
