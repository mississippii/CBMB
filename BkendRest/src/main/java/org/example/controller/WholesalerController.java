package org.example.controller;

import java.util.List;
import org.example.dto.CreateCustomerRequest;
import org.example.dto.CreateSupplierRequest;
import org.example.dto.CustomerAccountResponse;
import org.example.dto.CustomerProfileResponse;
import org.example.dto.DashboardSummaryRequest;
import org.example.dto.DashboardSummaryResponse;
import org.example.dto.ProfileRequest;
import org.example.dto.ReceiveSupplierDeliveryRequest;
import org.example.dto.SetShipmentCommissionRequest;
import org.example.dto.SettleShipmentRequest;
import org.example.dto.SupplierAccountResponse;
import org.example.dto.SupplierProfileResponse;
import org.example.dto.SupplierDeliveryResponse;
import org.example.service.DashboardService;
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
    private final DashboardService dashboardService;

    public WholesalerController(
            WholesalerService wholesalerService,
            SupplierDeliveryService supplierDeliveryService,
            DashboardService dashboardService
    ) {
        this.wholesalerService = wholesalerService;
        this.supplierDeliveryService = supplierDeliveryService;
        this.dashboardService = dashboardService;
    }

    @PostMapping("/dashboard/summary")
    public DashboardSummaryResponse dashboardSummary(
            @PathVariable Long wholesalerId,
            @RequestBody(required = false) DashboardSummaryRequest request
    ) {
        return dashboardService.summary(wholesalerId, request);
    }

    @PostMapping("/suppliers/list")
    public List<SupplierAccountResponse> listSuppliers(
            @PathVariable Long wholesalerId,
            @RequestBody(required = false) java.util.Map<String, Object> body
    ) {
        boolean includeDisabled = body != null && Boolean.TRUE.equals(body.get("includeDisabled"));
        return wholesalerService.listSuppliers(wholesalerId, includeDisabled);
    }

    @PostMapping("/suppliers/disable")
    public SupplierAccountResponse disableSupplier(
            @PathVariable Long wholesalerId,
            @RequestBody org.example.dto.AccountStatusRequest request
    ) {
        return wholesalerService.disableSupplier(wholesalerId, request == null ? null : request.accountId());
    }

    @PostMapping("/suppliers/enable")
    public SupplierAccountResponse enableSupplier(
            @PathVariable Long wholesalerId,
            @RequestBody org.example.dto.AccountStatusRequest request
    ) {
        return wholesalerService.enableSupplier(wholesalerId, request == null ? null : request.accountId());
    }

    @PostMapping("/suppliers/create")
    @ResponseStatus(HttpStatus.CREATED)
    public SupplierAccountResponse createSupplier(
            @PathVariable Long wholesalerId,
            @RequestBody CreateSupplierRequest request
    ) {
        return wholesalerService.createSupplier(wholesalerId, request);
    }

    @PostMapping("/suppliers/profile")
    public SupplierProfileResponse supplierProfile(
            @PathVariable Long wholesalerId,
            @RequestBody ProfileRequest request
    ) {
        return wholesalerService.getSupplierProfile(wholesalerId, request == null ? null : request.accountId());
    }

    @PostMapping("/suppliers/update")
    public SupplierAccountResponse updateSupplier(
            @PathVariable Long wholesalerId,
            @RequestBody org.example.dto.UpdateSupplierRequest request
    ) {
        return wholesalerService.updateSupplier(wholesalerId, request);
    }

    @PostMapping("/customers/list")
    public List<CustomerAccountResponse> listCustomers(
            @PathVariable Long wholesalerId,
            @RequestBody(required = false) java.util.Map<String, Object> body
    ) {
        boolean includeDisabled = body != null && Boolean.TRUE.equals(body.get("includeDisabled"));
        return wholesalerService.listCustomers(wholesalerId, includeDisabled);
    }

    @PostMapping("/customers/disable")
    public CustomerAccountResponse disableCustomer(
            @PathVariable Long wholesalerId,
            @RequestBody org.example.dto.AccountStatusRequest request
    ) {
        return wholesalerService.disableCustomer(wholesalerId, request == null ? null : request.accountId());
    }

    @PostMapping("/customers/enable")
    public CustomerAccountResponse enableCustomer(
            @PathVariable Long wholesalerId,
            @RequestBody org.example.dto.AccountStatusRequest request
    ) {
        return wholesalerService.enableCustomer(wholesalerId, request == null ? null : request.accountId());
    }

    @PostMapping("/customers/create")
    @ResponseStatus(HttpStatus.CREATED)
    public CustomerAccountResponse createCustomer(
            @PathVariable Long wholesalerId,
            @RequestBody CreateCustomerRequest request
    ) {
        return wholesalerService.createCustomer(wholesalerId, request);
    }

    @PostMapping("/customers/profile")
    public CustomerProfileResponse customerProfile(
            @PathVariable Long wholesalerId,
            @RequestBody ProfileRequest request
    ) {
        return wholesalerService.getCustomerProfile(wholesalerId, request == null ? null : request.accountId());
    }

    @PostMapping("/supplier-deliveries/list")
    public List<SupplierDeliveryResponse> listSupplierDeliveries(@PathVariable Long wholesalerId) {
        return supplierDeliveryService.listSupplierDeliveries(wholesalerId);
    }

    @PostMapping("/supplier-deliveries/create")
    @ResponseStatus(HttpStatus.CREATED)
    public SupplierDeliveryResponse receiveSupplierDelivery(
            @PathVariable Long wholesalerId,
            @RequestBody ReceiveSupplierDeliveryRequest request
    ) {
        return supplierDeliveryService.receiveSupplierDelivery(wholesalerId, request);
    }

    @PostMapping("/shipments/by-supplier")
    public List<SupplierDeliveryResponse> shipmentsBySupplier(
            @PathVariable Long wholesalerId,
            @RequestBody ProfileRequest request
    ) {
        return supplierDeliveryService.listShipmentsForSupplier(wholesalerId, request == null ? null : request.accountId());
    }

    @PostMapping("/shipments/set-commission")
    public SupplierDeliveryResponse setShipmentCommission(
            @PathVariable Long wholesalerId,
            @RequestBody SetShipmentCommissionRequest request
    ) {
        return supplierDeliveryService.setCommissionRate(wholesalerId, request);
    }

    @PostMapping("/shipments/settle")
    public SupplierDeliveryResponse settleShipment(
            @PathVariable Long wholesalerId,
            @RequestBody SettleShipmentRequest request
    ) {
        return supplierDeliveryService.setSettlementStatus(wholesalerId, request);
    }
}
