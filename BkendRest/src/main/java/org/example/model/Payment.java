package org.example.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.TableGenerator;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import org.example.model.enums.PaymentMethod;
import org.example.model.id.PaymentId;
import org.example.model.enums.PaymentType;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "payments",
        indexes = {
                @jakarta.persistence.Index(name = "idx_payments_wholesaler_date", columnList = "wholesaler_id,created_at"),
                @jakarta.persistence.Index(name = "idx_payments_customer_date", columnList = "wholesaler_id,wholesaler_customer_id,created_at"),
                @jakarta.persistence.Index(name = "idx_payments_type_date", columnList = "wholesaler_id,payment_type,created_at")
        })
@org.hibernate.annotations.Check(constraints = "cash_amount >= 0 and boxes_returned >= 0 and jamanot_amount >= 0 and previous_due >= 0 and due_after_payment >= 0 and previous_jamanot >= 0 and jamanot_after_payment >= 0")
@org.hibernate.annotations.Check(constraints = "((payment_type = 'CASH_RECEIVE' and cash_amount > 0 and boxes_returned = 0) or (payment_type = 'CRATE_RETURN' and cash_amount = 0 and boxes_returned > 0) or (payment_type = 'CASH_AND_CRATE_RETURN' and cash_amount > 0 and boxes_returned > 0))")
@IdClass(PaymentId.class)
public class Payment {

    @Id
    @TableGenerator(name = "payments_id_gen", table = "jpa_id_generators", pkColumnName = "sequence_name", valueColumnName = "next_val", pkColumnValue = "payments", allocationSize = 1)
    @GeneratedValue(strategy = GenerationType.TABLE, generator = "payments_id_gen")
    private Long id;

    @Column(name = "wholesaler_id", nullable = false)
    private Long wholesalerId;

    @Column(name = "wholesaler_customer_id", nullable = false)
    private Long wholesalerCustomerId;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_type", nullable = false)
    private PaymentType paymentType;

    @Column(name = "cash_amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal cashAmount = BigDecimal.ZERO;

    @Column(name = "boxes_returned", nullable = false)
    private Integer boxesReturned = 0;

    @Column(name = "jamanot_amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal jamanotAmount = BigDecimal.ZERO;

    @Column(name = "previous_due", nullable = false, precision = 14, scale = 2)
    private BigDecimal previousDue = BigDecimal.ZERO;

    @Column(name = "due_after_payment", nullable = false, precision = 14, scale = 2)
    private BigDecimal dueAfterPayment = BigDecimal.ZERO;

    @Column(name = "previous_jamanot", nullable = false, precision = 14, scale = 2)
    private BigDecimal previousJamanot = BigDecimal.ZERO;

    @Column(name = "jamanot_after_payment", nullable = false, precision = 14, scale = 2)
    private BigDecimal jamanotAfterPayment = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false)
    private PaymentMethod paymentMethod = PaymentMethod.CASH;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private org.example.model.enums.PostStatus status = org.example.model.enums.PostStatus.POSTED;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Id
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
