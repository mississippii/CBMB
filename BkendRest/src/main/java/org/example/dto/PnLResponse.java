package org.example.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Accrual-basis income statement for a wholesaler over a period.
 *
 * Income lines:
 *   - commissionEarned: sum of shipment commission income for everything sold in the period
 *     (live shipment rate × sold units — same source as SalesAggregateService).
 *
 * Expense lines:
 *   - shopExpenses: posted shop-overhead expenses in the period.
 *   - crateLossAbsorbed: lost/damaged crates that no party compensated (qty × unit cost
 *     snapshotted at time of loss). Compensated losses are not here — they're receivables.
 *
 * netProfit = totalIncome − totalExpenses
 *
 * `prior` is the same shape for the matching previous period if compareToPrior=true.
 */
public record PnLResponse(
        String period,
        LocalDateTime from,
        LocalDateTime to,
        Income income,
        Expenses expenses,
        BigDecimal totalIncome,
        BigDecimal totalExpenses,
        BigDecimal netProfit,
        PnLResponse prior
) {
    public record Income(
            BigDecimal commissionEarned,
            List<NamedAmount> bySupplier,
            /** Net profit from crate sales: sum(qty × (unitSalePrice − unitCostSnapshot)) over the period. */
            BigDecimal crateSalesNet,
            BigDecimal total
    ) {
    }

    public record Expenses(
            BigDecimal shopExpenses,
            List<NamedAmount> shopByCategory,
            BigDecimal crateLossAbsorbed,
            BigDecimal total
    ) {
    }

    public record NamedAmount(Long id, String name, BigDecimal amount) {
    }
}
