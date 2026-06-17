package org.example.dto;

import java.math.BigDecimal;

/**
 * Running supplier statement for a period (today / shipment / all).
 *
 * Net payable is the sale-side balance only:
 *   netPayable = totalSale - commission - productPaid
 *
 * Expenses the wholesaler fronted on the supplier's behalf are shown separately as
 * the outstanding {@code expenseDue} (= {@code expenseTotal}). Commission and these
 * expenses are deductions from the supplier's net due — never cash received back.
 */
public record SupplierStatementResponse(
        String period,
        BigDecimal totalSale,
        BigDecimal commission,
        BigDecimal productPaid,
        BigDecimal netPayable,
        BigDecimal expenseTotal,
        BigDecimal expenseDue
) {
}
