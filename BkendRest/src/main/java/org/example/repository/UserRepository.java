package org.example.repository;

import java.util.Optional;
import org.example.model.User;
import org.example.model.enums.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {

    boolean existsByEmail(String email);

    boolean existsByPhone(String phone);

    boolean existsByRole(UserRole role);

    Optional<User> findByEmail(String email);

    Optional<User> findByPhone(String phone);
}
