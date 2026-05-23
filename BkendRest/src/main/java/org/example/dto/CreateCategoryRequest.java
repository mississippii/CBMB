package org.example.dto;

/** Admin adds a variety under a product. */
public record CreateCategoryRequest(
        Long productId,
        String name,
        Boolean usesLots   // true → wholesaler picks one of the 200 lots when receiving
) {
}
