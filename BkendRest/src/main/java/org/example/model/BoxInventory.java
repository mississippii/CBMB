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

@Getter
@Setter
@Entity
@Table(name = "box_inventory",
        uniqueConstraints = @jakarta.persistence.UniqueConstraint(name = "uk_box_inventory_wholesaler_type", columnNames = {"wholesaler_id", "box_type_id"}))
@org.hibernate.annotations.Check(constraints = "total_owned >= 0 and in_hand >= 0 and with_customers >= 0 and with_suppliers >= 0 and lost_damaged >= 0")
@org.hibernate.annotations.Check(constraints = "total_owned = (in_hand + with_customers + with_suppliers + lost_damaged)")
public class BoxInventory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "wholesaler_id", nullable = false)
    private Wholesaler wholesaler;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "box_type_id", nullable = false)
    private BoxType boxType;

    @Column(name = "total_owned", nullable = false)
    private Integer totalOwned = 0;

    @Column(name = "in_hand", nullable = false)
    private Integer inHand = 0;

    @Column(name = "with_customers", nullable = false)
    private Integer withCustomers = 0;

    @Column(name = "with_suppliers", nullable = false)
    private Integer withSuppliers = 0;

    @Column(name = "lost_damaged", nullable = false)
    private Integer lostDamaged = 0;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private LocalDateTime updatedAt;
}
