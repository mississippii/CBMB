package org.example.service;

import org.example.dto.LoginRequest;
import org.example.dto.LoginResponse;
import org.example.exception.BadRequestException;
import org.example.model.DomainEnums.RecordStatus;
import org.example.model.User;
import org.example.repository.UserRepository;
import org.example.repository.WholesalerRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final WholesalerRepository wholesalerRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthService(
            UserRepository userRepository,
            WholesalerRepository wholesalerRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.wholesalerRepository = wholesalerRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        String email = requireText(request.email(), "Email is required.").toLowerCase();
        String password = requireText(request.password(), "Password is required.");

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadRequestException("Invalid email or password."));

        if (user.getStatus() != RecordStatus.ACTIVE || !passwordMatches(password, user.getPasswordHash())) {
            throw new BadRequestException("Invalid email or password.");
        }

        return new LoginResponse(
                user.getId(),
                wholesalerRepository.findByUser_Id(user.getId()).map(wholesaler -> wholesaler.getId()).orElse(null),
                user.getEmail(),
                user.getName(),
                user.getRole().name(),
                user.getStatus().name()
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
