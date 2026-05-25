package org.example.repository;

import java.util.List;
import java.util.Optional;
import org.example.model.ExpenseCategory;
import org.example.model.enums.ExpenseCategoryKind;
import org.example.model.enums.RecordStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ExpenseCategoryRepository extends JpaRepository<ExpenseCategory, Long> {

    List<ExpenseCategory> findByWholesaler_IdAndStatusOrderByNameAsc(Long wholesalerId, RecordStatus status);

    Optional<ExpenseCategory> findByWholesaler_IdAndNameIgnoreCase(Long wholesalerId, String name);

    Optional<ExpenseCategory> findByWholesaler_IdAndId(Long wholesalerId, Long id);

    /** Active categories visible for a given expense surface (SUPPLIER or SHOP). BOTH always counts. */
    @Query("""
        select c from ExpenseCategory c
        where c.wholesaler.id = :wholesalerId
          and c.status = org.example.model.enums.RecordStatus.ACTIVE
          and (c.kind = :kind or c.kind = org.example.model.enums.ExpenseCategoryKind.BOTH)
        order by c.name asc
        """)
    List<ExpenseCategory> findActiveForKind(@Param("wholesalerId") Long wholesalerId,
                                            @Param("kind") ExpenseCategoryKind kind);
}
