package org.example.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import org.example.model.enums.CrateDepositMovementType;

/**
 * One change to a customer's refundable crate deposit. {@code amount} is signed:
 * positive when money is taken (cash in), negative when refunded (cash out). The
 * Cash Book reads these to keep the daily drawer reconciled.
 */
@Entity
@Table(name = "crate_deposit_movements")
public class CrateDepositMovement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "wholesaler_id", nullable = false)
    private Long wholesalerId;

    @Column(name = "wholesaler_customer_id", nullable = false)
    private Long wholesalerCustomerId;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(name = "movement_type", nullable = false, length = 20)
    private CrateDepositMovementType movementType;

    @Column(name = "sale_id")
    private Long saleId;

    @Column(name = "payment_id")
    private Long paymentId;

    @Column(length = 255)
    private String note;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    public Long getId() {
        return id;
    }

    public void setWholesalerId(Long wholesalerId) {
        this.wholesalerId = wholesalerId;
    }

    public void setWholesalerCustomerId(Long wholesalerCustomerId) {
        this.wholesalerCustomerId = wholesalerCustomerId;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public CrateDepositMovementType getMovementType() {
        return movementType;
    }

    public void setMovementType(CrateDepositMovementType movementType) {
        this.movementType = movementType;
    }

    public void setSaleId(Long saleId) {
        this.saleId = saleId;
    }

    public void setPaymentId(Long paymentId) {
        this.paymentId = paymentId;
    }

    public void setNote(String note) {
        this.note = note;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
