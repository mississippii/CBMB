package org.example.dto;

import java.time.LocalDateTime;

public record DashboardSummaryRequest(
        String period,
        LocalDateTime from,
        LocalDateTime to,
        Integer topShipmentLimit
) {
}
