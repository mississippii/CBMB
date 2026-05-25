package org.example.repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.example.model.ShopExpense;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ShopExpenseRepository extends JpaRepository<ShopExpense, Long> {

    @Query("""
        select e from ShopExpense e
        where e.wholesaler.id = :wholesalerId
          and (:from is null or e.expenseDate >= :from)
          and (:to is null or e.expenseDate < :to)
        order by e.expenseDate desc, e.id desc
        """)
    List<ShopExpense> findByWholesalerInPeriod(@Param("wholesalerId") Long wholesalerId,
                                                @Param("from") LocalDateTime from,
                                                @Param("to") LocalDateTime to);

    Optional<ShopExpense> findByIdAndWholesaler_Id(Long id, Long wholesalerId);

    /** Sum of POSTED shop expenses in [from, to). */
    @Query("""
        select coalesce(sum(e.amount), 0) from ShopExpense e
        where e.wholesaler.id = :wholesalerId
          and e.status = org.example.model.enums.PostStatus.POSTED
          and (:from is null or e.expenseDate >= :from)
          and (:to is null or e.expenseDate < :to)
        """)
    BigDecimal sumInPeriod(@Param("wholesalerId") Long wholesalerId,
                           @Param("from") LocalDateTime from,
                           @Param("to") LocalDateTime to);

    /** Per-category breakdown for the period. Row: { categoryId, categoryName, sum }. */
    @Query("""
        select c.id, c.name, coalesce(sum(e.amount), 0)
        from ShopExpense e
        join e.category c
        where e.wholesaler.id = :wholesalerId
          and e.status = org.example.model.enums.PostStatus.POSTED
          and (:from is null or e.expenseDate >= :from)
          and (:to is null or e.expenseDate < :to)
        group by c.id, c.name
        order by sum(e.amount) desc
        """)
    List<Object[]> sumByCategoryInPeriod(@Param("wholesalerId") Long wholesalerId,
                                         @Param("from") LocalDateTime from,
                                         @Param("to") LocalDateTime to);
}
