package org.example.dto;

public record SupplierCrateRequest(
        Long wholesalerSupplierId,
        Integer banglaCrates,
        Integer chinaCrates,
        String note
) {
}
