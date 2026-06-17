package org.example.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import org.example.dto.CreateExpenseBatchRequest;
import org.example.dto.CreateExpenseRequest;
import org.example.dto.ExpenseCategoryResponse;
import org.example.dto.ExpenseResponse;
import org.example.dto.SupplierStatementResponse;
import org.example.exception.BadRequestException;
import org.example.model.ExpenseCategory;
import org.example.model.OtherDueBalance;
import org.example.model.SupplierExpense;
import org.example.model.Transaction;
import org.example.model.Wholesaler;
import org.example.model.WholesalerSupplier;
import org.example.model.enums.ExpenseCategoryKind;
import org.example.model.enums.RecordStatus;
import org.example.model.enums.SettlementType;
import org.example.model.enums.TransactionType;
import org.example.repository.ExpenseCategoryRepository;
import org.example.repository.OtherDueBalanceRepository;
import org.example.repository.SaleItemRepository;
import org.example.repository.SupplierExpenseRepository;
import org.example.repository.SupplierSettlementRepository;
import org.example.repository.TransactionRepository;
import org.example.repository.WholesalerRepository;
import org.example.repository.WholesalerSupplierRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ExpenseService {

    private static final List<String> DEFAULT_CATEGORIES = List.of("Labour", "Transport", "Others");

    private final WholesalerRepository wholesalerRepository;
    private final WholesalerSupplierRepository wholesalerSupplierRepository;
    private final ExpenseCategoryRepository expenseCategoryRepository;
    private final SupplierExpenseRepository supplierExpenseRepository;
    private final OtherDueBalanceRepository otherDueBalanceRepository;
    private final SaleItemRepository saleItemRepository;
    private final SupplierSettlementRepository supplierSettlementRepository;
    private final TransactionRepository transactionRepository;
    private final org.example.repository.SupplierDeliveryRepository supplierDeliveryRepository;

    public ExpenseService(
            WholesalerRepository wholesalerRepository,
            WholesalerSupplierRepository wholesalerSupplierRepository,
            ExpenseCategoryRepository expenseCategoryRepository,
            SupplierExpenseRepository supplierExpenseRepository,
            OtherDueBalanceRepository otherDueBalanceRepository,
            SaleItemRepository saleItemRepository,
            SupplierSettlementRepository supplierSettlementRepository,
            TransactionRepository transactionRepository,
            org.example.repository.SupplierDeliveryRepository supplierDeliveryRepository
    ) {
        this.wholesalerRepository = wholesalerRepository;
        this.wholesalerSupplierRepository = wholesalerSupplierRepository;
        this.expenseCategoryRepository = expenseCategoryRepository;
        this.supplierExpenseRepository = supplierExpenseRepository;
        this.otherDueBalanceRepository = otherDueBalanceRepository;
        this.saleItemRepository = saleItemRepository;
        this.supplierSettlementRepository = supplierSettlementRepository;
        this.transactionRepository = transactionRepository;
        this.supplierDeliveryRepository = supplierDeliveryRepository;
    }

    @Transactional
    public List<ExpenseCategoryResponse> listCategories(Long wholesalerId) {
        Wholesaler wholesaler = findWholesaler(wholesalerId);
        // Shipment/supplier expenses only — SHOP-only categories are excluded (BOTH still counts).
        List<ExpenseCategory> existing = expenseCategoryRepository
                .findActiveForKind(wholesalerId, ExpenseCategoryKind.SUPPLIER);
        if (existing.isEmpty()) {
            for (String name : DEFAULT_CATEGORIES) {
                ExpenseCategory cat = new ExpenseCategory();
                cat.setWholesaler(wholesaler);
                cat.setName(name);
                cat.setKind(ExpenseCategoryKind.SUPPLIER);
                cat.setStatus(RecordStatus.ACTIVE);
                expenseCategoryRepository.save(cat);
            }
            existing = expenseCategoryRepository.findActiveForKind(wholesalerId, ExpenseCategoryKind.SUPPLIER);
        }
        return existing.stream().map(c -> new ExpenseCategoryResponse(c.getId(), c.getName())).toList();
    }

    @Transactional
    public ExpenseResponse createExpense(Long wholesalerId, CreateExpenseRequest request) {
        Wholesaler wholesaler = findWholesaler(wholesalerId);
        if (request == null || request.wholesalerSupplierId() == null) {
            throw new BadRequestException("Supplier account is required.");
        }
        WholesalerSupplier supplierAccount = resolveSupplier(wholesalerId, request.wholesalerSupplierId());
        org.example.model.SupplierDelivery delivery = resolveDelivery(wholesalerId, supplierAccount, request.deliveryId());

        return recordExpense(wholesaler, supplierAccount, delivery,
                request.categoryId(), request.categoryName(),
                request.amount(), request.paidAmount(), request.note());
    }

    /**
     * Records several expenses for one shipment in a single transaction —
     * either all lines persist or none do.
     */
    @Transactional
    public List<ExpenseResponse> createExpenses(Long wholesalerId, CreateExpenseBatchRequest request) {
        if (request == null || request.wholesalerSupplierId() == null) {
            throw new BadRequestException("Supplier account is required.");
        }
        if (request.lines() == null || request.lines().isEmpty()) {
            throw new BadRequestException("At least one expense line is required.");
        }
        Wholesaler wholesaler = findWholesaler(wholesalerId);
        WholesalerSupplier supplierAccount = resolveSupplier(wholesalerId, request.wholesalerSupplierId());
        org.example.model.SupplierDelivery delivery = resolveDelivery(wholesalerId, supplierAccount, request.deliveryId());

        List<ExpenseResponse> results = new java.util.ArrayList<>(request.lines().size());
        for (CreateExpenseBatchRequest.Line line : request.lines()) {
            results.add(recordExpense(wholesaler, supplierAccount, delivery,
                    line.categoryId(), line.categoryName(),
                    line.amount(), line.paidAmount(), line.note()));
        }
        return results;
    }

    private WholesalerSupplier resolveSupplier(Long wholesalerId, Long supplierAccountId) {
        return wholesalerSupplierRepository
                .findByWholesaler_IdAndId(wholesalerId, supplierAccountId)
                .orElseThrow(() -> new BadRequestException("Supplier account not found."));
    }

    private org.example.model.SupplierDelivery resolveDelivery(
            Long wholesalerId, WholesalerSupplier supplierAccount, Long deliveryId) {
        if (deliveryId == null) {
            return null;
        }
        org.example.model.SupplierDelivery delivery = supplierDeliveryRepository.findById(deliveryId)
                .orElseThrow(() -> new BadRequestException("Shipment not found."));
        if (!delivery.getWholesaler().getId().equals(wholesalerId)
                || !delivery.getWholesalerSupplier().getId().equals(supplierAccount.getId())) {
            throw new BadRequestException("Shipment does not belong to this supplier.");
        }
        return delivery;
    }

    private ExpenseResponse recordExpense(
            Wholesaler wholesaler, WholesalerSupplier supplierAccount,
            org.example.model.SupplierDelivery delivery,
            Long categoryId, String categoryName,
            BigDecimal amountRaw, BigDecimal paidRaw, String note) {
        Long wholesalerId = wholesaler.getId();

        BigDecimal amount = nonNegative(amountRaw, "Expense amount cannot be negative.");
        if (amount.signum() == 0) {
            throw new BadRequestException("Expense amount must be greater than zero.");
        }
        BigDecimal paid = nonNegative(paidRaw, "Paid amount cannot be negative.");
        if (paid.compareTo(amount) > 0) {
            throw new BadRequestException("Supplier-funded amount cannot exceed the expense amount.");
        }
        BigDecimal due = money(amount.subtract(paid));

        ExpenseCategory category = resolveCategory(wholesaler, categoryId, categoryName);

        SupplierExpense expense = new SupplierExpense();
        expense.setWholesaler(wholesaler);
        expense.setWholesalerSupplier(supplierAccount);
        expense.setDelivery(delivery);
        expense.setCategory(category);
        expense.setAmount(amount);
        expense.setPaidAmount(paid);
        expense.setDueAmount(due);
        expense.setNote(clean(note));
        expense.setExpenseDate(LocalDateTime.now());
        SupplierExpense saved = supplierExpenseRepository.save(expense);

        // Roll up the due (what supplier owes wholesaler for this expense category)
        if (due.signum() > 0) {
            OtherDueBalance balance = otherDueBalanceRepository
                    .findByWholesaler_IdAndWholesalerSupplier_IdAndCategory_Id(wholesalerId, supplierAccount.getId(), category.getId())
                    .orElseGet(() -> {
                        OtherDueBalance b = new OtherDueBalance();
                        b.setWholesaler(wholesaler);
                        b.setWholesalerSupplier(supplierAccount);
                        b.setCategory(category);
                        b.setDueAmount(BigDecimal.ZERO);
                        return b;
                    });
            balance.setDueAmount(money(balance.getDueAmount().add(due)));
            otherDueBalanceRepository.save(balance);
        }

        // Transaction record for visibility
        Transaction tx = new Transaction();
        tx.setWholesalerId(wholesalerId);
        tx.setTransactionType(TransactionType.PAYMENT);
        tx.setWholesalerSupplierId(supplierAccount.getId());
        tx.setSaleAmount(BigDecimal.ZERO);
        tx.setPaymentAmount(BigDecimal.ZERO);
        tx.setDueAmount(BigDecimal.ZERO);
        tx.setDescription("Supplier expense — " + category.getName() + " ৳" + amount.toPlainString()
                + (due.signum() > 0 ? " (৳" + due.toPlainString() + " supplier due)" : " (supplier funded)"));
        transactionRepository.save(tx);

        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<ExpenseResponse> listSupplierExpenses(Long wholesalerId, Long supplierAccountId) {
        findWholesaler(wholesalerId);
        return supplierExpenseRepository
                .findByWholesaler_IdAndWholesalerSupplier_IdOrderByExpenseDateDesc(wholesalerId, supplierAccountId)
                .stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public SupplierStatementResponse getStatement(Long wholesalerId, Long supplierAccountId, String period) {
        findWholesaler(wholesalerId);
        WholesalerSupplier account = wholesalerSupplierRepository
                .findByWholesaler_IdAndId(wholesalerId, supplierAccountId)
                .orElseThrow(() -> new BadRequestException("Supplier account not found."));

        String normalized = period == null ? "all" : period.toLowerCase();
        boolean today = "today".equals(normalized);
        LocalDateTime start = today ? LocalDate.now().atStartOfDay() : null;
        LocalDateTime end = today ? start.plusDays(1) : null;

        BigDecimal totalSale = today
                ? zero(saleItemRepository.sumLineTotalBySupplierBetween(wholesalerId, account.getId(), start, end))
                : zero(saleItemRepository.sumLineTotalBySupplier(wholesalerId, account.getId()));

        // Commission is negotiated per shipment, so aggregate it shipment-wise:
        // gross commission = sum over the supplier's lots of (sold value in period * lot rate).
        BigDecimal commissionGross = BigDecimal.ZERO;
        for (org.example.model.SupplierDelivery lot : supplierDeliveryRepository
                .findByWholesaler_IdAndWholesalerSupplier_IdOrderByDeliveryDateDesc(wholesalerId, account.getId())) {
            BigDecimal rate = lot.getCommissionRate();
            if (rate == null || rate.signum() == 0) {
                continue;
            }
            BigDecimal soldInPeriod = today
                    ? zero(saleItemRepository.sumLineTotalByDeliveryBetween(lot.getId(), start, end))
                    : zero(saleItemRepository.sumLineTotalByDelivery(lot.getId()));
            commissionGross = commissionGross.add(soldInPeriod.multiply(rate).divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP));
        }
        // Commission is the full per-lot deduction from the supplier's due.
        BigDecimal commission = commissionGross;

        BigDecimal productPaid = zero(supplierSettlementRepository
                .sumAmountBySupplierAndType(wholesalerId, account.getId(), SettlementType.PRODUCT_PAYMENT));

        // Net payable is the sale-side balance only. Fronted expenses are shown
        // separately as the outstanding expenseDue below.
        BigDecimal netPayable = totalSale.subtract(commission).subtract(productPaid);

        // Expense the wholesaler fronted on the supplier's behalf, still outstanding.
        BigDecimal expenseTotal = zero(otherDueBalanceRepository.sumDueBySupplier(wholesalerId, account.getId()));
        BigDecimal expenseDue = expenseTotal;

        return new SupplierStatementResponse(
                normalized, totalSale, commission, productPaid, netPayable,
                expenseTotal, expenseDue
        );
    }

    private ExpenseCategory resolveCategory(Wholesaler wholesaler, Long categoryId, String categoryName) {
        if (categoryId != null) {
            return expenseCategoryRepository.findByWholesaler_IdAndId(wholesaler.getId(), categoryId)
                    .orElseThrow(() -> new BadRequestException("Expense category not found."));
        }
        String name = clean(categoryName);
        if (name == null || name.isBlank()) {
            throw new BadRequestException("Expense category is required.");
        }
        return expenseCategoryRepository.findByWholesaler_IdAndNameIgnoreCase(wholesaler.getId(), name)
                .orElseGet(() -> {
                    ExpenseCategory cat = new ExpenseCategory();
                    cat.setWholesaler(wholesaler);
                    cat.setName(name);
                    cat.setStatus(RecordStatus.ACTIVE);
                    return expenseCategoryRepository.save(cat);
                });
    }

    private ExpenseResponse toResponse(SupplierExpense e) {
        return new ExpenseResponse(
                e.getId(),
                e.getWholesalerSupplier().getId(),
                e.getDelivery() == null ? null : e.getDelivery().getId(),
                e.getCategory().getId(),
                e.getCategory().getName(),
                e.getAmount(),
                e.getPaidAmount(),
                e.getDueAmount(),
                e.getNote(),
                e.getExpenseDate()
        );
    }

    private Wholesaler findWholesaler(Long wholesalerId) {
        return wholesalerRepository.findById(wholesalerId)
                .orElseThrow(() -> new BadRequestException("Wholesaler not found."));
    }

    private BigDecimal nonNegative(BigDecimal value, String message) {
        BigDecimal v = value == null ? BigDecimal.ZERO : value;
        if (v.signum() < 0) throw new BadRequestException(message);
        return money(v);
    }

    private BigDecimal zero(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }

    private BigDecimal money(BigDecimal value) {
        return (value == null ? BigDecimal.ZERO : value).setScale(0, RoundingMode.CEILING);
    }

    private String clean(String value) {
        return value == null ? null : value.trim();
    }
}
