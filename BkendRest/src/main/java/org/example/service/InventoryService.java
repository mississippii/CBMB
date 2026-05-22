package org.example.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import org.example.dto.InventoryItemResponse;
import org.example.dto.StockWriteOffRequest;
import org.example.exception.BadRequestException;
import org.example.model.Category;
import org.example.model.Inventory;
import org.example.model.StockLedger;
import org.example.model.Supplier;
import org.example.model.WholesalerSupplier;
import org.example.model.enums.InventoryStatus;
import org.example.model.enums.StockDirection;
import org.example.model.enums.StockReferenceType;
import org.example.repository.InventoryRepository;
import org.example.repository.StockLedgerRepository;
import org.example.repository.WholesalerRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InventoryService {

    private final WholesalerRepository wholesalerRepository;
    private final InventoryRepository inventoryRepository;
    private final StockLedgerRepository stockLedgerRepository;

    public InventoryService(
            WholesalerRepository wholesalerRepository,
            InventoryRepository inventoryRepository,
            StockLedgerRepository stockLedgerRepository
    ) {
        this.wholesalerRepository = wholesalerRepository;
        this.inventoryRepository = inventoryRepository;
        this.stockLedgerRepository = stockLedgerRepository;
    }

    /**
     * Write off damaged / non-saleable stock from one lot. Consignment model:
     * the supplier bears the loss, so this only removes stock and logs an audit
     * entry — there is no balance change (damaged goods generate no sale, so the
     * supplier's net payable already excludes them).
     */
    @Transactional
    public InventoryItemResponse writeOffDamaged(Long wholesalerId, StockWriteOffRequest request) {
        if (wholesalerId == null || !wholesalerRepository.existsById(wholesalerId)) {
            throw new BadRequestException("Wholesaler not found.");
        }
        if (request == null || request.inventoryId() == null) {
            throw new BadRequestException("Inventory item is required.");
        }
        Inventory inventory = inventoryRepository.findById(request.inventoryId())
                .orElseThrow(() -> new BadRequestException("Inventory item not found."));
        if (!inventory.getWholesaler().getId().equals(wholesalerId)) {
            throw new BadRequestException("Inventory item does not belong to this wholesaler.");
        }

        BigDecimal quantity = request.quantity() == null ? BigDecimal.ZERO : request.quantity();
        if (quantity.signum() <= 0) {
            throw new BadRequestException("Write-off quantity must be greater than zero.");
        }
        BigDecimal onHand = inventory.getQuantityOnHand() == null ? BigDecimal.ZERO : inventory.getQuantityOnHand();
        if (quantity.compareTo(onHand) > 0) {
            throw new BadRequestException("Write-off quantity cannot exceed available stock (" + onHand.toPlainString() + ").");
        }

        BigDecimal remaining = onHand.subtract(quantity).setScale(3, RoundingMode.HALF_UP);
        inventory.setQuantityOnHand(remaining);
        inventory.setStatus(remaining.signum() == 0 ? InventoryStatus.STOCK_OUT : InventoryStatus.ACTIVE);
        inventory = inventoryRepository.save(inventory);

        String reason = clean(request.reason());
        String note = clean(request.note());
        StringBuilder ledgerNote = new StringBuilder("Damage write-off");
        if (reason != null && !reason.isBlank()) ledgerNote.append(" — ").append(reason);
        if (note != null && !note.isBlank()) ledgerNote.append(" (").append(note).append(")");

        StockLedger ledger = new StockLedger();
        ledger.setWholesaler(inventory.getWholesaler());
        ledger.setWholesalerSupplier(inventory.getWholesalerSupplier());
        ledger.setProduct(inventory.getProduct());
        ledger.setCategory(inventory.getCategory());
        ledger.setReferenceType(StockReferenceType.ADJUSTMENT);
        ledger.setReferenceId(inventory.getDelivery() == null ? inventory.getId() : inventory.getDelivery().getId());
        ledger.setDirection(StockDirection.OUT);
        ledger.setQuantity(quantity);
        ledger.setNote(ledgerNote.toString());
        stockLedgerRepository.save(ledger);

        return toResponse(inventory);
    }

    private String clean(String value) {
        return value == null ? null : value.trim();
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
        org.example.model.SupplierDelivery delivery = inventory.getDelivery();

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
                delivery == null ? null : delivery.getId(),
                delivery == null ? null : delivery.getDeliveryDate(),
                inventory.getUpdatedAt()
        );
    }
}
