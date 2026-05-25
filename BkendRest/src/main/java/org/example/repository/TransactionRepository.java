package org.example.repository;

import java.time.LocalDateTime;
import java.util.List;
import org.example.model.Transaction;
import org.example.model.id.TransactionId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TransactionRepository extends JpaRepository<Transaction, TransactionId> {

    List<Transaction> findByWholesalerIdOrderByCreatedAtDesc(Long wholesalerId);

    List<Transaction> findByWholesalerIdAndWholesalerCustomerIdOrderByCreatedAtDesc(Long wholesalerId, Long wholesalerCustomerId);

    List<Transaction> findByWholesalerIdAndWholesalerSupplierIdOrderByCreatedAtDesc(Long wholesalerId, Long wholesalerSupplierId);

    /** Date-filtered list for month / year drilldowns. Null bounds = unbounded on that side. */
    @Query("""
        select t from Transaction t
        where t.wholesalerId = :wholesalerId
          and (:from is null or t.createdAt >= :from)
          and (:to is null or t.createdAt < :to)
        order by t.createdAt desc
        """)
    List<Transaction> findByWholesalerIdInPeriod(@Param("wholesalerId") Long wholesalerId,
                                                  @Param("from") LocalDateTime from,
                                                  @Param("to") LocalDateTime to);
}
