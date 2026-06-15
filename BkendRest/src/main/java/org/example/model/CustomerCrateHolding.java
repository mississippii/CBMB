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
 * Leg 2 of the customer crate relationship: the CUSTOMER's own crates that the
 * wholesaler is currently holding (wholesaler owes them back). Not the
 * wholesaler's crates, so this never touches {@link BoxInventory} — a pure
 * liability count, separate from leg 1 ({@link BoxBalance} WHOLESALER_CUSTOMER —
 * the wholesaler's crates a customer holds). Mirrors {@link SupplierCrateHolding}.
 */
@Getter
@Setter
@Entity
@Table(name = "customer_crate_holdings",
        uniqueConstraints = @jakarta.persistence.UniqueConstraint(
                name = "uk_cch_party_type",
                columnNames = {"wholesaler_id", "wholesaler_customer_id", "box_type_id"}))
public class CustomerCrateHolding {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "wholesaler_id", nullable = false)
    private Wholesaler wholesaler;

    @Column(name = "wholesaler_customer_id", nullable = false)
    private Long wholesalerCustomerId;

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
