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
import org.example.model.enums.PartyType;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "box_balances",
        uniqueConstraints = @jakarta.persistence.UniqueConstraint(name = "uk_box_balances_party_type", columnNames = {"wholesaler_id", "party_type", "party_account_id", "box_type_id"}),
        indexes = @jakarta.persistence.Index(name = "idx_box_balances_wholesaler_type", columnList = "wholesaler_id,box_type_id"))
@org.hibernate.annotations.Check(constraints = "boxes_due >= 0")
public class BoxBalance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "wholesaler_id", nullable = false)
    private Wholesaler wholesaler;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "box_type_id", nullable = false)
    private BoxType boxType;

    @Enumerated(EnumType.STRING)
    @Column(name = "party_type", nullable = false)
    private PartyType partyType;

    @Column(name = "party_account_id", nullable = false)
    private Long partyAccountId;

    @Column(name = "boxes_due", nullable = false)
    private Integer boxesDue = 0;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private LocalDateTime updatedAt;
}
