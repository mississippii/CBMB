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
        /** Crate lent with this sale (one type per sale). Optional — null/blank means no crates. */
        String crateType,
        Integer cratesGiven,
        /** How the at-sale payment was made (CASH / BANK / BKASH / NAGAD / OTHER). */
        String paymentMethod,
        String note
) {
}
