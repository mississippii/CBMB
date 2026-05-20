package org.example.repository;

import org.example.model.BoxLedger;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BoxLedgerRepository extends JpaRepository<BoxLedger, Long> {
}
