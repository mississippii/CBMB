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
@Table(name = "payments")
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
