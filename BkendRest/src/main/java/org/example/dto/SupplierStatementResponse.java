package org.example.dto;

import java.math.BigDecimal;

/**
 * Running supplier statement for a period (today / shipment / all).
 *
 * Net payable is the sale-side balance only:
 *   netPayable = totalSale - commission - productPaid
 *
 * Other expenses the wholesaler fronted are tracked as a SEPARATE receivable from
 * the supplier. They are NOT deducted from the net payable up front; the outstanding
 * amount (expenseDue) only goes down as the supplier pays it back (expense-receive):
 *   expenseDue = expenseTotal - expenseReceived
 */
public record SupplierStatementResponse(
        String period,
        BigDecimal totalSale,
        BigDecimal commission,
        BigDecimal productPaid,
        BigDecimal netPayable,
        BigDecimal expenseTotal,
        BigDecimal expenseReceived,
        BigDecimal expenseDue
) {
}
