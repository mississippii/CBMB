package org.example.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;
import org.example.model.enums.RecordStatus;

/**
 * Global, admin-managed catalog of crate (box) types — e.g. BANGLA, CHINA, PLASTIC.
 * Shared across all wholesalers. A wholesaler's own price / inventory / WAC for a
 * type lives in {@link BoxType} + {@link BoxInventory}, looked up by name.
 */
@Getter
@Setter
@Entity
@Table(name = "crate_types",
        uniqueConstraints = @UniqueConstraint(name = "uk_crate_types_name", columnNames = {"name"}))
public class CrateType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 80)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RecordStatus status = RecordStatus.ACTIVE;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private LocalDateTime updatedAt;
}
