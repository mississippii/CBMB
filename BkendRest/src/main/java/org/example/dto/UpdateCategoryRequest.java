package org.example.dto;

/** Admin renames or enables/disables an existing variety, or toggles its uses-lots flag. */
public record UpdateCategoryRequest(
        Long categoryId,
        String name,        // optional rename
        Boolean usesLots,   // optional flip
        String status       // optional ACTIVE/DISABLED
) {
}
