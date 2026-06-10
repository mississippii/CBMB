package org.example.controller;

import java.util.List;
import org.example.dto.CreateProductRequest;
import org.example.dto.CreateWholesalerRequest;
import org.example.dto.PageResponse;
import org.example.dto.ProductCatalogResponse;
import org.example.dto.ResetPasswordRequest;
import org.example.dto.WholesalerListRequest;
import org.example.dto.WholesalerResponse;
import org.example.dto.BalanceAuditResponse;
import org.example.dto.CrateTypeResponse;
import org.example.dto.CreateCrateTypeRequest;
import org.example.dto.UpdateCrateTypeRequest;
import org.example.service.AdminWholesalerService;
import org.example.service.BalanceAuditService;
import org.example.service.CrateTypeService;
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
    private final BalanceAuditService balanceAuditService;
    private final CrateTypeService crateTypeService;

    public AdminController(AdminWholesalerService adminWholesalerService, ProductService productService,
                           BalanceAuditService balanceAuditService, CrateTypeService crateTypeService) {
        this.adminWholesalerService = adminWholesalerService;
        this.productService = productService;
        this.balanceAuditService = balanceAuditService;
        this.crateTypeService = crateTypeService;
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

    @PostMapping("/wholesalers/{wholesalerId}/update")
    public WholesalerResponse updateWholesaler(
            @PathVariable Long wholesalerId,
            @RequestBody org.example.dto.UpdateWholesalerRequest request) {
        return adminWholesalerService.updateWholesaler(wholesalerId, request);
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

    @PostMapping("/categories/create")
    @ResponseStatus(HttpStatus.CREATED)
    public org.example.dto.CategoryCatalogResponse createCategory(
            @RequestBody org.example.dto.CreateCategoryRequest request) {
        return productService.createCategory(request);
    }

    @PostMapping("/categories/update")
    public org.example.dto.CategoryCatalogResponse updateCategory(
            @RequestBody org.example.dto.UpdateCategoryRequest request) {
        return productService.updateCategory(request);
    }

    @PostMapping("/sub-categories/list")
    public java.util.List<org.example.dto.SubCategoryResponse> listSubCategories() {
        return productService.listSubCategories();
    }

    // ---- Crates Service: global crate-type catalog ----

    @PostMapping("/crate-types/list")
    public List<CrateTypeResponse> listCrateTypes() {
        return crateTypeService.list(true);
    }

    @PostMapping("/crate-types/create")
    @ResponseStatus(HttpStatus.CREATED)
    public CrateTypeResponse createCrateType(@RequestBody CreateCrateTypeRequest request) {
        return crateTypeService.create(request);
    }

    @PostMapping("/crate-types/update")
    public CrateTypeResponse updateCrateType(@RequestBody UpdateCrateTypeRequest request) {
        return crateTypeService.update(request);
    }

    @PostMapping("/wholesalers/{wholesalerId}/balances/audit")
    public BalanceAuditResponse auditBalances(@PathVariable Long wholesalerId) {
        return balanceAuditService.audit(wholesalerId);
    }
}
