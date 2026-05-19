package org.example.repository;

import org.example.model.StockLedger;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StockLedgerRepository extends JpaRepository<StockLedger, Long> {
}
