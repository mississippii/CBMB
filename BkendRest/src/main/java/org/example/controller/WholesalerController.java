package org.example.controller;

import java.util.List;
import org.example.dto.CreateCustomerRequest;
import org.example.dto.CreateSupplierRequest;
import org.example.dto.CustomerAccountResponse;
import org.example.dto.ReceiveSupplierDeliveryRequest;
import org.example.dto.SupplierAccountResponse;
import org.example.dto.SupplierDeliveryResponse;
import org.example.service.SupplierDeliveryService;
import org.example.service.WholesalerService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/wholesalers/{wholesalerId}")
public class WholesalerController {

    private final WholesalerService wholesalerService;
    private final SupplierDeliveryService supplierDeliveryService;

    public WholesalerController(
            WholesalerService wholesalerService,
            SupplierDeliveryService supplierDeliveryService
    ) {
        this.wholesalerService = wholesalerService;
        this.supplierDeliveryService = supplierDeliveryService;
    }

    @PostMapping("/suppliers/list")
    public List<SupplierAccountResponse> listSuppliers(@PathVariable Long wholesalerId) {
        return wholesalerService.listSuppliers(wholesalerId);
    }

    @PostMapping("/suppliers/create")
    @ResponseStatus(HttpStatus.CREATED)
    public SupplierAccountResponse createSupplier(
            @PathVariable Long wholesalerId,
            @RequestBody CreateSupplierRequest request
    ) {
        return wholesalerService.createSupplier(wholesalerId, request);
    }

    @PostMapping("/customers/list")
    public List<CustomerAccountResponse> listCustomers(@PathVariable Long wholesalerId) {
        return wholesalerService.listCustomers(wholesalerId);
    }

    @PostMapping("/customers/create")
    @ResponseStatus(HttpStatus.CREATED)
    public CustomerAccountResponse createCustomer(
            @PathVariable Long wholesalerId,
            @RequestBody CreateCustomerRequest request
    ) {
        return wholesalerService.createCustomer(wholesalerId, request);
    }

    @PostMapping("/supplier-deliveries/create")
    @ResponseStatus(HttpStatus.CREATED)
    public SupplierDeliveryResponse receiveSupplierDelivery(
            @PathVariable Long wholesalerId,
            @RequestBody ReceiveSupplierDeliveryRequest request
    ) {
        return supplierDeliveryService.receiveSupplierDelivery(wholesalerId, request);
    }
}
