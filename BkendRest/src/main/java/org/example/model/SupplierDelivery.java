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
import org.example.model.enums.PostStatus;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "supplier_deliveries",
        indexes = {
                @jakarta.persistence.Index(name = "idx_supplier_deliveries_wholesaler_date", columnList = "wholesaler_id,delivery_date"),
                @jakarta.persistence.Index(name = "idx_supplier_deliveries_supplier_date", columnList = "wholesaler_supplier_id,delivery_date")
        })
@org.hibernate.annotations.Check(constraints = "total_quantity >= 0")
public class SupplierDelivery {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "wholesaler_id", nullable = false)
    private Wholesaler wholesaler;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "wholesaler_supplier_id", nullable = false)
    private WholesalerSupplier wholesalerSupplier;

    @Column(name = "delivery_date", nullable = false)
    private LocalDateTime deliveryDate;

    @Column(name = "total_quantity", nullable = false, precision = 14, scale = 3)
    private BigDecimal totalQuantity = BigDecimal.ZERO;

    @Column(name = "estimated_value", nullable = false, precision = 14, scale = 2)
    private BigDecimal estimatedValue = BigDecimal.ZERO;

    @Column(name = "advance_paid", nullable = false, precision = 14, scale = 2)
    private BigDecimal advancePaid = BigDecimal.ZERO;

    /** Negotiated per shipment, after the sell. Null until agreed. */
    @Column(name = "commission_rate", precision = 5, scale = 2)
    private BigDecimal commissionRate;

    @Enumerated(EnumType.STRING)
    @Column(name = "settlement_status", nullable = false)
    private org.example.model.enums.SettlementStatus settlementStatus = org.example.model.enums.SettlementStatus.OPEN;

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
