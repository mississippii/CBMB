package org.example.controller;

import org.example.dto.CustomerSettlementRequest;
import org.example.dto.PaymentOperationResponse;
import org.example.dto.SupplierCrateRequest;
import org.example.dto.SupplierSettlementRequest;
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

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/customer/settle")
    @ResponseStatus(HttpStatus.CREATED)
    public PaymentOperationResponse settleCustomer(
            @PathVariable Long wholesalerId,
            @RequestBody CustomerSettlementRequest request
    ) {
        return paymentService.settleCustomer(wholesalerId, request);
    }

    @PostMapping("/supplier/product-pay")
    @ResponseStatus(HttpStatus.CREATED)
    public PaymentOperationResponse paySupplierProduct(
            @PathVariable Long wholesalerId,
            @RequestBody SupplierSettlementRequest request
    ) {
        return paymentService.paySupplierProduct(wholesalerId, request);
    }

    @PostMapping("/supplier/commission-receive")
    @ResponseStatus(HttpStatus.CREATED)
    public PaymentOperationResponse receiveSupplierCommission(
            @PathVariable Long wholesalerId,
            @RequestBody SupplierSettlementRequest request
    ) {
        return paymentService.receiveSupplierCommission(wholesalerId, request);
    }

    @PostMapping("/supplier/expense-receive")
    @ResponseStatus(HttpStatus.CREATED)
    public PaymentOperationResponse receiveSupplierExpense(
            @PathVariable Long wholesalerId,
            @RequestBody SupplierSettlementRequest request
    ) {
        return paymentService.receiveSupplierExpense(wholesalerId, request);
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
}
