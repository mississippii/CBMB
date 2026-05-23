package org.example.repository;

import java.util.List;
import java.util.Optional;
import org.example.model.Category;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CategoryRepository extends JpaRepository<Category, Long> {

    /** Varieties of a product (flat). */
    List<Category> findByProduct_IdAndStatusOrderByNameAsc(Long productId, org.example.model.enums.RecordStatus status);

    boolean existsByProduct_IdAndStatus(Long productId, org.example.model.enums.RecordStatus status);

    Optional<Category> findByProduct_IdAndNameIgnoreCase(Long productId, String name);
}
