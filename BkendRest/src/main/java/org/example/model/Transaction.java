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
import org.example.model.enums.TransactionType;
import org.example.model.id.TransactionId;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "transactions")
@IdClass(TransactionId.class)
public class Transaction {

    @Id
    @TableGenerator(name = "transactions_id_gen", table = "jpa_id_generators", pkColumnName = "sequence_name", valueColumnName = "next_val", pkColumnValue = "transactions", allocationSize = 1)
    @GeneratedValue(strategy = GenerationType.TABLE, generator = "transactions_id_gen")
    private Long id;

    @Column(name = "wholesaler_id", nullable = false)
    private Long wholesalerId;

    @Enumerated(EnumType.STRING)
    @Column(name = "transaction_type", nullable = false)
    private TransactionType transactionType;

    @Column(name = "sale_id")
    private Long saleId;

    @Column(name = "payment_id")
    private Long paymentId;

    @Column(name = "wholesaler_customer_id")
    private Long wholesalerCustomerId;

    @Column(name = "wholesaler_supplier_id")
    private Long wholesalerSupplierId;

    @Column(name = "sale_amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal saleAmount = BigDecimal.ZERO;

    @Column(name = "payment_amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal paymentAmount = BigDecimal.ZERO;

    @Column(name = "due_amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal dueAmount = BigDecimal.ZERO;

    @Column(columnDefinition = "TEXT")
    private String description;

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
