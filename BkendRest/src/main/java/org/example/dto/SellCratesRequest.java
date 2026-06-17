package org.example.dto;

import java.math.BigDecimal;

/**
 * Sell crates (capital asset). Cost basis is taken from the wholesaler's
 * current weighted-average crate cost; only the gain/loss flows to P&L.
 *
 *   - crateType: BANGLA / CHINA
 *   - quantity: positive crate count
 *   - unitSalePrice: price per crate for THIS sale (BDT, &gt;= 0)
 *   - customerAccountId: WholesalerCustomer.id to charge (DEBIT). NULL = walk-in cash sale:
 *                        no party ledger entry, just record the SOLD movement and capture
 *                        the cash amount in the transaction description.
 *   - note: free-text note for the box_ledger / account_ledger rows
 */
public record SellCratesRequest(
        String crateType,
        Integer quantity,
        BigDecimal unitSalePrice,
        Long customerAccountId,
        String note,
        /**
         * Walk-in sales only: how the buyer paid. "CASH" lands in the Cash Book drawer;
         * bank/bKash/etc. do not. Ignored for on-account (permanent customer) sales, which
         * raise a receivable instead of taking cash. Defaults to CASH when omitted.
         */
        String paymentMethod,
        /** Optional multi-type lines (each with its own unitSalePrice). When non-empty, used instead of the single fields. */
        java.util.List<CrateOpLine> lines,
        /** Internal: sale that triggered this crate movement. Null for standalone crate sales. */
        Long saleId
) {
}
