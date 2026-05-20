package org.example.repository;

import java.util.List;
import java.util.Optional;
import org.example.model.BoxType;
import org.example.model.enums.RecordStatus;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BoxTypeRepository extends JpaRepository<BoxType, Long> {

    List<BoxType> findByWholesaler_IdAndStatusOrderByNameAsc(Long wholesalerId, RecordStatus status);

    Optional<BoxType> findByWholesaler_IdAndNameIgnoreCaseAndStatus(Long wholesalerId, String name, RecordStatus status);
}
