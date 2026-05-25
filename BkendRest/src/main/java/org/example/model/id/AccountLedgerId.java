package org.example.model.id;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.Objects;

/** Composite PK for the partitioned account_ledger table. */
public class AccountLedgerId implements Serializable {

    private Long id;
    private LocalDateTime createdAt;

    public AccountLedgerId() {
    }

    public AccountLedgerId(Long id, LocalDateTime createdAt) {
        this.id = id;
        this.createdAt = createdAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    @Override
    public boolean equals(Object object) {
        if (this == object) return true;
        if (!(object instanceof AccountLedgerId other)) return false;
        return Objects.equals(id, other.id) && Objects.equals(createdAt, other.createdAt);
    }

    @Override
    public int hashCode() { return Objects.hash(id, createdAt); }
}
