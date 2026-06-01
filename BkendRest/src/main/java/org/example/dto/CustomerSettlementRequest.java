package org.example.dto;

import java.math.BigDecimal;
import java.util.List;
import org.example.model.enums.PaymentMethod;

public record CustomerSettlementRequest(
        Long wholesalerCustomerId,
        BigDecimal cashAmount,
        List<CrateLineRequest> crateReturns,
        PaymentMethod paymentMethod,
        String note
) {
}
