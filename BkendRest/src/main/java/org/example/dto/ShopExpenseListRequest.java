package org.example.dto;

import java.time.LocalDateTime;

public record ShopExpenseListRequest(
        LocalDateTime from,
        LocalDateTime to
) {
}
