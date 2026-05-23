package org.example.service;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.example.dto.CategoryCatalogResponse;
import org.example.dto.CreateProductRequest;
import org.example.dto.ProductCatalogResponse;
import org.example.dto.SubCategoryResponse;
import org.example.dto.UpdateCategoryRequest;
import org.example.exception.BadRequestException;
import org.example.exception.ConflictException;
import org.example.model.Category;
import org.example.model.Product;
import org.example.model.SubCategory;
import org.example.model.enums.RecordStatus;
import org.example.repository.CategoryRepository;
import org.example.repository.ProductRepository;
import org.example.repository.SubCategoryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final SubCategoryRepository subCategoryRepository;

    public ProductService(
            ProductRepository productRepository,
            CategoryRepository categoryRepository,
            SubCategoryRepository subCategoryRepository
    ) {
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
        this.subCategoryRepository = subCategoryRepository;
    }

    @Transactional(readOnly = true)
    public List<ProductCatalogResponse> listActiveProducts() {
        return productRepository.findByStatusOrderByNameAsc(RecordStatus.ACTIVE)
                .stream()
                .map(this::toProductResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<SubCategoryResponse> listSubCategories() {
        return subCategoryRepository.findAllByOrderBySortOrderAsc().stream()
                .map(s -> new SubCategoryResponse(s.getId(), s.getName(), s.getSortOrder()))
                .toList();
    }

    @Transactional
    public ProductCatalogResponse createProduct(CreateProductRequest request) {
        if (request == null) throw new BadRequestException("Request body is required.");
        String name = requireText(request.name(), "Product name is required.");
        productRepository.findByNameIgnoreCase(name).ifPresent(p -> {
            throw new ConflictException("A product with this name already exists.");
        });

        Product product = new Product();
        product.setName(name);
        product.setStatus(RecordStatus.ACTIVE);
        Product saved = productRepository.save(product);

        // Optional seed varieties (flat, no lots wired yet — admin can toggle usesLots after).
        List<CreateProductRequest.CategoryInputRequest> inputs =
                request.categories() == null ? List.of() : request.categories();
        Set<String> dedupe = new HashSet<>();
        for (CreateProductRequest.CategoryInputRequest input : inputs) {
            String catName = clean(input.name());
            if (catName == null || catName.isBlank()) continue;
            if (!dedupe.add(catName.toLowerCase())) continue;
            Category cat = new Category();
            cat.setProduct(saved);
            cat.setName(catName);
            cat.setUsesLots(false);
            cat.setStatus(RecordStatus.ACTIVE);
            categoryRepository.save(cat);
        }
        return toProductResponse(saved);
    }

    @Transactional
    public CategoryCatalogResponse createCategory(org.example.dto.CreateCategoryRequest request) {
        if (request == null || request.productId() == null) {
            throw new BadRequestException("Product is required.");
        }
        String name = requireText(request.name(), "Variety name is required.");
        Product product = productRepository.findById(request.productId())
                .orElseThrow(() -> new BadRequestException("Product not found."));
        categoryRepository.findByProduct_IdAndNameIgnoreCase(product.getId(), name).ifPresent(c -> {
            throw new ConflictException("A variety with this name already exists for this product.");
        });
        Category cat = new Category();
        cat.setProduct(product);
        cat.setName(name);
        cat.setUsesLots(Boolean.TRUE.equals(request.usesLots()));
        cat.setStatus(RecordStatus.ACTIVE);
        Category saved = categoryRepository.save(cat);
        return toCategoryResponse(saved);
    }

    @Transactional
    public CategoryCatalogResponse updateCategory(UpdateCategoryRequest request) {
        if (request == null || request.categoryId() == null) {
            throw new BadRequestException("Variety is required.");
        }
        Category cat = categoryRepository.findById(request.categoryId())
                .orElseThrow(() -> new BadRequestException("Variety not found."));
        if (request.name() != null && !request.name().isBlank()) {
            String newName = request.name().trim();
            if (!newName.equalsIgnoreCase(cat.getName())) {
                categoryRepository.findByProduct_IdAndNameIgnoreCase(cat.getProduct().getId(), newName)
                        .ifPresent(c -> { throw new ConflictException("A variety with this name already exists for this product."); });
                cat.setName(newName);
            }
        }
        if (request.usesLots() != null) {
            cat.setUsesLots(request.usesLots());
        }
        if (request.status() != null && !request.status().isBlank()) {
            try {
                cat.setStatus(RecordStatus.valueOf(request.status().trim().toUpperCase()));
            } catch (IllegalArgumentException e) {
                throw new BadRequestException("Status must be ACTIVE or DISABLED.");
            }
        }
        return toCategoryResponse(categoryRepository.save(cat));
    }

    private ProductCatalogResponse toProductResponse(Product product) {
        List<CategoryCatalogResponse> varieties = categoryRepository
                .findByProduct_IdAndStatusOrderByNameAsc(product.getId(), RecordStatus.ACTIVE)
                .stream()
                .map(this::toCategoryResponse)
                .toList();
        return new ProductCatalogResponse(
                product.getId(),
                product.getName(),
                product.getStatus().name(),
                varieties
        );
    }

    private CategoryCatalogResponse toCategoryResponse(Category c) {
        return new CategoryCatalogResponse(c.getId(), c.getName(), c.isUsesLots(), c.getStatus().name());
    }

    private String requireText(String value, String message) {
        String cleaned = clean(value);
        if (cleaned == null || cleaned.isBlank()) throw new BadRequestException(message);
        return cleaned;
    }

    private String clean(String value) {
        return value == null ? null : value.trim();
    }
}
