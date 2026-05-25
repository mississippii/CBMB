package org.example.repository;

import org.example.model.StockLedger;
import org.example.model.id.StockLedgerId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StockLedgerRepository extends JpaRepository<StockLedger, StockLedgerId> {
}
