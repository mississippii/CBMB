package org.example.dto;

import java.math.BigDecimal;

public record CreateSaleRequest(
        Long wholesalerCustomerId,
        String customerName,
        String customerPhone,
        Long inventoryId,
        BigDecimal quantity,
        /**
         * Optional. When &gt; 0, the line is priced per kg: line_total = saleWeightKg × unitPrice.
         * When null, the line is priced per pack: line_total = quantity × unitPrice.
         * Inventory deduction always uses {@code quantity} (pack count).
         */
        BigDecimal saleWeightKg,
        BigDecimal unitPrice,
        BigDecimal discountAmount,
        BigDecimal paymentAmount,
        String crateType,
        Integer cratesGiven,
        Integer banglaCratesGiven,
        Integer chinaCratesGiven,
        BigDecimal jamanotAmount,
        String note
) {
}
