package org.example.controller;

import org.example.dto.CreateSaleRequest;
import org.example.dto.SaleResponse;
import org.example.service.SaleService;
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
@RequestMapping("/wholesalers/{wholesalerId}/sales")
public class SaleController {

    private final SaleService saleService;

    public SaleController(SaleService saleService) {
        this.saleService = saleService;
    }

    @PostMapping("/create")
    @ResponseStatus(HttpStatus.CREATED)
    public SaleResponse createSale(
            @PathVariable Long wholesalerId,
            @RequestBody CreateSaleRequest request
    ) {
        return saleService.createSale(wholesalerId, request);
    }
}
