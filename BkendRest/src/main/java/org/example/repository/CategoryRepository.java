package org.example.repository;

import java.util.Optional;
import org.example.model.Category;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CategoryRepository extends JpaRepository<Category, Long> {

    java.util.List<Category> findByProduct_IdAndStatusOrderByNameAscGradeAsc(Long productId, org.example.model.enums.RecordStatus status);

    Optional<Category> findByProduct_IdAndNameIgnoreCaseAndGrade(Long productId, String name, String grade);
}
