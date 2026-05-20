package org.example.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record PaymentOperationResponse(
        Long transactionId,
        Long paymentId,
        Long settlementId,
        Long wholesalerCustomerId,
        Long wholesalerSupplierId,
        BigDecimal previousDue,
        BigDecimal dueAfter,
        BigDecimal cashAmount,
        Integer banglaCrates,
        Integer chinaCrates,
        BigDecimal previousJamanot,
        BigDecimal jamanotAfter,
        String operationType,
        LocalDateTime createdAt
) {
}
