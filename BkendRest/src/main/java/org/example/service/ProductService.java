package org.example.service;

import java.util.List;
import org.example.dto.CategoryCatalogResponse;
import org.example.dto.ProductCatalogResponse;
import org.example.model.Category;
import org.example.model.Product;
import org.example.model.enums.RecordStatus;
import org.example.repository.CategoryRepository;
import org.example.repository.ProductRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;

    public ProductService(ProductRepository productRepository, CategoryRepository categoryRepository) {
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
    }

    @Transactional(readOnly = true)
    public List<ProductCatalogResponse> listActiveProducts() {
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
