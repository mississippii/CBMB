package org.example.repository;

import java.util.List;
import java.util.Optional;
import org.example.model.BoxInventory;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BoxInventoryRepository extends JpaRepository<BoxInventory, Long> {

    List<BoxInventory> findByWholesaler_IdOrderByBoxType_NameAsc(Long wholesalerId);

    Optional<BoxInventory> findByWholesaler_IdAndBoxType_Id(Long wholesalerId, Long boxTypeId);

    List<BoxInventory> findByWholesaler_Id(Long wholesalerId);
}
