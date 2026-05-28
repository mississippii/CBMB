package org.example.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import org.example.dto.CreateShopExpenseRequest;
import org.example.dto.ShopExpenseResponse;
import org.example.exception.BadRequestException;
import org.example.model.ExpenseCategory;
import org.example.model.ShopExpense;
import org.example.model.Wholesaler;
import org.example.model.enums.ExpenseCategoryKind;
import org.example.model.enums.PaymentMethod;
import org.example.model.enums.PostStatus;
import org.example.model.enums.RecordStatus;
import org.example.repository.ExpenseCategoryRepository;
import org.example.repository.ShopExpenseRepository;
import org.example.repository.WholesalerRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Shop overhead expenses — costs the wholesaler bears (employee salary, guest
 * hospitality, lunch, rent, utilities). Pure outflow: no party balance changes,
 * no reimbursement. Reduces cash + net profit only.
 *
 * Categories live in expense_categories but are filtered by kind=SHOP (BOTH is
 * also visible) so the shop-expense picker doesn't show supplier-only categories.
 */
@Service
public class ShopExpenseService {

    private static final List<String> DEFAULT_SHOP_CATEGORIES = List.of(
            "Shop Rent", "Employee Cost", "Lunch Bill", "Snacks Bill", "Other"
    );

    private final WholesalerRepository wholesalerRepository;
    private final ShopExpenseRepository shopExpenseRepository;
    private final ExpenseCategoryRepository expenseCategoryRepository;

    public ShopExpenseService(WholesalerRepository wholesalerRepository,
                              ShopExpenseRepository shopExpenseRepository,
                              ExpenseCategoryRepository expenseCategoryRepository) {
        this.wholesalerRepository = wholesalerRepository;
        this.shopExpenseRepository = shopExpenseRepository;
        this.expenseCategoryRepository = expenseCategoryRepository;
    }

    @Transactional
    public ShopExpenseResponse create(Long wholesalerId, CreateShopExpenseRequest request) {
        Wholesaler wholesaler = findWholesaler(wholesalerId);
        if (request == null) {
            throw new BadRequestException("Expense details are required.");
        }
        BigDecimal amount = money(request.amount());
        if (amount.signum() <= 0) {
            throw new BadRequestException("Amount must be greater than zero.");
        }
        ExpenseCategory category = resolveCategory(wholesaler, request.categoryId(), request.categoryName());
        if (category.getKind() == ExpenseCategoryKind.SUPPLIER) {
            throw new BadRequestException("Category \"" + category.getName() + "\" is for supplier expenses only.");
        }

        ShopExpense expense = new ShopExpense();
        expense.setWholesaler(wholesaler);
        expense.setCategory(category);
        expense.setAmount(amount);
        expense.setPaymentMethod(resolvePaymentMethod(request.paymentMethod()));
        expense.setExpenseDate(request.expenseDate() == null ? LocalDateTime.now() : request.expenseDate());
        expense.setNote(clean(request.note()));
        return toResponse(shopExpenseRepository.save(expense));
    }

    @Transactional(readOnly = true)
    public List<ShopExpenseResponse> list(Long wholesalerId, LocalDateTime from, LocalDateTime to) {
        findWholesaler(wholesalerId);
        if (from != null && to != null && !from.isBefore(to)) {
            throw new BadRequestException("from must be before to.");
        }
        return shopExpenseRepository.findByWholesalerInPeriod(wholesalerId, from, to)
                .stream().map(this::toResponse).toList();
    }

    @Transactional
    public ShopExpenseResponse cancel(Long wholesalerId, Long expenseId, String reason) {
        findWholesaler(wholesalerId);
        ShopExpense expense = shopExpenseRepository.findByIdAndWholesaler_Id(expenseId, wholesalerId)
                .orElseThrow(() -> new BadRequestException("Shop expense not found."));
        if (expense.getStatus() != PostStatus.POSTED) {
            throw new BadRequestException("Shop expense is already " + expense.getStatus().name() + ".");
        }
        expense.setStatus(PostStatus.CANCELLED);
        String tag = reason == null || reason.isBlank() ? "Cancelled" : "Cancelled — " + reason.trim();
        expense.setNote(expense.getNote() == null || expense.getNote().isBlank() ? tag : expense.getNote() + " | " + tag);
        return toResponse(shopExpenseRepository.save(expense));
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
                    cat.setKind(ExpenseCategoryKind.SHOP);
                    cat.setStatus(RecordStatus.ACTIVE);
                    return expenseCategoryRepository.save(cat);
                });
    }

    /** Lazy-seeds the default SHOP categories the first time someone fetches the picker. */
    @Transactional
    public List<ExpenseCategory> listShopCategories(Long wholesalerId) {
        Wholesaler wholesaler = findWholesaler(wholesalerId);
        List<ExpenseCategory> existing = expenseCategoryRepository.findActiveForKind(wholesalerId, ExpenseCategoryKind.SHOP);
        boolean anyShop = existing.stream().anyMatch(c -> c.getKind() == ExpenseCategoryKind.SHOP);
        if (!anyShop) {
            for (String name : DEFAULT_SHOP_CATEGORIES) {
                ExpenseCategory existingByName = expenseCategoryRepository
                        .findByWholesaler_IdAndNameIgnoreCase(wholesalerId, name).orElse(null);
                if (existingByName == null) {
                    ExpenseCategory cat = new ExpenseCategory();
                    cat.setWholesaler(wholesaler);
                    cat.setName(name);
                    cat.setKind(ExpenseCategoryKind.SHOP);
                    cat.setStatus(RecordStatus.ACTIVE);
                    expenseCategoryRepository.save(cat);
                }
            }
            existing = expenseCategoryRepository.findActiveForKind(wholesalerId, ExpenseCategoryKind.SHOP);
        }
        return existing;
    }

    private PaymentMethod resolvePaymentMethod(String value) {
        String cleaned = clean(value);
        if (cleaned == null || cleaned.isBlank()) return PaymentMethod.CASH;
        try {
            PaymentMethod m = PaymentMethod.valueOf(cleaned.toUpperCase(Locale.ROOT));
            if (m == PaymentMethod.NONE) {
                throw new BadRequestException("Payment method NONE is not valid for shop expenses.");
            }
            return m;
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Invalid payment method.");
        }
    }

    private ShopExpenseResponse toResponse(ShopExpense expense) {
        return new ShopExpenseResponse(
                expense.getId(),
                expense.getCategory().getId(),
                expense.getCategory().getName(),
                expense.getAmount(),
                expense.getPaymentMethod().name(),
                expense.getExpenseDate(),
                expense.getNote(),
                expense.getStatus().name(),
                expense.getCreatedAt()
        );
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
