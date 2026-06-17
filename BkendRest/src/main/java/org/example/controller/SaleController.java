package org.example.controller;

import org.example.dto.CreateSaleRequest;
import org.example.dto.SaleCancellationResponse;
import org.example.dto.SaleDetailResponse;
import org.example.dto.SaleResponse;
import org.example.dto.SalesAggregateRequest;
import org.example.dto.SalesAggregateResponse;
import org.example.service.SaleCancellationService;
import org.example.service.SaleService;
import org.example.service.SalesAggregateService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/wholesalers/{wholesalerId}/sales")
public class SaleController {

    private final SaleService saleService;
    private final SalesAggregateService salesAggregateService;
    private final SaleCancellationService saleCancellationService;

    public SaleController(SaleService saleService, SalesAggregateService salesAggregateService,
                          SaleCancellationService saleCancellationService) {
        this.saleService = saleService;
        this.salesAggregateService = salesAggregateService;
        this.saleCancellationService = saleCancellationService;
    }

    @PostMapping("/create")
    @ResponseStatus(HttpStatus.CREATED)
    public SaleResponse createSale(
            @PathVariable Long wholesalerId,
            @RequestBody CreateSaleRequest request
    ) {
        return saleService.createSale(wholesalerId, request);
    }

    @PostMapping("/{saleId}/detail")
    public SaleDetailResponse detail(
            @PathVariable Long wholesalerId,
            @PathVariable Long saleId
    ) {
        return saleService.detail(wholesalerId, saleId);
    }

    @PostMapping("/transaction/{transactionCode}/detail")
    public SaleDetailResponse detailByTransactionCode(
            @PathVariable Long wholesalerId,
            @PathVariable String transactionCode
    ) {
        return saleService.detailByTransactionCode(wholesalerId, transactionCode);
    }

    @PostMapping("/aggregate")
    public SalesAggregateResponse aggregate(
            @PathVariable Long wholesalerId,
            @RequestBody(required = false) SalesAggregateRequest request
    ) {
        return salesAggregateService.aggregate(wholesalerId, request);
    }

    @PostMapping("/{saleId}/cancel")
    public SaleCancellationResponse cancelSale(
            @PathVariable Long wholesalerId,
            @PathVariable Long saleId,
            @RequestBody(required = false) java.util.Map<String, String> body
    ) {
        String reason = body == null ? null : body.get("reason");
        return saleCancellationService.cancelSale(wholesalerId, saleId, reason);
    }
}
