package org.example.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record SupplierDeliveryResponse(
        Long id,
        Long wholesalerId,
        Long wholesalerSupplierId,
        String name,
        LocalDateTime deliveryDate,
        BigDecimal totalQuantity,
        String status,
        String note,
        // Shipment-wise consignment figures
        BigDecimal estimatedValue,
        BigDecimal advancePaid,
        BigDecimal commissionRate,   // null until negotiated
        String settlementStatus,
        BigDecimal totalSold,        // sum of sold line totals for this lot
        BigDecimal commissionAmount, // totalSold * commissionRate
        BigDecimal netPayable,       // totalSold - commission - advancePaid
        BigDecimal expenseTotal,     // other expenses booked against this lot
        BigDecimal expenseDue,       // expense the supplier still owes for this lot
        List<SupplierDeliveryItemResponse> items
) {
}
