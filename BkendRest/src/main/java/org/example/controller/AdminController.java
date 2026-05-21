package org.example.controller;

import java.util.List;
import org.example.dto.CreateProductRequest;
import org.example.dto.CreateWholesalerRequest;
import org.example.dto.PageResponse;
import org.example.dto.ProductCatalogResponse;
import org.example.dto.ResetPasswordRequest;
import org.example.dto.WholesalerListRequest;
import org.example.dto.WholesalerResponse;
import org.example.service.AdminWholesalerService;
import org.example.service.ProductService;
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
@RequestMapping("/admin")
public class AdminController {

    private final AdminWholesalerService adminWholesalerService;
    private final ProductService productService;

    public AdminController(AdminWholesalerService adminWholesalerService, ProductService productService) {
        this.adminWholesalerService = adminWholesalerService;
        this.productService = productService;
    }

    @PostMapping("/wholesalers/list")
    public List<WholesalerResponse> listWholesalers() {
        return adminWholesalerService.listWholesalers();
    }

    @PostMapping("/wholesalers/search")
    public PageResponse<WholesalerResponse> searchWholesalers(@RequestBody(required = false) WholesalerListRequest request) {
        return adminWholesalerService.listWholesalersPaged(request);
    }

    @PostMapping("/wholesalers/create")
    @ResponseStatus(HttpStatus.CREATED)
    public WholesalerResponse createWholesaler(@RequestBody CreateWholesalerRequest request) {
        return adminWholesalerService.createWholesaler(request);
    }

    @PostMapping("/wholesalers/{wholesalerId}/reset-password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void resetPassword(@PathVariable Long wholesalerId, @RequestBody ResetPasswordRequest request) {
        adminWholesalerService.resetWholesalerPassword(wholesalerId, request.newPassword());
    }

    @PostMapping("/products/list")
    public List<ProductCatalogResponse> listProducts() {
        return productService.listActiveProducts();
    }

    @PostMapping("/products/create")
    @ResponseStatus(HttpStatus.CREATED)
    public ProductCatalogResponse createProduct(@RequestBody CreateProductRequest request) {
        return productService.createProduct(request);
    }
}
