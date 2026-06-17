package org.example.service;

import java.util.UUID;
import org.example.model.Supplier;
import org.example.model.User;
import org.example.model.enums.RecordStatus;
import org.example.model.enums.UserRole;
import org.example.repository.SupplierRepository;
import org.example.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Provisions the identity row for suppliers. Every supplier gets a SUPPLIER
 * user automatically (created with the supplier, or lazily on first portal
 * sign-in for suppliers that predate this feature). Supplier sign-in is
 * phone-only — the stored password is a random unusable hash, so the
 * password-based /auth/login can never match a supplier account.
 */
@Service
public class SupplierLoginService {

    private final SupplierRepository supplierRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public SupplierLoginService(
            SupplierRepository supplierRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.supplierRepository = supplierRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public User ensureSupplierUser(Supplier supplier) {
        if (supplier.getUser() != null) {
            return supplier.getUser();
        }
        // Same phone may already hold a user row (e.g. created before a crash).
        User user = userRepository.findByPhone(supplier.getPhone()).orElseGet(() -> {
            User created = new User();
            created.setName(supplier.getName());
            created.setPhone(supplier.getPhone());
            created.setRole(UserRole.SUPPLIER);
            created.setStatus(RecordStatus.ACTIVE);
            created.setPasswordHash(passwordEncoder.encode(UUID.randomUUID().toString()));
            return userRepository.save(created);
        });
        supplier.setUser(user);
        supplierRepository.save(supplier);
        return user;
    }
}
