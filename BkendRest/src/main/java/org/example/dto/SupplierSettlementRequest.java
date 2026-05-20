package org.example.dto;

import java.math.BigDecimal;
import org.example.model.enums.PaymentMethod;

public record SupplierSettlementRequest(
        Long wholesalerSupplierId,
        BigDecimal amount,
        PaymentMethod paymentMethod,
        String note
) {
}
