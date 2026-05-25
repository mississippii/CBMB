package org.example.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import org.example.model.enums.PaymentMethod;
import org.example.model.enums.PostStatus;
import lombok.Getter;
import lombok.Setter;

/**
 * Shop overhead: employee salary, hospitality, lunch, rent, utilities, etc.
 * Pure outflow — wholesaler bears the cost. No party balance impact.
 * Reduces cash and reduces net profit (commission − shop expenses).
 */
@Getter
@Setter
@Entity
@Table(name = "shop_expenses",
        indexes = {
                @jakarta.persistence.Index(name = "idx_shop_expense_wh_date", columnList = "wholesaler_id,expense_date"),
                @jakarta.persistence.Index(name = "idx_shop_expense_category", columnList = "wholesaler_id,category_id")
        })
@org.hibernate.annotations.Check(constraints = "amount > 0")
public class ShopExpense {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "wholesaler_id", nullable = false)
    private Wholesaler wholesaler;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id", nullable = false)
    private ExpenseCategory category;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal amount = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false)
    private PaymentMethod paymentMethod = PaymentMethod.CASH;

    @Column(name = "expense_date", nullable = false)
    private LocalDateTime expenseDate;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PostStatus status = PostStatus.POSTED;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private LocalDateTime updatedAt;
}
