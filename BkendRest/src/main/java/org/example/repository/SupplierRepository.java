package org.example.repository;

import java.util.Optional;
import org.example.model.Supplier;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SupplierRepository extends JpaRepository<Supplier, Long> {

    Optional<Supplier> findByPhone(String phone);

    Optional<Supplier> findByUser_Id(Long userId);
}
