package org.example.dto;

import java.math.BigDecimal;
import java.util.List;

public record CrateRefundRequest(
        List<CrateOpLine> lines,
        BigDecimal refundAmount,
        String paymentMethod,
        String note
) {
}
