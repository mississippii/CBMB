package org.example.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record PaymentOperationResponse(
        Long transactionId,
        Long paymentId,
        Long settlementId,
        Long wholesalerCustomerId,
        Long wholesalerSupplierId,
        BigDecimal previousDue,
        BigDecimal dueAfter,
        BigDecimal cashAmount,
        Integer cratesMoved,
        List<CrateTypeQuantity> crateLines,
        String operationType,
        LocalDateTime createdAt
) {
}
