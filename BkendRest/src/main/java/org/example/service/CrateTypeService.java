package org.example.service;

import java.util.List;
import java.util.Locale;
import org.example.dto.CrateTypeResponse;
import org.example.dto.CreateCrateTypeRequest;
import org.example.dto.UpdateCrateTypeRequest;
import org.example.exception.BadRequestException;
import org.example.model.BoxType;
import org.example.model.CrateType;
import org.example.model.Wholesaler;
import org.example.model.enums.RecordStatus;
import org.example.repository.BoxTypeRepository;
import org.example.repository.CrateTypeRepository;
import org.example.repository.WholesalerRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Global, admin-managed crate-type catalog. Names are normalised to UPPER CASE and
 * must be unique. Wholesalers consume the active list when adding / selling crates.
 *
 * Catalog changes propagate eagerly to every wholesaler's box_types so the global
 * catalog and each wholesaler's local copy stay in lockstep — adding a type makes it
 * available to all wholesalers immediately, disabling it retires it everywhere, and a
 * rename carries existing inventory/history along. (CrateService.ensureBoxTypesFromCatalog
 * still reconciles on dashboard load as a safety net.)
 */
@Service
public class CrateTypeService {

    private final CrateTypeRepository crateTypeRepository;
    private final WholesalerRepository wholesalerRepository;
    private final BoxTypeRepository boxTypeRepository;

    public CrateTypeService(
            CrateTypeRepository crateTypeRepository,
            WholesalerRepository wholesalerRepository,
            BoxTypeRepository boxTypeRepository
    ) {
        this.crateTypeRepository = crateTypeRepository;
        this.wholesalerRepository = wholesalerRepository;
        this.boxTypeRepository = boxTypeRepository;
    }

    @Transactional
    public CrateTypeResponse create(CreateCrateTypeRequest request) {
        String name = normalizeName(request == null ? null : request.name());
        if (crateTypeRepository.existsByNameIgnoreCase(name)) {
            throw new BadRequestException("Crate type '" + name + "' already exists.");
        }
        CrateType crateType = new CrateType();
        crateType.setName(name);
        crateType.setStatus(RecordStatus.ACTIVE);
        CrateTypeResponse response = toResponse(crateTypeRepository.save(crateType));
        syncBoxTypeAcrossWholesalers(name, RecordStatus.ACTIVE);
        return response;
    }

    @Transactional
    public CrateTypeResponse update(UpdateCrateTypeRequest request) {
        if (request == null || request.id() == null) {
            throw new BadRequestException("Crate type id is required.");
        }
        CrateType crateType = crateTypeRepository.findById(request.id())
                .orElseThrow(() -> new BadRequestException("Crate type not found."));

        String oldName = crateType.getName();
        if (request.name() != null && !request.name().isBlank()) {
            String name = normalizeName(request.name());
            crateTypeRepository.findByNameIgnoreCase(name)
                    .filter(other -> !other.getId().equals(crateType.getId()))
                    .ifPresent(other -> {
                        throw new BadRequestException("Another crate type already uses the name '" + name + "'.");
                    });
            crateType.setName(name);
        }
        if (request.status() != null && !request.status().isBlank()) {
            crateType.setStatus(parseStatus(request.status()));
        }
        CrateTypeResponse response = toResponse(crateTypeRepository.save(crateType));

        // Propagate name/status changes to every wholesaler's box_types.
        if (!oldName.equalsIgnoreCase(crateType.getName())) {
            renameBoxTypeAcrossWholesalers(oldName, crateType.getName());
        }
        syncBoxTypeAcrossWholesalers(crateType.getName(), crateType.getStatus());
        return response;
    }

    /** Upsert one crate type into every wholesaler's box_types, matching the catalog status. */
    private void syncBoxTypeAcrossWholesalers(String name, RecordStatus status) {
        for (Wholesaler wholesaler : wholesalerRepository.findAll()) {
            boxTypeRepository.findByWholesaler_IdAndNameIgnoreCase(wholesaler.getId(), name)
                    .ifPresentOrElse((existing) -> {
                        if (existing.getStatus() != status) {
                            existing.setStatus(status);
                            boxTypeRepository.save(existing);
                        }
                    }, () -> {
                        // Only materialise a row for an active type; no point seeding disabled ones.
                        if (status == RecordStatus.ACTIVE) {
                            BoxType boxType = new BoxType();
                            boxType.setWholesaler(wholesaler);
                            boxType.setName(name);
                            boxType.setStatus(RecordStatus.ACTIVE);
                            boxTypeRepository.save(boxType);
                        }
                    });
        }
    }

    /** Rename in place so inventory/balances/ledger (FK on box_type_id) stay attached. */
    private void renameBoxTypeAcrossWholesalers(String oldName, String newName) {
        for (Wholesaler wholesaler : wholesalerRepository.findAll()) {
            BoxType oldRow = boxTypeRepository
                    .findByWholesaler_IdAndNameIgnoreCase(wholesaler.getId(), oldName).orElse(null);
            if (oldRow == null) {
                continue;
            }
            boolean newNameTaken = boxTypeRepository
                    .findByWholesaler_IdAndNameIgnoreCase(wholesaler.getId(), newName).isPresent();
            if (newNameTaken) {
                // Can't rename onto an existing name (unique key) — retire the stale old row.
                oldRow.setStatus(RecordStatus.DISABLED);
            } else {
                oldRow.setName(newName);
            }
            boxTypeRepository.save(oldRow);
        }
    }

    @Transactional(readOnly = true)
    public List<CrateTypeResponse> list(boolean includeDisabled) {
        List<CrateType> rows = includeDisabled
                ? crateTypeRepository.findAllByOrderByNameAsc()
                : crateTypeRepository.findByStatusOrderByNameAsc(RecordStatus.ACTIVE);
        return rows.stream().map(this::toResponse).toList();
    }

    private CrateTypeResponse toResponse(CrateType crateType) {
        return new CrateTypeResponse(
                crateType.getId(),
                crateType.getName(),
                crateType.getStatus().name(),
                crateType.getCreatedAt()
        );
    }

    private String normalizeName(String value) {
        if (value == null || value.isBlank()) {
            throw new BadRequestException("Crate type name is required.");
        }
        String name = value.trim().toUpperCase(Locale.ROOT);
        if (name.length() > 80) {
            throw new BadRequestException("Crate type name is too long (max 80 characters).");
        }
        return name;
    }

    private RecordStatus parseStatus(String value) {
        try {
            return RecordStatus.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Invalid status. Allowed: ACTIVE, DISABLED.");
        }
    }
}
