package org.example.controller;

import java.util.List;
import org.example.dto.ProductCatalogResponse;
import org.example.service.ProductService;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/products")
public class ProductController {

    private final ProductService productService;

    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    @PostMapping("/list")
    public List<ProductCatalogResponse> listProducts() {
        return productService.listActiveProducts();
    }
}
