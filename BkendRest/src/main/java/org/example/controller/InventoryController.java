package org.example.controller;

import java.util.List;
import org.example.dto.InventoryItemResponse;
import org.example.dto.StockWriteOffRequest;
import org.example.service.InventoryService;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/wholesalers/{wholesalerId}/inventory")
public class InventoryController {

    private final InventoryService inventoryService;

    public InventoryController(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    @PostMapping("/list")
    public List<InventoryItemResponse> listInventory(@PathVariable Long wholesalerId) {
        return inventoryService.listInventory(wholesalerId);
    }

    @PostMapping("/write-off")
    public InventoryItemResponse writeOff(
            @PathVariable Long wholesalerId,
            @RequestBody StockWriteOffRequest request
    ) {
        return inventoryService.writeOffDamaged(wholesalerId, request);
    }
}
