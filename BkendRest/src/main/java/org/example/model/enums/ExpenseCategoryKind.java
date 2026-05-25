package org.example.model.enums;

/**
 * Where an expense_category can be picked from:
 *   SUPPLIER — only on shipment/supplier expenses (recoverable from supplier).
 *   SHOP     — only on shop overhead (pure wholesaler cost).
 *   BOTH     — visible everywhere; safe default for back-compat with pre-split data.
 */
public enum ExpenseCategoryKind {
    SUPPLIER,
    SHOP,
    BOTH
}
