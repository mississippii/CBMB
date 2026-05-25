package org.example.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record SaleCancellationResponse(
        Long saleId,
        String status,
        Long wholesalerCustomerId,
        BigDecimal customerBalanceAfter,
        BigDecimal supplierBalanceAfter,
        Long wholesalerSupplierId,
        Integer cratesReturned,
        BigDecimal jamanotReturned,
        Long cancellationTransactionId,
        LocalDateTime cancelledAt
) {
}
