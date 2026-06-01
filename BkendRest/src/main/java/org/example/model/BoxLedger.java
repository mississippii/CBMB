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
import org.example.model.enums.BoxLedgerPartyType;
import org.example.model.enums.BoxMovementType;
import org.example.model.enums.BoxReferenceType;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "box_ledger",
        indexes = {
                @jakarta.persistence.Index(name = "idx_box_ledger_wholesaler_date", columnList = "wholesaler_id,created_at"),
                @jakarta.persistence.Index(name = "idx_box_ledger_party", columnList = "wholesaler_id,party_type,party_account_id,created_at"),
                @jakarta.persistence.Index(name = "idx_box_ledger_type_date", columnList = "wholesaler_id,box_type_id,created_at")
        })
@org.hibernate.annotations.Check(constraints = "((party_type = 'WHOLESALER' and party_account_id is null) or (party_type in ('WHOLESALER_CUSTOMER','WHOLESALER_SUPPLIER') and party_account_id is not null))")
@org.hibernate.annotations.Check(constraints = "quantity > 0")
@jakarta.persistence.IdClass(org.example.model.id.BoxLedgerId.class)
public class BoxLedger {

    @Id
    @jakarta.persistence.TableGenerator(name = "box_ledger_id_gen", table = "jpa_id_generators",
            pkColumnName = "sequence_name", valueColumnName = "next_val",
            pkColumnValue = "box_ledger", allocationSize = 1)
    @GeneratedValue(strategy = GenerationType.TABLE, generator = "box_ledger_id_gen")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "wholesaler_id", nullable = false)
    private Wholesaler wholesaler;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "box_type_id", nullable = false)
    private BoxType boxType;

    @Enumerated(EnumType.STRING)
    @Column(name = "party_type", nullable = false)
    private BoxLedgerPartyType partyType;

    @Column(name = "party_account_id")
    private Long partyAccountId;

    @Enumerated(EnumType.STRING)
    @Column(name = "movement_type", nullable = false)
    private BoxMovementType movementType;

    @Column(nullable = false)
    private Integer quantity;

    /**
     * Per-batch cost snapshot at the moment of recording.
     *   PURCHASE     -> price paid for THIS batch
     *   LOST/DAMAGED -> weighted-average cost at the moment of loss (P&L value)
     *   SOLD         -> weighted-average cost basis for COGS (sale_price - this = profit)
     * Null on movement types where cost isn't tracked.
     */
    @Column(name = "unit_cost_snapshot", precision = 14, scale = 2)
    private BigDecimal unitCostSnapshot;

    /**
     * SOLD rows only: sale price per crate. Net profit on a sale =
     * {@code quantity * (unitSalePrice - unitCostSnapshot)}.
     */
    @Column(name = "unit_sale_price", precision = 14, scale = 2)
    private BigDecimal unitSalePrice;

    @Enumerated(EnumType.STRING)
    @Column(name = "reference_type", nullable = false)
    private BoxReferenceType referenceType = BoxReferenceType.MANUAL;

    @Column(name = "reference_id")
    private Long referenceId;

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
