package org.example.service;

import org.example.dto.LoginRequest;
import org.example.dto.LoginResponse;
import org.example.dto.SupplierPhoneLoginRequest;
import org.example.exception.BadRequestException;
import org.example.model.Supplier;
import org.example.model.enums.RecordStatus;
import org.example.model.User;
import org.example.repository.SupplierRepository;
import org.example.repository.UserRepository;
import org.example.repository.WholesalerRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final WholesalerRepository wholesalerRepository;
    private final SupplierRepository supplierRepository;
    private final SupplierLoginService supplierLoginService;
    private final SupplierPortalTokenService supplierPortalTokenService;
    private final PasswordEncoder passwordEncoder;

    public AuthService(
            UserRepository userRepository,
            WholesalerRepository wholesalerRepository,
            SupplierRepository supplierRepository,
            SupplierLoginService supplierLoginService,
            SupplierPortalTokenService supplierPortalTokenService,
            PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.wholesalerRepository = wholesalerRepository;
        this.supplierRepository = supplierRepository;
        this.supplierLoginService = supplierLoginService;
        this.supplierPortalTokenService = supplierPortalTokenService;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        // Any account signs in with email or phone. Phone resolves through users.phone
        // (supplier logins) and falls back to the wholesaler profile's phone.
        String identifier = requireText(request.email(), "Email or phone is required.");
        String password = requireText(request.password(), "Password is required.");

        User user = userRepository.findByEmail(identifier.toLowerCase())
                .or(() -> userRepository.findByPhone(identifier))
                .or(() -> wholesalerRepository.findByPhone(identifier).map(org.example.model.Wholesaler::getUser))
                .orElseThrow(() -> new BadRequestException("Invalid login or password."));

        if (user.getStatus() != RecordStatus.ACTIVE || !passwordMatches(password, user.getPasswordHash())) {
            throw new BadRequestException("Invalid login or password.");
        }

        var wholesaler = wholesalerRepository.findByUser_Id(user.getId()).orElse(null);
        var supplier = supplierRepository.findByUser_Id(user.getId()).orElse(null);

        String businessName = wholesaler != null ? wholesaler.getBusinessName()
                : supplier != null ? supplier.getBusinessName() : null;
        String phone = wholesaler != null ? wholesaler.getPhone()
                : supplier != null ? supplier.getPhone() : null;
        String address = wholesaler != null ? wholesaler.getAddress()
                : supplier != null ? supplier.getAddress() : null;

        return new LoginResponse(
                user.getId(),
                wholesaler != null ? wholesaler.getId() : null,
                supplier != null ? supplier.getId() : null,
                user.getEmail(),
                user.getName(),
                user.getRole().name(),
                user.getStatus().name(),
                businessName,
                phone,
                address,
                supplier == null ? null : supplierPortalTokenService.issue(supplier.getId())
        );
    }

    /**
     * Phone-only sign-in for the read-only supplier portal. No password by
     * design (user decision; real authorization arrives with the separate
     * security service). The supplier's user row is created lazily here for
     * suppliers added before auto-provisioning existed.
     */
    @Transactional
    public LoginResponse supplierLogin(SupplierPhoneLoginRequest request) {
        String phone = requireText(request == null ? null : request.phone(), "Phone number is required.");

        Supplier supplier = supplierRepository.findByPhone(phone)
                .orElseThrow(() -> new BadRequestException("No supplier found with this phone number."));
        if (supplier.getStatus() != RecordStatus.ACTIVE) {
            throw new BadRequestException("This supplier account is disabled. Contact your wholesaler.");
        }

        var user = supplierLoginService.ensureSupplierUser(supplier);
        if (user.getStatus() != RecordStatus.ACTIVE) {
            throw new BadRequestException("This supplier account is disabled. Contact your wholesaler.");
        }

        return new LoginResponse(
                user.getId(),
                null,
                supplier.getId(),
                user.getEmail(),
                supplier.getName(),
                user.getRole().name(),
                user.getStatus().name(),
                supplier.getBusinessName(),
                supplier.getPhone(),
                supplier.getAddress(),
                supplierPortalTokenService.issue(supplier.getId())
        );
    }

    private boolean passwordMatches(String rawPassword, String storedPassword) {
        if (storedPassword == null || storedPassword.isBlank()) {
            return false;
        }
        if (storedPassword.startsWith("$2a$") || storedPassword.startsWith("$2b$") || storedPassword.startsWith("$2y$")) {
            return passwordEncoder.matches(rawPassword, storedPassword);
        }
        return rawPassword.equals(storedPassword);
    }

    private String requireText(String value, String message) {
        if (value == null || value.trim().isBlank()) {
            throw new BadRequestException(message);
        }
        return value.trim();
    }
}
