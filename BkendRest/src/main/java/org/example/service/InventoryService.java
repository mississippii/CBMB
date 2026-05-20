package org.example.service;

import java.util.List;
import org.example.dto.InventoryItemResponse;
import org.example.exception.BadRequestException;
import org.example.model.Category;
import org.example.model.Inventory;
import org.example.model.Supplier;
import org.example.model.WholesalerSupplier;
import org.example.repository.InventoryRepository;
import org.example.repository.WholesalerRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InventoryService {

    private final WholesalerRepository wholesalerRepository;
    private final InventoryRepository inventoryRepository;

    public InventoryService(
            WholesalerRepository wholesalerRepository,
            InventoryRepository inventoryRepository
    ) {
        this.wholesalerRepository = wholesalerRepository;
        this.inventoryRepository = inventoryRepository;
    }

    @Transactional(readOnly = true)
    public List<InventoryItemResponse> listInventory(Long wholesalerId) {
        if (wholesalerId == null || !wholesalerRepository.existsById(wholesalerId)) {
            throw new BadRequestException("Wholesaler not found.");
        }

        return inventoryRepository.findByWholesaler_IdOrderByUpdatedAtDesc(wholesalerId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private InventoryItemResponse toResponse(Inventory inventory) {
        WholesalerSupplier account = inventory.getWholesalerSupplier();
        Supplier supplier = account.getSupplier();
        Category category = inventory.getCategory();

        return new InventoryItemResponse(
                inventory.getId(),
                inventory.getWholesaler().getId(),
                account.getId(),
                supplier.getId(),
                supplier.getName(),
                supplier.getPhone(),
                inventory.getProduct().getId(),
                inventory.getProduct().getName(),
                category == null ? null : category.getId(),
                category == null ? null : category.getName(),
                category == null ? null : category.getGrade(),
                inventory.getQuantityOnHand(),
                inventory.getUnit().name(),
                inventory.getStatus().name(),
                inventory.getUpdatedAt()
        );
    }
}
