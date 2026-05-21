package org.example.service;

import java.util.List;
import org.example.dto.CreateWholesalerRequest;
import org.example.dto.WholesalerResponse;
import org.example.exception.BadRequestException;
import org.example.model.BoxType;
import org.example.model.enums.RecordStatus;
import org.example.model.enums.UserRole;
import org.example.model.User;
import org.example.model.Wholesaler;
import org.example.repository.BoxTypeRepository;
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
    private final BoxTypeRepository boxTypeRepository;

    public AdminWholesalerService(
            UserRepository userRepository,
            WholesalerRepository wholesalerRepository,
            PasswordEncoder passwordEncoder,
            BoxTypeRepository boxTypeRepository
    ) {
        this.userRepository = userRepository;
        this.wholesalerRepository = wholesalerRepository;
        this.passwordEncoder = passwordEncoder;
        this.boxTypeRepository = boxTypeRepository;
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

        Wholesaler savedWholesaler = wholesalerRepository.save(wholesaler);
        createDefaultBoxTypes(savedWholesaler);

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

    private void createDefaultBoxTypes(Wholesaler wholesaler) {
        createBoxType(wholesaler, "BANGLA");
        createBoxType(wholesaler, "CHINA");
    }

    private void createBoxType(Wholesaler wholesaler, String name) {
        BoxType boxType = new BoxType();
        boxType.setWholesaler(wholesaler);
        boxType.setName(name);
        boxType.setStatus(RecordStatus.ACTIVE);
        boxTypeRepository.save(boxType);
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
