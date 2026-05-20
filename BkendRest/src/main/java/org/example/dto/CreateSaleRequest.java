package org.example.dto;

import java.math.BigDecimal;

public record CreateSaleRequest(
        Long wholesalerCustomerId,
        String customerName,
        String customerPhone,
        Long inventoryId,
        BigDecimal quantity,
        BigDecimal unitPrice,
        BigDecimal paymentAmount,
        String crateType,
        Integer cratesGiven,
        Integer banglaCratesGiven,
        Integer chinaCratesGiven,
        BigDecimal jamanotAmount,
        String note
) {
}
