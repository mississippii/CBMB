package org.example.service;

import java.util.List;
import org.example.dto.CreateWholesalerRequest;
import org.example.dto.WholesalerResponse;
import org.example.exception.BadRequestException;
import org.example.model.RecordStatus;
import org.example.model.User;
import org.example.model.UserRole;
import org.example.model.Wholesaler;
import org.example.repository.UserRepository;
import org.example.repository.WholesalerRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminWholesalerService {

    private final UserRepository userRepository;
    private final WholesalerRepository wholesalerRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminWholesalerService(
            UserRepository userRepository,
            WholesalerRepository wholesalerRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.wholesalerRepository = wholesalerRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public WholesalerResponse createWholesaler(CreateWholesalerRequest request) {
        String name = requireText(request.name(), "Wholesaler user name is required.");
        String email = requireText(request.email(), "Wholesaler email is required.").toLowerCase();
        String password = requireText(request.password(), "Wholesaler password is required.");
        String businessName = requireText(request.businessName(), "Business name is required.");
        String phone = requireText(request.phone(), "Wholesaler phone is required.");
        String address = clean(request.address());

        if (userRepository.existsByEmail(email)) {
            throw new BadRequestException("A user with this email already exists.");
        }
        if (wholesalerRepository.existsByPhone(phone)) {
            throw new BadRequestException("A wholesaler with this phone already exists.");
        }

        User user = new User();
        user.setName(name);
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setRole(UserRole.WHOLESALER);
        user.setStatus(RecordStatus.ACTIVE);

        User savedUser = userRepository.save(user);

        Wholesaler wholesaler = new Wholesaler();
        wholesaler.setUser(savedUser);
        wholesaler.setBusinessName(businessName);
        wholesaler.setPhone(phone);
        wholesaler.setAddress(address);
        wholesaler.setStatus(RecordStatus.ACTIVE);

        return toResponse(wholesalerRepository.save(wholesaler));
    }

    @Transactional(readOnly = true)
    public List<WholesalerResponse> listWholesalers() {
        return wholesalerRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private WholesalerResponse toResponse(Wholesaler wholesaler) {
        User user = wholesaler.getUser();
        return new WholesalerResponse(
                wholesaler.getId(),
                user.getId(),
                user.getName(),
                user.getEmail(),
                wholesaler.getBusinessName(),
                wholesaler.getPhone(),
                wholesaler.getAddress(),
                wholesaler.getStatus().name(),
                wholesaler.getCreatedAt()
        );
    }

    private String requireText(String value, String message) {
        String cleaned = clean(value);
        if (cleaned == null || cleaned.isBlank()) {
            throw new BadRequestException(message);
        }
        return cleaned;
    }

    private String clean(String value) {
        return value == null ? null : value.trim();
    }
}
