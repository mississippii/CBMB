package org.example.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.example.dto.CreateCustomerRequest;
import org.example.dto.CreateSupplierRequest;
import org.example.dto.CustomerAccountResponse;
import org.example.dto.ReceiveSupplierDeliveryRequest;
import org.example.dto.SupplierAccountResponse;
import org.example.dto.SupplierDeliveryResponse;
import org.example.service.WholesalerService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Wholesaler", description = "Supplier and customer account APIs for wholesaler users")
@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/wholesalers/{wholesalerId}")
public class WholesalerController {

    private final WholesalerService wholesalerService;

    public WholesalerController(WholesalerService wholesalerService) {
        this.wholesalerService = wholesalerService;
    }

    @Operation(summary = "List suppliers connected to a wholesaler")
    @GetMapping("/suppliers")
    public List<SupplierAccountResponse> listSuppliers(@PathVariable Long wholesalerId) {
        return wholesalerService.listSuppliers(wholesalerId);
    }

    @Operation(summary = "Create or connect a supplier for a wholesaler")
    @PostMapping("/suppliers")
    @ResponseStatus(HttpStatus.CREATED)
    public SupplierAccountResponse createSupplier(
            @PathVariable Long wholesalerId,
            @RequestBody CreateSupplierRequest request
    ) {
        return wholesalerService.createSupplier(wholesalerId, request);
    }

    @Operation(summary = "List customers connected to a wholesaler")
    @GetMapping("/customers")
    public List<CustomerAccountResponse> listCustomers(@PathVariable Long wholesalerId) {
        return wholesalerService.listCustomers(wholesalerId);
    }

    @Operation(summary = "Create or connect a customer for a wholesaler")
    @PostMapping("/customers")
    @ResponseStatus(HttpStatus.CREATED)
    public CustomerAccountResponse createCustomer(
            @PathVariable Long wholesalerId,
            @RequestBody CreateCustomerRequest request
    ) {
        return wholesalerService.createCustomer(wholesalerId, request);
    }

    @Operation(summary = "Receive supplier shipment and update product inventory")
    @PostMapping("/supplier-deliveries")
    @ResponseStatus(HttpStatus.CREATED)
    public SupplierDeliveryResponse receiveSupplierDelivery(
            @PathVariable Long wholesalerId,
            @RequestBody ReceiveSupplierDeliveryRequest request
    ) {
        return wholesalerService.receiveSupplierDelivery(wholesalerId, request);
    }
}
