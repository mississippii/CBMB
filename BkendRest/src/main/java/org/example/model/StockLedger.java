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
import org.example.model.enums.StockDirection;
import org.example.model.enums.StockReferenceType;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "stock_ledger",
        indexes = {
                @jakarta.persistence.Index(name = "idx_stock_ledger_supplier_date", columnList = "wholesaler_id,wholesaler_supplier_id,created_at"),
                @jakarta.persistence.Index(name = "idx_stock_ledger_product_date", columnList = "wholesaler_id,product_id,created_at"),
                @jakarta.persistence.Index(name = "idx_stock_ledger_category_date", columnList = "wholesaler_id,category_id,created_at")
        })
@org.hibernate.annotations.Check(constraints = "quantity > 0")
@jakarta.persistence.IdClass(org.example.model.id.StockLedgerId.class)
public class StockLedger {

    @Id
    @jakarta.persistence.TableGenerator(name = "stock_ledger_id_gen", table = "jpa_id_generators",
            pkColumnName = "sequence_name", valueColumnName = "next_val",
            pkColumnValue = "stock_ledger", allocationSize = 1)
    @GeneratedValue(strategy = GenerationType.TABLE, generator = "stock_ledger_id_gen")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "wholesaler_id", nullable = false)
    private Wholesaler wholesaler;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "wholesaler_supplier_id", nullable = false)
    private WholesalerSupplier wholesalerSupplier;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

    @Enumerated(EnumType.STRING)
    @Column(name = "reference_type", nullable = false)
    private StockReferenceType referenceType;

    @Column(name = "reference_id", nullable = false)
    private Long referenceId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StockDirection direction;

    @Column(nullable = false, precision = 14, scale = 3)
    private BigDecimal quantity;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Id
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @jakarta.persistence.PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
