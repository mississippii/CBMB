package org.example.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record DashboardSummaryResponse(
        String period,
        LocalDateTime from,
        LocalDateTime to,
        Sales sales,
        MoneyIn moneyIn,
        MoneyOut moneyOut,
        Totals totals,
        Profit profit,
        List<ShipmentRow> topShipments
) {
    public record Sales(
            BigDecimal totalSold,
            BigDecimal cashAtSale,
            BigDecimal dueCreated,
            long saleCount
    ) {
    }

    public record MoneyIn(
            BigDecimal customerPayments,
            BigDecimal total
    ) {
    }

    public record MoneyOut(
            BigDecimal supplierProductPayments,
            BigDecimal shopExpenses,
            BigDecimal total
    ) {
    }

    /**
     * Period P&L: commission earned (gross income) minus shop overhead.
     * Supplier product payments are NOT a cost — they're paying down a liability
     * that was already booked as supplier-credit at sale time, so they're excluded.
     */
    public record Profit(
            BigDecimal commissionEarned,
            BigDecimal shopExpenses,
            BigDecimal netProfit
    ) {
    }

    public record Totals(
            BigDecimal customersOweYou,
            BigDecimal youOweSuppliers,
            BigDecimal supplierPrepaid,
            BigDecimal customerCreditBalances
    ) {
    }

    public record ShipmentRow(
            Long deliveryId,
            String shipmentName,
            Long wholesalerSupplierId,
            String supplierName,
            BigDecimal totalSold,
            BigDecimal commissionRate
    ) {
    }
}
