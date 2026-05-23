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
import java.time.LocalDateTime;
import org.example.model.enums.RecordStatus;
import lombok.Getter;
import lombok.Setter;

/**
 * Level-2: a variety under a product (e.g. Mango → Amrapali).
 * If `usesLots` is true, every inventory/sale row under this variety carries
 * a sub_category_id pointing into the fixed Lot1..LotN enumeration.
 */
@Getter
@Setter
@Entity
@Table(name = "categories",
        uniqueConstraints = @jakarta.persistence.UniqueConstraint(name = "uk_categories_product_name", columnNames = {"product_id", "name"}),
        indexes = @jakarta.persistence.Index(name = "idx_categories_product_status", columnList = "product_id,status"))
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(name = "uses_lots", nullable = false)
    private boolean usesLots = false;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RecordStatus status = RecordStatus.ACTIVE;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private LocalDateTime updatedAt;
}
