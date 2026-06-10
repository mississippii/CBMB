package org.example.repository;

import java.time.LocalDate;
import java.util.Optional;
import org.example.model.CashReconciliation;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CashReconciliationRepository extends JpaRepository<CashReconciliation, Long> {

    Optional<CashReconciliation> findByWholesaler_IdAndBusinessDate(Long wholesalerId, LocalDate businessDate);

    /** Most recent reconciled day strictly before the given date — source of the opening float. */
    Optional<CashReconciliation> findFirstByWholesaler_IdAndBusinessDateLessThanOrderByBusinessDateDesc(
            Long wholesalerId, LocalDate businessDate);
}
