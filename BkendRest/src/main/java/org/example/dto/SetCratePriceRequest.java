package org.example.dto;

import java.math.BigDecimal;

/** Wholesaler's purchase cost per crate of a given type. Used to value P&L losses. */
public record SetCratePriceRequest(String crateType, BigDecimal purchasePrice) {
}
