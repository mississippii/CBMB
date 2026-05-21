package org.example.service;

import org.example.dto.AdminResponse;
import org.example.dto.CreateAdminRequest;
import org.example.exception.BadRequestException;
import org.example.exception.ConflictException;
import org.example.model.User;
import org.example.model.enums.RecordStatus;
import org.example.model.enums.UserRole;
import org.example.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminSetupService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminSetupService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public AdminResponse createAdmin(CreateAdminRequest request) {
        if (userRepository.existsByRole(UserRole.ADMIN)) {
            throw new ConflictException("An admin account already exists. Only one admin is allowed.");
        }

        String name = requireText(request.name(), "Name is required.");
        String email = requireText(request.email(), "Email is required.").toLowerCase();
        String password = requireText(request.password(), "Password is required.");

        if (password.length() < 8) {
            throw new BadRequestException("Password must be at least 8 characters.");
        }

        if (userRepository.existsByEmail(email)) {
            throw new BadRequestException("A user with this email already exists.");
        }

        User admin = new User();
        admin.setName(name);
        admin.setEmail(email);
        admin.setPasswordHash(passwordEncoder.encode(password));
        admin.setRole(UserRole.ADMIN);
        admin.setStatus(RecordStatus.ACTIVE);

        User saved = userRepository.save(admin);

        return new AdminResponse(
                saved.getId(),
                saved.getName(),
                saved.getEmail(),
                saved.getRole().name(),
                saved.getStatus().name(),
                saved.getCreatedAt()
        );
    }

    private String requireText(String value, String message) {
        if (value == null || value.trim().isBlank()) {
            throw new BadRequestException(message);
        }
        return value.trim();
    }
}
