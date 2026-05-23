package org.example.dto;

/** A single lot (Lot1, Lot2, …) from the fixed system enumeration. */
public record SubCategoryResponse(
        Long id,
        String name,
        int sortOrder
) {
}
