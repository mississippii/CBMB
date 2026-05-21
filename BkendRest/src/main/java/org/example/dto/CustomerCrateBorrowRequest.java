package org.example.dto;

import java.math.BigDecimal;

public record CustomerCrateBorrowRequest(
        Long wholesalerCustomerId,
        Integer banglaCrates,
        Integer chinaCrates,
        BigDecimal jamanotAmount,
        String note
) {
}
