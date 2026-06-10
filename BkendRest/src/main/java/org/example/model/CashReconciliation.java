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
import jakarta.persistence.UniqueConstraint;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;
import org.example.model.enums.CashDayStatus;

/**
 * One day's cash drawer close-out. The actual debit/credit movements (cash
 * sales, customer collections, supplier payments, shop expenses…) are derived
 * live from their source tables — this row only persists what cannot be
 * recomputed: the opening float, the physically counted cash, and the close
 * decision. Opening cash carries forward from the previous closed day.
 */
@Getter
@Setter
@Entity
@Table(name = "cash_reconciliations",
        uniqueConstraints = @UniqueConstraint(name = "uq_cash_recon_wh_date", columnNames = {"wholesaler_id", "business_date"}),
        indexes = @jakarta.persistence.Index(name = "idx_cash_recon_wh_date", columnList = "wholesaler_id,business_date"))
public class CashReconciliation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "wholesaler_id", nullable = false)
    private Wholesaler wholesaler;

    @Column(name = "business_date", nullable = false)
    private LocalDate businessDate;

    @Column(name = "opening_cash", nullable = false, precision = 14, scale = 2)
    private BigDecimal openingCash = BigDecimal.ZERO;

    /** Physically counted drawer cash at close. Null until the day is closed. */
    @Column(name = "counted_cash", precision = 14, scale = 2)
    private BigDecimal countedCash;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private CashDayStatus status = CashDayStatus.CLOSED;

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private LocalDateTime updatedAt;
}
