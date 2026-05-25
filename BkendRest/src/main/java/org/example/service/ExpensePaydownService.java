package org.example.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import org.example.exception.BadRequestException;
import org.example.model.OtherDueBalance;
import org.example.model.SupplierExpense;
import org.example.repository.OtherDueBalanceRepository;
import org.example.repository.SupplierExpenseRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Pays down outstanding supplier-funded expenses when the supplier reimburses the wholesaler.
 * Two callers:
 *   1) PaymentService.receiveSupplierExpense — FIFO across the supplier's outstanding expenses.
 *   2) SupplierDeliveryService.setSettlementStatus — restricted to a single shipment's expenses.
 *
 * Without this, SupplierExpense.dueAmount and other_due_balances.due_amount only ever grow
 * (settlements are recorded but nothing decrements the source rows). The audit endpoint
 * reports both as drift.
 */
@Service
public class ExpensePaydownService {

    private final SupplierExpenseRepository supplierExpenseRepository;
    private final OtherDueBalanceRepository otherDueBalanceRepository;

    public ExpensePaydownService(SupplierExpenseRepository supplierExpenseRepository,
                                 OtherDueBalanceRepository otherDueBalanceRepository) {
        this.supplierExpenseRepository = supplierExpenseRepository;
        this.otherDueBalanceRepository = otherDueBalanceRepository;
    }

    /**
     * Applies {@code amount} against the supplier's outstanding expenses oldest-first.
     * Throws BadRequestException if the amount exceeds total outstanding due — the caller
     * should validate via {@link #outstandingForSupplier} first to give a friendlier message.
     */
    @Transactional
    public void payDownForSupplier(Long wholesalerId, Long supplierAccountId, BigDecimal amount) {
        if (amount == null || amount.signum() <= 0) {
            return;
        }
        List<SupplierExpense> outstanding = supplierExpenseRepository.findOutstandingBySupplier(wholesalerId, supplierAccountId);
        applyFifo(outstanding, amount);
    }

    /**
     * Same as {@link #payDownForSupplier} but limited to a single shipment's expenses.
     */
    @Transactional
    public void payDownForDelivery(Long deliveryId, BigDecimal amount) {
        if (amount == null || amount.signum() <= 0) {
            return;
        }
        List<SupplierExpense> outstanding = supplierExpenseRepository.findByDelivery_Id(deliveryId).stream()
                .filter(e -> e.getDueAmount() != null && e.getDueAmount().signum() > 0)
                .sorted((a, b) -> a.getExpenseDate().compareTo(b.getExpenseDate()))
                .toList();
        applyFifo(outstanding, amount);
    }

    @Transactional(readOnly = true)
    public BigDecimal outstandingForSupplier(Long wholesalerId, Long supplierAccountId) {
        BigDecimal v = supplierExpenseRepository.sumOutstandingBySupplier(wholesalerId, supplierAccountId);
        return money(v == null ? BigDecimal.ZERO : v);
    }

    private void applyFifo(List<SupplierExpense> outstanding, BigDecimal amount) {
        BigDecimal remaining = money(amount);
        for (SupplierExpense expense : outstanding) {
            if (remaining.signum() <= 0) {
                break;
            }
            BigDecimal due = expense.getDueAmount() == null ? BigDecimal.ZERO : expense.getDueAmount();
            if (due.signum() <= 0) {
                continue;
            }
            BigDecimal applied = due.min(remaining);
            BigDecimal paid = expense.getPaidAmount() == null ? BigDecimal.ZERO : expense.getPaidAmount();
            expense.setDueAmount(money(due.subtract(applied)));
            expense.setPaidAmount(money(paid.add(applied)));
            supplierExpenseRepository.save(expense);
            decrementOtherDue(expense, applied);
            remaining = remaining.subtract(applied);
        }
        if (remaining.signum() > 0) {
            throw new BadRequestException("Expense received exceeds outstanding expense due by ৳" + money(remaining).toPlainString() + ".");
        }
    }

    private void decrementOtherDue(SupplierExpense expense, BigDecimal amount) {
        Long wholesalerId = expense.getWholesaler().getId();
        Long supplierId = expense.getWholesalerSupplier().getId();
        Long categoryId = expense.getCategory().getId();
        OtherDueBalance balance = otherDueBalanceRepository
                .findByWholesaler_IdAndWholesalerSupplier_IdAndCategory_Id(wholesalerId, supplierId, categoryId)
                .orElse(null);
        if (balance == null) {
            // Defensive: the row was never created when the expense was logged (older data).
            // Skip — the audit will surface this as drift.
            return;
        }
        BigDecimal cur = balance.getDueAmount() == null ? BigDecimal.ZERO : balance.getDueAmount();
        BigDecimal next = money(cur.subtract(amount));
        if (next.signum() < 0) {
            next = BigDecimal.ZERO;
        }
        balance.setDueAmount(next);
        otherDueBalanceRepository.save(balance);
    }

    private static BigDecimal money(BigDecimal value) {
        return value.setScale(2, RoundingMode.HALF_UP);
    }
}
