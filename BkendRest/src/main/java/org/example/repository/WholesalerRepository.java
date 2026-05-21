package org.example.repository;

import java.util.Optional;
import org.example.model.Wholesaler;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WholesalerRepository extends JpaRepository<Wholesaler, Long> {

    boolean existsByPhone(String phone);

    Optional<Wholesaler> findByUser_Id(Long userId);

    Page<Wholesaler> findByPhoneContainingOrderByCreatedAtDesc(String phone, Pageable pageable);

    Page<Wholesaler> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
