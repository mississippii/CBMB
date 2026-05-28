package org.example.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.example.dto.PnLRequest;
import org.example.dto.PnLResponse;
import org.example.dto.SalesAggregateRequest;
import org.example.dto.SalesAggregateResponse;
import org.example.exception.BadRequestException;
import org.example.repository.BoxLedgerRepository;
import org.example.repository.ShopExpenseRepository;
import org.example.repository.WholesalerRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Accrual-basis P&L for a wholesaler. Reuses SalesAggregateService for commission income
 * (the source of truth for shipment-wise commission), ShopExpenseRepository for overhead,
 * and BoxLedgerRepository for uncompensated crate losses.
 *
 * Period semantics match DashboardService: today / week / month / year / custom / all.
 * compareToPrior=true returns the same-length prior period as `prior` on the response.
 */
@Service
public class ProfitLossService {

    private final WholesalerRepository wholesalerRepository;
    private final SalesAggregateService salesAggregateService;
    private final ShopExpenseRepository shopExpenseRepository;
    private final BoxLedgerRepository boxLedgerRepository;

    public ProfitLossService(
            WholesalerRepository wholesalerRepository,
            SalesAggregateService salesAggregateService,
            ShopExpenseRepository shopExpenseRepository,
            BoxLedgerRepository boxLedgerRepository
    ) {
        this.wholesalerRepository = wholesalerRepository;
        this.salesAggregateService = salesAggregateService;
        this.shopExpenseRepository = shopExpenseRepository;
        this.boxLedgerRepository = boxLedgerRepository;
    }

    @Transactional(readOnly = true)
    public PnLResponse generate(Long wholesalerId, PnLRequest request) {
        if (wholesalerId == null || !wholesalerRepository.existsById(wholesalerId)) {
            throw new BadRequestException("Wholesaler not found.");
        }
        PnLRequest req = request == null ? new PnLRequest(null, null, null, false) : request;
        PeriodRange range = resolvePeriod(req.period(), req.from(), req.to());

        PnLResponse current = buildOne(wholesalerId, range);

        PnLResponse prior = null;
        if (Boolean.TRUE.equals(req.compareToPrior()) && range.from != null && range.to != null) {
            PeriodRange priorRange = shiftBackByLength(range);
            prior = buildOne(wholesalerId, priorRange);
        }

        return new PnLResponse(
                current.period(), current.from(), current.to(),
                current.income(), current.expenses(),
                current.totalIncome(), current.totalExpenses(), current.netProfit(),
                prior
        );
    }

    private PnLResponse buildOne(Long wholesalerId, PeriodRange range) {
        // Commission earned (with supplier breakdown).
        SalesAggregateResponse bySupplier = salesAggregateService.aggregate(
                wholesalerId,
                new SalesAggregateRequest(range.from, range.to, null, null, null, null, "supplier")
        );
        BigDecimal commissionEarned = money(bySupplier.summary().commissionEarned());

        List<PnLResponse.NamedAmount> supplierRows = new ArrayList<>();
        for (SalesAggregateResponse.Group g : bySupplier.groups()) {
            if (g.commissionEarned() != null && g.commissionEarned().signum() > 0) {
                supplierRows.add(new PnLResponse.NamedAmount(g.id(), g.name(), money(g.commissionEarned())));
            }
        }

        // Shop expenses (with category breakdown).
        BigDecimal shopExpenses = money(shopExpenseRepository.sumInPeriod(wholesalerId, range.from, range.to));
        List<Object[]> catRows = shopExpenseRepository.sumByCategoryInPeriod(wholesalerId, range.from, range.to);
        List<PnLResponse.NamedAmount> categoryRows = new ArrayList<>();
        for (Object[] r : catRows) {
            Long id = r[0] == null ? null : ((Number) r[0]).longValue();
            String name = r[1] == null ? "Uncategorised" : r[1].toString();
            BigDecimal amount = money(toBd(r[2]));
            categoryRows.add(new PnLResponse.NamedAmount(id, name, amount));
        }

        // Uncompensated crate losses.
        BigDecimal crateLoss = money(boxLedgerRepository.sumUncompensatedLossValue(
                wholesalerId, range.from, range.to));

        // Net profit from crate sales (capital-asset disposal — only gain/loss hits P&L).
        BigDecimal crateSalesNet = money(boxLedgerRepository.sumCrateSalesNetProfit(
                wholesalerId, range.from, range.to));

        BigDecimal incomeTotal = money(commissionEarned.add(crateSalesNet));
        PnLResponse.Income income = new PnLResponse.Income(commissionEarned, supplierRows, crateSalesNet, incomeTotal);
        PnLResponse.Expenses expenses = new PnLResponse.Expenses(
                shopExpenses, categoryRows, crateLoss, money(shopExpenses.add(crateLoss))
        );
        BigDecimal totalIncome = income.total();
        BigDecimal totalExpenses = expenses.total();
        BigDecimal net = money(totalIncome.subtract(totalExpenses));

        return new PnLResponse(
                range.label, range.from, range.to,
                income, expenses,
                totalIncome, totalExpenses, net,
                null
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

    /** Build a prior-period range of the same length, ending at {@code current.from}. */
    private static PeriodRange shiftBackByLength(PeriodRange current) {
        long minutes = ChronoUnit.MINUTES.between(current.from, current.to);
        LocalDateTime priorTo = current.from;
        LocalDateTime priorFrom = priorTo.minusMinutes(minutes);
        return new PeriodRange("prior-" + current.label, priorFrom, priorTo);
    }

    private static BigDecimal money(BigDecimal value) {
        return (value == null ? BigDecimal.ZERO : value).setScale(2, RoundingMode.HALF_UP);
    }

    private static BigDecimal toBd(Object value) {
        if (value == null) return BigDecimal.ZERO;
        if (value instanceof BigDecimal bd) return bd;
        if (value instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
        return BigDecimal.ZERO;
    }

    private record PeriodRange(String label, LocalDateTime from, LocalDateTime to) {
    }
}
