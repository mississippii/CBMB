package org.example.dto;

public record SupplierShipmentListRequest(
        Long wholesalerId   // optional filter; null = all wholesalers
) {
}
