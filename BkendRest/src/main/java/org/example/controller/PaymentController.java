package org.example.controller;

import org.example.dto.CustomerCrateBorrowRequest;
import org.example.dto.CustomerSettlementRequest;
import org.example.dto.PaymentCancellationResponse;
import org.example.dto.PaymentOperationResponse;
import org.example.dto.SupplierCrateRequest;
import org.example.dto.SupplierSettlementRequest;
import org.example.service.PaymentCancellationService;
import org.example.service.PaymentService;
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
@RequestMapping("/wholesalers/{wholesalerId}/payments")
public class PaymentController {

    private final PaymentService paymentService;
    private final PaymentCancellationService paymentCancellationService;

    public PaymentController(PaymentService paymentService, PaymentCancellationService paymentCancellationService) {
        this.paymentService = paymentService;
        this.paymentCancellationService = paymentCancellationService;
    }

    @PostMapping("/customer/settle")
    @ResponseStatus(HttpStatus.CREATED)
    public PaymentOperationResponse settleCustomer(
            @PathVariable Long wholesalerId,
            @RequestBody CustomerSettlementRequest request
    ) {
        return paymentService.settleCustomer(wholesalerId, request);
    }

    @PostMapping("/customer/crate-borrow")
    @ResponseStatus(HttpStatus.CREATED)
    public PaymentOperationResponse borrowCustomerCrates(
            @PathVariable Long wholesalerId,
            @RequestBody CustomerCrateBorrowRequest request
    ) {
        return paymentService.borrowCustomerCrates(wholesalerId, request);
    }

    @PostMapping("/supplier/product-pay")
    @ResponseStatus(HttpStatus.CREATED)
    public PaymentOperationResponse paySupplierProduct(
            @PathVariable Long wholesalerId,
            @RequestBody SupplierSettlementRequest request
    ) {
        return paymentService.paySupplierProduct(wholesalerId, request);
    }

    @PostMapping("/supplier/crate-give")
    @ResponseStatus(HttpStatus.CREATED)
    public PaymentOperationResponse giveSupplierCrates(
            @PathVariable Long wholesalerId,
            @RequestBody SupplierCrateRequest request
    ) {
        return paymentService.giveSupplierCrates(wholesalerId, request);
    }

    @PostMapping("/supplier/crate-return")
    @ResponseStatus(HttpStatus.CREATED)
    public PaymentOperationResponse returnSupplierCrates(
            @PathVariable Long wholesalerId,
            @RequestBody SupplierCrateRequest request
    ) {
        return paymentService.returnSupplierCrates(wholesalerId, request);
    }

    @PostMapping("/customer/{paymentId}/cancel")
    public PaymentCancellationResponse cancelCustomerPayment(
            @PathVariable Long wholesalerId,
            @PathVariable Long paymentId,
            @RequestBody(required = false) java.util.Map<String, String> body
    ) {
        String reason = body == null ? null : body.get("reason");
        return paymentCancellationService.cancelCustomerPayment(wholesalerId, paymentId, reason);
    }

    @PostMapping("/supplier/{settlementId}/cancel")
    public PaymentCancellationResponse cancelSupplierSettlement(
            @PathVariable Long wholesalerId,
            @PathVariable Long settlementId,
            @RequestBody(required = false) java.util.Map<String, String> body
    ) {
        String reason = body == null ? null : body.get("reason");
        return paymentCancellationService.cancelSupplierSettlement(wholesalerId, settlementId, reason);
    }
}
