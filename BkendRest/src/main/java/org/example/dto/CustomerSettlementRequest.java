package org.example.dto;

import java.math.BigDecimal;
import java.util.List;
import org.example.model.enums.PaymentMethod;

public record CustomerSettlementRequest(
        Long wholesalerCustomerId,
        BigDecimal cashAmount,
        List<CrateLineRequest> crateReturns,
        /** Optional crate-deposit money to refund with this return (cash out, capped at held). */
        BigDecimal depositRefund,
        PaymentMethod paymentMethod,
        String note
) {
}
