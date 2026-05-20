package org.example.repository;

import java.util.List;
import org.example.model.Transaction;
import org.example.model.id.TransactionId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TransactionRepository extends JpaRepository<Transaction, TransactionId> {

    List<Transaction> findByWholesalerIdOrderByCreatedAtDesc(Long wholesalerId);

    List<Transaction> findByWholesalerIdAndWholesalerCustomerIdOrderByCreatedAtDesc(Long wholesalerId, Long wholesalerCustomerId);

    List<Transaction> findByWholesalerIdAndWholesalerSupplierIdOrderByCreatedAtDesc(Long wholesalerId, Long wholesalerSupplierId);
}
