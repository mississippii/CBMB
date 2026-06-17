package org.example.dto;

import java.math.BigDecimal;

public record CreateSaleRequest(
        Long wholesalerCustomerId,
        String customerName,
        String customerPhone,
        /**
         * Single-line sale (back-compat). When {@code lines} is supplied and non-empty these
         * top-level product fields are ignored.
         */
        Long inventoryId,
        BigDecimal quantity,
        /**
         * Optional. When &gt; 0, the line is priced per kg: line_total = saleWeightKg × unitPrice.
         * When null, the line is priced per pack: line_total = quantity × unitPrice.
         * Inventory deduction always uses {@code quantity} (pack count).
         */
        BigDecimal saleWeightKg,
        BigDecimal unitPrice,
        /**
         * Multi-line sale: one customer buying several products, possibly from different suppliers,
         * in a single atomic sale. Each line is its own inventory/quantity/price; the sale-level
         * discount is allocated across lines pro-rata to keep per-supplier accounting correct.
         */
        java.util.List<SaleLine> lines,
        BigDecimal discountAmount,
        BigDecimal paymentAmount,
        /** Legacy single-crate lend (one type). Kept for back-compat; prefer {@code crateLines}. */
        String crateType,
        Integer cratesGiven,
        /** How the at-sale product payment was made (CASH / BANK / BKASH / NAGAD / OTHER). */
        String paymentMethod,
        /**
         * Crates moved together with this sale, processed in the SAME transaction so the whole
         * sale is atomic. For a permanent customer these are BORROWED (quantity only, plus the
         * optional {@code crateDeposit}); for a walk-in (one-time) customer they are SOLD
         * (each line carries its own {@code unitSalePrice}, paid via {@code cratePaymentMethod}).
         */
        java.util.List<CrateOpLine> crateLines,
        /** Refundable deposit taken against borrowed crates (permanent customer only). */
        BigDecimal crateDeposit,
        /** How a walk-in's crate sale was paid (CASH lands in the drawer). Defaults to CASH. */
        String cratePaymentMethod,
        String note
) {
    /** One product line in a multi-line sale. Pricing mirrors the single-line fields. */
    public record SaleLine(
            Long inventoryId,
            BigDecimal quantity,
            BigDecimal saleWeightKg,
            BigDecimal unitPrice
    ) {
    }
}
