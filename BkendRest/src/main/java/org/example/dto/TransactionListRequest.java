package org.example.dto;

import java.time.LocalDateTime;

public record TransactionListRequest(
        LocalDateTime from,
        LocalDateTime to
) {
}
