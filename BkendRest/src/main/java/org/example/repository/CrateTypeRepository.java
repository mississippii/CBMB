package org.example.repository;

import java.util.List;
import java.util.Optional;
import org.example.model.CrateType;
import org.example.model.enums.RecordStatus;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CrateTypeRepository extends JpaRepository<CrateType, Long> {

    Optional<CrateType> findByNameIgnoreCase(String name);

    Optional<CrateType> findByNameIgnoreCaseAndStatus(String name, RecordStatus status);

    List<CrateType> findByStatusOrderByNameAsc(RecordStatus status);

    List<CrateType> findAllByOrderByNameAsc();

    boolean existsByNameIgnoreCase(String name);
}
