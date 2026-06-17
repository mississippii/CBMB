package org.example.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

/**
 * Leg 2 of the supplier crate relationship: the SUPPLIER's own crates that the
 * wholesaler is currently holding (the wholesaler owes them back). These crates
 * are not the wholesaler's, so they never appear in {@link BoxInventory}; this is
 * a pure liability count, tracked separately from leg 1 ({@link BoxBalance}
 * WHOLESALER_SUPPLIER — the wholesaler's crates a supplier holds). The two legs
 * are deliberately kept apart so they can never net.
 */
@Getter
@Setter
@Entity
@Table(name = "supplier_crate_holdings",
        uniqueConstraints = @jakarta.persistence.UniqueConstraint(
                name = "uk_sch_party_type",
                columnNames = {"wholesaler_id", "wholesaler_supplier_id", "box_type_id"}))
public class SupplierCrateHolding {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "wholesaler_id", nullable = false)
    private Wholesaler wholesaler;

    @Column(name = "wholesaler_supplier_id", nullable = false)
    private Long wholesalerSupplierId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "box_type_id", nullable = false)
    private BoxType boxType;

    @Column(nullable = false)
    private Integer quantity = 0;

    @jakarta.persistence.Version
    @Column(nullable = false)
    private Long version = 0L;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private LocalDateTime updatedAt;
}
