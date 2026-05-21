package org.example.service;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.example.dto.CategoryCatalogResponse;
import org.example.dto.CreateProductRequest;
import org.example.dto.ProductCatalogResponse;
import org.example.exception.BadRequestException;
import org.example.exception.ConflictException;
import org.example.model.Category;
import org.example.model.Product;
import org.example.model.enums.ProductUnitType;
import org.example.model.enums.RecordStatus;
import org.example.model.enums.UnitType;
import org.example.repository.CategoryRepository;
import org.example.repository.ProductRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProductService {

    private static final Set<UnitType> COUNT_UNITS =
            Set.of(UnitType.PCS, UnitType.DOZEN, UnitType.BOX, UnitType.BAG);
    private static final Set<UnitType> WEIGHT_UNITS =
            Set.of(UnitType.KG, UnitType.MOUND);

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

    @Transactional
    public ProductCatalogResponse createProduct(CreateProductRequest request) {
        if (request == null) {
            throw new BadRequestException("Request body is required.");
        }

        String name = requireText(request.name(), "Product name is required.");
        ProductUnitType unitType = parseUnitType(request.unitType());
        UnitType defaultUnit = parseUnit(request.defaultUnit());

        if (unitType == ProductUnitType.WEIGHT && !WEIGHT_UNITS.contains(defaultUnit)) {
            throw new BadRequestException("WEIGHT products must use KG or MOUND.");
        }
        if (unitType == ProductUnitType.COUNT && !COUNT_UNITS.contains(defaultUnit)) {
            throw new BadRequestException("COUNT products must use PCS, DOZEN, BOX or BAG.");
        }

        productRepository.findByNameIgnoreCase(name).ifPresent(p -> {
            throw new ConflictException("A product with this name already exists.");
        });

        Product product = new Product();
        product.setName(name);
        product.setUnitType(unitType);
        product.setDefaultUnit(defaultUnit);
        product.setStatus(RecordStatus.ACTIVE);
        Product saved = productRepository.save(product);

        List<CreateProductRequest.CategoryInputRequest> categoryInputs =
                request.categories() == null ? List.of() : request.categories();
        Set<String> dedupe = new HashSet<>();
        for (CreateProductRequest.CategoryInputRequest input : categoryInputs) {
            String catName = clean(input.name());
            String grade = input.grade() == null ? "" : input.grade().trim();
            if (catName == null || catName.isBlank()) continue;
            String key = catName.toLowerCase() + "|" + grade.toLowerCase();
            if (!dedupe.add(key)) continue;

            Category category = new Category();
            category.setProduct(saved);
            category.setName(catName);
            category.setGrade(grade);
            category.setStatus(RecordStatus.ACTIVE);
            categoryRepository.save(category);
        }

        return toProductResponse(saved);
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

    private ProductUnitType parseUnitType(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new BadRequestException("Unit type is required (COUNT or WEIGHT).");
        }
        try {
            return ProductUnitType.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Unit type must be COUNT or WEIGHT.");
        }
    }

    private UnitType parseUnit(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new BadRequestException("Default unit is required.");
        }
        try {
            return UnitType.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Default unit must be one of PCS, DOZEN, BOX, BAG, KG, MOUND.");
        }
    }

    private String requireText(String value, String message) {
        String cleaned = clean(value);
        if (cleaned == null || cleaned.isBlank()) {
            throw new BadRequestException(message);
        }
        return cleaned;
    }

    private String clean(String value) {
        return value == null ? null : value.trim();
    }
}
