package org.example.repository;

import java.util.Optional;
import org.example.model.Product;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductRepository extends JpaRepository<Product, Long> {

    java.util.List<Product> findByStatusOrderByNameAsc(org.example.model.enums.RecordStatus status);

    Optional<Product> findByNameIgnoreCase(String name);
}
