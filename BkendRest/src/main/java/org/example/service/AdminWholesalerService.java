package org.example.service;

import java.util.List;
import org.example.dto.CreateWholesalerRequest;
import org.example.dto.PageResponse;
import org.example.dto.WholesalerListRequest;
import org.example.dto.WholesalerResponse;
import org.example.exception.BadRequestException;
import org.example.model.enums.RecordStatus;
import org.example.model.enums.UserRole;
import org.example.model.User;
import org.example.model.Wholesaler;
import org.example.repository.UserRepository;
import org.example.repository.WholesalerRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
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

        // Crate types come from the admin-managed global catalog and are mirrored into
        // each wholesaler's box_types on dashboard load (CrateService.ensureBoxTypesFromCatalog).
        // No per-wholesaler seeding — the catalog is the single source of truth.
        Wholesaler savedWholesaler = wholesalerRepository.save(wholesaler);

        return toResponse(savedWholesaler);
    }

    @Transactional
    public void resetWholesalerPassword(Long wholesalerId, String newPassword) {
        if (newPassword == null || newPassword.trim().length() < 8) {
            throw new BadRequestException("New password must be at least 8 characters.");
        }
        Wholesaler wholesaler = wholesalerRepository.findById(wholesalerId)
                .orElseThrow(() -> new BadRequestException("Wholesaler not found."));

        User user = wholesaler.getUser();
        user.setPasswordHash(passwordEncoder.encode(newPassword.trim()));
        userRepository.save(user);
    }

    @Transactional(readOnly = true)
    public List<WholesalerResponse> listWholesalers() {
        return wholesalerRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public PageResponse<WholesalerResponse> listWholesalersPaged(WholesalerListRequest request) {
        int page = (request == null || request.page() == null || request.page() < 0) ? 0 : request.page();
        int size = (request == null || request.size() == null || request.size() <= 0 || request.size() > 200)
                ? 20 : request.size();
        String phone = request == null ? null : request.phone();
        String normalized = phone == null ? "" : phone.replaceAll("\\D", "").trim();

        Pageable pageable = PageRequest.of(page, size);
        Page<Wholesaler> result = normalized.isEmpty()
                ? wholesalerRepository.findAllByOrderByCreatedAtDesc(pageable)
                : wholesalerRepository.findByPhoneContainingOrderByCreatedAtDesc(normalized, pageable);

        return new PageResponse<>(
                result.getContent().stream().map(this::toResponse).toList(),
                result.getNumber(),
                result.getSize(),
                result.getTotalElements(),
                result.getTotalPages()
        );
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
