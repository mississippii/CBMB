package org.example.dto;

import java.math.BigDecimal;
import org.example.model.enums.PaymentMethod;

public record CustomerSettlementRequest(
        Long wholesalerCustomerId,
        BigDecimal cashAmount,
        Integer banglaCratesReturned,
        Integer chinaCratesReturned,
        BigDecimal jamanotAmount,
        PaymentMethod paymentMethod,
        String note
) {
}
