package org.example.repository;

import java.util.List;
import org.example.model.SubCategory;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SubCategoryRepository extends JpaRepository<SubCategory, Long> {

    /** All lots in display order (Lot1, Lot2, …). */
    List<SubCategory> findAllByOrderBySortOrderAsc();
}
