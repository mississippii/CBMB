package org.example.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import org.example.dto.CloseCashDayRequest;
import org.example.dto.DailyCashResponse;
import org.example.dto.SalesAggregateRequest;
import org.example.dto.SalesAggregateResponse;
import org.example.exception.BadRequestException;
import org.example.model.CashReconciliation;
import org.example.model.Wholesaler;
import org.example.model.enums.CashDayStatus;
import org.example.model.enums.SettlementType;
import org.example.repository.BoxLedgerRepository;
import org.example.repository.CashReconciliationRepository;
import org.example.repository.PaymentRepository;
import org.example.repository.SaleRepository;
import org.example.repository.ShopExpenseRepository;
import org.example.repository.SupplierExpenseRepository;
import org.example.repository.SupplierSettlementRepository;
import org.example.repository.WholesalerRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Day-end cash drawer reconciliation ("cash book").
 *
 * The shop's only money source is cash sales; from that drawer the wholesaler
 * pays suppliers, advances and shop overheads. This service totals one day's
 * CASH debits (in) and credits (out), carries the opening float forward from the
 * previous closed day, and compares the expected closing against the physically
 * counted cash so both sides must match.
 *
 * Only the float, the counted cash and the close decision are persisted — every
 * movement is derived live so the book can never drift from its source data.
 */
@Service
public class CashReconciliationService {

    private final WholesalerRepository wholesalerRepository;
    private final CashReconciliationRepository reconciliationRepository;
    private final SaleRepository saleRepository;
    private final PaymentRepository paymentRepository;
    private final SupplierSettlementRepository supplierSettlementRepository;
    private final ShopExpenseRepository shopExpenseRepository;
    private final SupplierExpenseRepository supplierExpenseRepository;
    private final BoxLedgerRepository boxLedgerRepository;
    private final SalesAggregateService salesAggregateService;

    public CashReconciliationService(
            WholesalerRepository wholesalerRepository,
            CashReconciliationRepository reconciliationRepository,
            SaleRepository saleRepository,
            PaymentRepository paymentRepository,
            SupplierSettlementRepository supplierSettlementRepository,
            ShopExpenseRepository shopExpenseRepository,
            SupplierExpenseRepository supplierExpenseRepository,
            BoxLedgerRepository boxLedgerRepository,
            SalesAggregateService salesAggregateService
    ) {
        this.wholesalerRepository = wholesalerRepository;
        this.reconciliationRepository = reconciliationRepository;
        this.saleRepository = saleRepository;
        this.paymentRepository = paymentRepository;
        this.supplierSettlementRepository = supplierSettlementRepository;
        this.shopExpenseRepository = shopExpenseRepository;
        this.supplierExpenseRepository = supplierExpenseRepository;
        this.boxLedgerRepository = boxLedgerRepository;
        this.salesAggregateService = salesAggregateService;
    }

    @Transactional(readOnly = true)
    public DailyCashResponse daily(Long wholesalerId, LocalDate date) {
        findWholesaler(wholesalerId);
        LocalDate businessDate = date == null ? LocalDate.now() : date;
        CashReconciliation row = reconciliationRepository
                .findByWholesaler_IdAndBusinessDate(wholesalerId, businessDate)
                .orElse(null);
        return build(wholesalerId, businessDate, row);
    }

    @Transactional
    public DailyCashResponse close(Long wholesalerId, CloseCashDayRequest request) {
        Wholesaler wholesaler = findWholesaler(wholesalerId);
        if (request == null || request.countedCash() == null) {
            throw new BadRequestException("Counted cash is required to close the day.");
        }
        BigDecimal counted = money(request.countedCash());
        if (counted.signum() < 0) {
            throw new BadRequestException("Counted cash cannot be negative.");
        }
        LocalDate businessDate = request.date() == null ? LocalDate.now() : request.date();
        if (businessDate.isAfter(LocalDate.now())) {
            throw new BadRequestException("Cannot close a future day.");
        }

        CashReconciliation row = reconciliationRepository
                .findByWholesaler_IdAndBusinessDate(wholesalerId, businessDate)
                .orElseGet(() -> {
                    CashReconciliation r = new CashReconciliation();
                    r.setWholesaler(wholesaler);
                    r.setBusinessDate(businessDate);
                    return r;
                });

        BigDecimal opening = request.openingCash() != null
                ? money(request.openingCash())
                : computeOpening(wholesalerId, businessDate);
        row.setOpeningCash(opening);
        row.setCountedCash(counted);
        row.setNote(clean(request.note()));
        row.setStatus(CashDayStatus.CLOSED);
        row.setClosedAt(LocalDateTime.now());
        CashReconciliation saved = reconciliationRepository.save(row);

        return build(wholesalerId, businessDate, saved);
    }

    @Transactional
    public DailyCashResponse reopen(Long wholesalerId, LocalDate date) {
        findWholesaler(wholesalerId);
        LocalDate businessDate = date == null ? LocalDate.now() : date;
        CashReconciliation row = reconciliationRepository
                .findByWholesaler_IdAndBusinessDate(wholesalerId, businessDate)
                .orElseThrow(() -> new BadRequestException("This day has not been closed."));
        row.setStatus(CashDayStatus.OPEN);
        row.setClosedAt(null);
        reconciliationRepository.save(row);
        return build(wholesalerId, businessDate, row);
    }

    // ── internals ───────────────────────────────────────────────────────────

    private DailyCashResponse build(Long wholesalerId, LocalDate businessDate, CashReconciliation row) {
        LocalDateTime from = businessDate.atStartOfDay();
        LocalDateTime to = businessDate.plusDays(1).atStartOfDay();

        // Gross sales picture for the day (all payment methods): total sold = cash + due.
        SalesAggregateResponse.Summary salesSummary = salesAggregateService.aggregate(
                wholesalerId,
                new SalesAggregateRequest(from, to, null, null, null, null, "shipment")
        ).summary();
        BigDecimal totalSold = money(salesSummary.totalSold());
        BigDecimal commissionEarned = money(salesSummary.commissionEarned());
        DailyCashResponse.Sales sales = new DailyCashResponse.Sales(
                totalSold,
                money(salesSummary.cashAtSale()),
                money(salesSummary.dueCreated()),
                commissionEarned,
                money(totalSold.subtract(commissionEarned)),
                salesSummary.saleCount()
        );

        BigDecimal cashSales = money(saleRepository.sumCashPaidInPeriod(wholesalerId, from, to));
        // Walk-in crate sales: the gross sale price enters the drawer the same day.
        BigDecimal crateCashSales = money(boxLedgerRepository.sumWalkInCrateCashSales(wholesalerId, from, to));
        BigDecimal customerCollections = money(paymentRepository.sumCashAmountInPeriod(wholesalerId, from, to));

        BigDecimal supplierPayments = money(supplierSettlementRepository
                .sumAmountByTypeInPeriod(wholesalerId, SettlementType.PRODUCT_PAYMENT, from, to));
        BigDecimal shipmentExpenses = money(supplierExpenseRepository
                .sumWholesalerFrontedInPeriod(wholesalerId, from, to));

        List<DailyCashResponse.CategoryLine> breakdown = new ArrayList<>();
        BigDecimal shopExpenses = BigDecimal.ZERO;
        for (Object[] r : shopExpenseRepository.sumByCategoryCashInPeriod(wholesalerId, from, to)) {
            String name = (String) r[0];
            BigDecimal amount = money((BigDecimal) r[1]);
            breakdown.add(new DailyCashResponse.CategoryLine(name, amount));
            shopExpenses = shopExpenses.add(amount);
        }

        BigDecimal totalIn = money(cashSales.add(crateCashSales).add(customerCollections));
        BigDecimal totalOut = money(supplierPayments.add(shipmentExpenses).add(shopExpenses));
        BigDecimal netMovement = money(totalIn.subtract(totalOut));

        BigDecimal opening = row != null
                ? money(row.getOpeningCash())
                : computeOpening(wholesalerId, businessDate);
        BigDecimal expectedClosing = money(opening.add(netMovement));

        BigDecimal counted = row == null ? null : row.getCountedCash();
        BigDecimal variance = counted == null ? null : money(counted.subtract(expectedClosing));
        String status = row == null ? CashDayStatus.OPEN.name() : row.getStatus().name();

        return new DailyCashResponse(
                businessDate,
                status,
                sales,
                opening,
                new DailyCashResponse.Inflow(cashSales, crateCashSales, customerCollections),
                new DailyCashResponse.Outflow(supplierPayments, shipmentExpenses, shopExpenses),
                totalIn,
                totalOut,
                netMovement,
                expectedClosing,
                counted,
                variance,
                breakdown,
                row == null ? null : row.getClosedAt(),
                row == null ? null : row.getNote()
        );
    }

    /** Opening float = the most recent closed day's counted cash, else zero. */
    private BigDecimal computeOpening(Long wholesalerId, LocalDate businessDate) {
        return reconciliationRepository
                .findFirstByWholesaler_IdAndBusinessDateLessThanOrderByBusinessDateDesc(wholesalerId, businessDate)
                .map(prev -> prev.getCountedCash() != null ? prev.getCountedCash() : BigDecimal.ZERO)
                .map(CashReconciliationService::money)
                .orElse(BigDecimal.ZERO);
    }

    private Wholesaler findWholesaler(Long wholesalerId) {
        if (wholesalerId == null) {
            throw new BadRequestException("Wholesaler id is required.");
        }
        return wholesalerRepository.findById(wholesalerId)
                .orElseThrow(() -> new BadRequestException("Wholesaler not found."));
    }

    private static BigDecimal money(BigDecimal value) {
        return (value == null ? BigDecimal.ZERO : value).setScale(2, RoundingMode.HALF_UP);
    }

    private static String clean(String value) {
        return value == null ? null : value.trim();
    }
}
