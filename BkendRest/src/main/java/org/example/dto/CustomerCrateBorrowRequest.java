package org.example.dto;

import java.util.List;

public record CustomerCrateBorrowRequest(
        Long wholesalerCustomerId,
        List<CrateLineRequest> crates,
        String note
) {
}
