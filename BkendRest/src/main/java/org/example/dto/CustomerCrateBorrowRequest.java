package org.example.dto;

import java.math.BigDecimal;
import java.util.List;

public record CustomerCrateBorrowRequest(
        Long wholesalerCustomerId,
        List<CrateLineRequest> crates,
        /** Optional refundable deposit taken against the borrowed crates (cash in). */
        BigDecimal depositAmount,
        String note,
        Long saleId
) {
}
