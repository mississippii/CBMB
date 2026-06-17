package org.example.controller;

import java.util.List;
import org.example.dto.SaleDetailResponse;
import org.example.dto.SupplierPortalOverviewResponse;
import org.example.dto.SupplierPortalSalesRequest;
import org.example.dto.SupplierPortalShipmentResponse;
import org.example.dto.TransactionResponse;
import org.example.dto.SupplierShipmentListRequest;
import org.example.service.SupplierPortalService;
import org.example.service.SupplierPortalTokenService;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

/**
 * Read-only endpoints for logged-in suppliers: their wholesalers, balances and
 * shipment status. The signed supplier portal token prevents callers from
 * changing the supplier id in the URL after login.
 */
@RestController
@RequestMapping("/supplier-portal/{supplierId}")
public class SupplierPortalController {

    private final SupplierPortalService supplierPortalService;
    private final SupplierPortalTokenService supplierPortalTokenService;

    public SupplierPortalController(
            SupplierPortalService supplierPortalService,
            SupplierPortalTokenService supplierPortalTokenService
    ) {
        this.supplierPortalService = supplierPortalService;
        this.supplierPortalTokenService = supplierPortalTokenService;
    }

    @PostMapping("/overview")
    public SupplierPortalOverviewResponse overview(
            @PathVariable Long supplierId,
            @RequestHeader(name = "X-Supplier-Portal-Token", required = false) String token
    ) {
        supplierPortalTokenService.requireValid(supplierId, token);
        return supplierPortalService.overview(supplierId);
    }


    @PostMapping("/sales/list")
    public List<TransactionResponse> sales(
            @PathVariable Long supplierId,
            @RequestHeader(name = "X-Supplier-Portal-Token", required = false) String token,
            @RequestBody SupplierPortalSalesRequest request
    ) {
        supplierPortalTokenService.requireValid(supplierId, token);
        return supplierPortalService.sales(supplierId, request == null ? null : request.accountId());
    }

    @PostMapping("/sales/{saleId}/detail")
    public SaleDetailResponse saleDetail(
            @PathVariable Long supplierId,
            @PathVariable Long saleId,
            @RequestHeader(name = "X-Supplier-Portal-Token", required = false) String token,
            @RequestBody SupplierPortalSalesRequest request
    ) {
        supplierPortalTokenService.requireValid(supplierId, token);
        return supplierPortalService.saleDetail(supplierId, request == null ? null : request.accountId(), saleId);
    }

    @PostMapping("/shipments/list")
    public List<SupplierPortalShipmentResponse> shipments(
            @PathVariable Long supplierId,
            @RequestHeader(name = "X-Supplier-Portal-Token", required = false) String token,
            @RequestBody(required = false) SupplierShipmentListRequest request
    ) {
        supplierPortalTokenService.requireValid(supplierId, token);
        return supplierPortalService.shipments(supplierId, request == null ? null : request.wholesalerId());
    }
}
