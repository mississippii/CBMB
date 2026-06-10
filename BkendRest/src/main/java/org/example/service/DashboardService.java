package org.example.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.example.dto.DashboardSummaryRequest;
import org.example.dto.DashboardSummaryResponse;
import org.example.dto.SalesAggregateRequest;
import org.example.dto.SalesAggregateResponse;
import org.example.exception.BadRequestException;
import org.example.model.enums.PartyType;
import org.example.model.enums.SettlementType;
import org.example.repository.AccountBalanceRepository;
import org.example.repository.PaymentRepository;
import org.example.repository.ShopExpenseRepository;
import org.example.repository.SupplierDeliveryRepository;
import org.example.repository.SupplierSettlementRepository;
import org.example.repository.WholesalerRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * One consolidated payload for the wholesaler's home screen:
 *   sales     — period sale rollup (gross / cash / due / count)
 *   moneyIn   — period inflows (customer settlements + supplier commission/expense receive)
 *   moneyOut  — period outflows (supplier product payments)
 *   totals    — point-in-time balance rollups (NOT period-bound)
 *   topShipments — top sellers in the period
 *
 * Supported presets for {@code period}: today / week / month / year / custom (with from+to).
 * When period is null or "all", date range is unbounded.
 */
@Service
public class DashboardService {

    private static final int DEFAULT_TOP_SHIPMENTS = 5;

    private final WholesalerRepository wholesalerRepository;
    private final SalesAggregateService salesAggregateService;
    private final PaymentRepository paymentRepository;
    private final SupplierSettlementRepository supplierSettlementRepository;
    private final AccountBalanceRepository accountBalanceRepository;
    private final SupplierDeliveryRepository supplierDeliveryRepository;
    private final ShopExpenseRepository shopExpenseRepository;

    public DashboardService(
            WholesalerRepository wholesalerRepository,
            SalesAggregateService salesAggregateService,
            PaymentRepository paymentRepository,
            SupplierSettlementRepository supplierSettlementRepository,
            AccountBalanceRepository accountBalanceRepository,
            SupplierDeliveryRepository supplierDeliveryRepository,
            ShopExpenseRepository shopExpenseRepository
    ) {
        this.wholesalerRepository = wholesalerRepository;
        this.salesAggregateService = salesAggregateService;
        this.paymentRepository = paymentRepository;
        this.supplierSettlementRepository = supplierSettlementRepository;
        this.accountBalanceRepository = accountBalanceRepository;
        this.supplierDeliveryRepository = supplierDeliveryRepository;
        this.shopExpenseRepository = shopExpenseRepository;
    }

    @Transactional(readOnly = true)
    public DashboardSummaryResponse summary(Long wholesalerId, DashboardSummaryRequest request) {
        if (wholesalerId == null || !wholesalerRepository.existsById(wholesalerId)) {
            throw new BadRequestException("Wholesaler not found.");
        }
        DashboardSummaryRequest req = request == null ? new DashboardSummaryRequest(null, null, null, null) : request;
        PeriodRange range = resolvePeriod(req.period(), req.from(), req.to());
        int topN = req.topShipmentLimit() == null || req.topShipmentLimit() <= 0
                ? DEFAULT_TOP_SHIPMENTS
                : Math.min(req.topShipmentLimit(), 50);

        SalesAggregateResponse salesAgg = salesAggregateService.aggregate(
                wholesalerId,
                new SalesAggregateRequest(range.from, range.to, null, null, null, null, "shipment")
        );

        DashboardSummaryResponse.Sales sales = new DashboardSummaryResponse.Sales(
                salesAgg.summary().totalSold(),
                salesAgg.summary().cashAtSale(),
                salesAgg.summary().dueCreated(),
                salesAgg.summary().saleCount()
        );

        BigDecimal customerPayments = money(paymentRepository.sumCashAmountInPeriod(wholesalerId, range.from, range.to));
        BigDecimal productPay = money(supplierSettlementRepository.sumAmountByTypeInPeriod(wholesalerId, SettlementType.PRODUCT_PAYMENT, range.from, range.to));
        BigDecimal shopExpenses = money(shopExpenseRepository.sumInPeriod(wholesalerId, range.from, range.to));
        DashboardSummaryResponse.MoneyIn moneyIn = new DashboardSummaryResponse.MoneyIn(
                customerPayments, customerPayments
        );
        DashboardSummaryResponse.MoneyOut moneyOut = new DashboardSummaryResponse.MoneyOut(
                productPay, shopExpenses, money(productPay.add(shopExpenses))
        );
        BigDecimal commissionEarned = money(salesAgg.summary().commissionEarned());
        DashboardSummaryResponse.Profit profit = new DashboardSummaryResponse.Profit(
                commissionEarned, shopExpenses, money(commissionEarned.subtract(shopExpenses))
        );

        DashboardSummaryResponse.Totals totals = new DashboardSummaryResponse.Totals(
                money(accountBalanceRepository.sumPositiveBalances(wholesalerId, PartyType.WHOLESALER_CUSTOMER)),
                money(accountBalanceRepository.sumPositiveBalances(wholesalerId, PartyType.WHOLESALER_SUPPLIER)),
                money(accountBalanceRepository.sumNegativeBalancesAbs(wholesalerId, PartyType.WHOLESALER_SUPPLIER)),
                money(accountBalanceRepository.sumNegativeBalancesAbs(wholesalerId, PartyType.WHOLESALER_CUSTOMER))
        );

        List<DashboardSummaryResponse.ShipmentRow> topShipments = new ArrayList<>();
        salesAgg.groups().stream().limit(topN).forEach(g -> {
            if (g.id() == null) {
                topShipments.add(new DashboardSummaryResponse.ShipmentRow(
                        null, "Unassigned", null, null, g.totalSold(), null
                ));
                return;
            }
            supplierDeliveryRepository.findById(g.id()).ifPresent(d -> topShipments.add(
                    new DashboardSummaryResponse.ShipmentRow(
                            d.getId(), d.getName(),
                            d.getWholesalerSupplier().getId(),
                            d.getWholesalerSupplier().getSupplier().getName(),
                            g.totalSold(),
                            d.getCommissionRate()
                    )
            ));
        });

        return new DashboardSummaryResponse(
                range.label, range.from, range.to,
                sales, moneyIn, moneyOut, totals, profit, topShipments
        );
    }

    private static PeriodRange resolvePeriod(String period, LocalDateTime from, LocalDateTime to) {
        String key = period == null ? "all" : period.trim().toLowerCase(Locale.ROOT);
        LocalDateTime now = LocalDateTime.now();
        return switch (key) {
            case "today" -> new PeriodRange("today", LocalDate.now().atStartOfDay(), LocalDate.now().plusDays(1).atStartOfDay());
            case "week" -> new PeriodRange("week", now.minusDays(7), now);
            case "month" -> new PeriodRange("month", LocalDate.now().withDayOfMonth(1).atStartOfDay(), now);
            case "year" -> new PeriodRange("year", LocalDate.now().withDayOfYear(1).atStartOfDay(), now);
            case "custom" -> {
                if (from == null || to == null) {
                    throw new BadRequestException("period=custom requires both from and to.");
                }
                if (!from.isBefore(to)) {
                    throw new BadRequestException("from must be before to.");
                }
                yield new PeriodRange("custom", from, to);
            }
            case "all" -> new PeriodRange("all", null, null);
            default -> throw new BadRequestException("Invalid period. Allowed: today, week, month, year, custom, all.");
        };
    }

    private static BigDecimal money(BigDecimal value) {
        return (value == null ? BigDecimal.ZERO : value).setScale(2, RoundingMode.HALF_UP);
    }

    private record PeriodRange(String label, LocalDateTime from, LocalDateTime to) {
    }
}
