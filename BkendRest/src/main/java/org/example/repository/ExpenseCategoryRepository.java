package org.example.repository;

import java.util.List;
import java.util.Optional;
import org.example.model.ExpenseCategory;
import org.example.model.enums.RecordStatus;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExpenseCategoryRepository extends JpaRepository<ExpenseCategory, Long> {

    List<ExpenseCategory> findByWholesaler_IdAndStatusOrderByNameAsc(Long wholesalerId, RecordStatus status);

    Optional<ExpenseCategory> findByWholesaler_IdAndNameIgnoreCase(Long wholesalerId, String name);

    Optional<ExpenseCategory> findByWholesaler_IdAndId(Long wholesalerId, Long id);
}
