package org.example.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record PaymentCancellationResponse(
        Long paymentId,
        Long settlementId,
        String status,
        Long wholesalerCustomerId,
        Long wholesalerSupplierId,
        BigDecimal customerBalanceAfter,
        BigDecimal supplierBalanceAfter,
        Integer cratesReinstated,
        BigDecimal jamanotReinstated,
        Long cancellationTransactionId,
        LocalDateTime cancelledAt
) {
}
