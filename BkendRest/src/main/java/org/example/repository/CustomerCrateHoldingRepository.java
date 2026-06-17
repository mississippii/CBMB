package org.example.repository;

import java.util.List;
import java.util.Optional;
import org.example.model.CustomerCrateHolding;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CustomerCrateHoldingRepository extends JpaRepository<CustomerCrateHolding, Long> {

    Optional<CustomerCrateHolding> findByWholesaler_IdAndWholesalerCustomerIdAndBoxType_Id(
            Long wholesalerId, Long wholesalerCustomerId, Long boxTypeId);

    List<CustomerCrateHolding> findByWholesaler_IdAndWholesalerCustomerId(
            Long wholesalerId, Long wholesalerCustomerId);
}
