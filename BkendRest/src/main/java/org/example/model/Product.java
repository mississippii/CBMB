package org.example.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import org.example.model.enums.ProductUnitType;
import org.example.model.enums.RecordStatus;
import org.example.model.enums.UnitType;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "products",
        uniqueConstraints = @jakarta.persistence.UniqueConstraint(name = "uk_products_name", columnNames = "name"),
        indexes = @jakarta.persistence.Index(name = "idx_products_status_name", columnList = "status,name"))
@org.hibernate.annotations.Check(constraints = "((unit_type = 'WEIGHT' and default_unit in ('KG','MOUND')) or (unit_type = 'COUNT' and default_unit in ('PCS','DOZEN','BOX','BAG')))")
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 160)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "default_unit", nullable = false)
    private UnitType defaultUnit = UnitType.PCS;

    @Enumerated(EnumType.STRING)
    @Column(name = "unit_type", nullable = false)
    private ProductUnitType unitType = ProductUnitType.COUNT;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RecordStatus status = RecordStatus.ACTIVE;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private LocalDateTime updatedAt;
}
