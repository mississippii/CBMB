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
import org.example.model.DomainEnums.BoxLedgerPartyType;
import org.example.model.DomainEnums.BoxMovementType;
import org.example.model.DomainEnums.BoxReferenceType;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "box_ledger")
public class BoxLedger {

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
    private BoxLedgerPartyType partyType;

    @Column(name = "party_account_id")
    private Long partyAccountId;

    @Enumerated(EnumType.STRING)
    @Column(name = "movement_type", nullable = false)
    private BoxMovementType movementType;

    @Column(nullable = false)
    private Integer quantity;

    @Enumerated(EnumType.STRING)
    @Column(name = "reference_type", nullable = false)
    private BoxReferenceType referenceType = BoxReferenceType.MANUAL;

    @Column(name = "reference_id")
    private Long referenceId;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;
}
