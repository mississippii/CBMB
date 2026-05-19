package org.example.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.example.dto.CategoryCatalogResponse;
import org.example.dto.ProductCatalogResponse;
import org.example.model.Category;
import org.example.model.Product;
import org.example.model.enums.RecordStatus;
import org.example.repository.CategoryRepository;
import org.example.repository.ProductRepository;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Products", description = "Product catalog APIs")
@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/products")
public class ProductController {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;

    public ProductController(ProductRepository productRepository, CategoryRepository categoryRepository) {
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
    }

    @Operation(summary = "List active products with active categories")
    @GetMapping
    public List<ProductCatalogResponse> listProducts() {
        return productRepository.findByStatusOrderByNameAsc(RecordStatus.ACTIVE)
                .stream()
                .map(this::toProductResponse)
                .toList();
    }

    private ProductCatalogResponse toProductResponse(Product product) {
        List<CategoryCatalogResponse> categories = categoryRepository
                .findByProduct_IdAndStatusOrderByNameAscGradeAsc(product.getId(), RecordStatus.ACTIVE)
                .stream()
                .map(this::toCategoryResponse)
                .toList();

        return new ProductCatalogResponse(
                product.getId(),
                product.getName(),
                product.getDefaultUnit().name(),
                product.getUnitType().name(),
                product.getStatus().name(),
                categories
        );
    }

    private CategoryCatalogResponse toCategoryResponse(Category category) {
        return new CategoryCatalogResponse(
                category.getId(),
                category.getName(),
                category.getGrade(),
                category.getStatus().name()
        );
    }
}
