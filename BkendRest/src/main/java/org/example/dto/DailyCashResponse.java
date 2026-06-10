package org.example.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * A day's cash book — both sides of the drawer.
 *
 *   expectedClosing = openingCash + totalIn − totalOut
 *   variance        = countedCash − expectedClosing   (null until counted)
 *
 * A zero variance means the physical cash matches the books.
 */
public record DailyCashResponse(
        LocalDate date,
        String status,                 // OPEN (not yet closed) or CLOSED
        Sales sales,
        BigDecimal openingCash,
        Inflow inflow,
        Outflow outflow,
        BigDecimal totalIn,
        BigDecimal totalOut,
        BigDecimal netMovement,        // totalIn − totalOut
        BigDecimal expectedClosing,
        BigDecimal countedCash,        // null until the day is closed
        BigDecimal variance,           // null until the day is closed
        List<CategoryLine> shopExpenseBreakdown,
        LocalDateTime closedAt,
        String note
) {
    /**
     * The day's gross sales picture, before cash/non-cash split:
     *   totalSold = cashAtSale + dueCreated
     *   supplierShare = totalSold − commissionEarned  (product money owed to suppliers)
     * dueCreated is the receivable that stays on customers; it is NOT drawer cash.
     */
    public record Sales(
            BigDecimal totalSold,
            BigDecimal cashAtSale,
            BigDecimal dueCreated,
            BigDecimal commissionEarned,
            BigDecimal supplierShare,
            long saleCount
    ) {
    }

    /** Cash that came into the drawer. */
    public record Inflow(
            BigDecimal cashSales,
            BigDecimal customerCollections,
            BigDecimal commissionReceived,
            BigDecimal expenseReimbursed
    ) {
    }

    /** Cash that left the drawer. */
    public record Outflow(
            BigDecimal supplierPayments,
            BigDecimal supplierAdvances,
            BigDecimal shipmentExpenses,
            BigDecimal shopExpenses
    ) {
    }

    public record CategoryLine(String category, BigDecimal amount) {
    }
}
