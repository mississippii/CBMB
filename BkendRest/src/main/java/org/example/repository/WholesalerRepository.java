package org.example.repository;

import java.util.Optional;
import org.example.model.Wholesaler;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WholesalerRepository extends JpaRepository<Wholesaler, Long> {

    boolean existsByPhone(String phone);

    Optional<Wholesaler> findByUser_Id(Long userId);
}
