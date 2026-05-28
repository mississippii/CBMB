package org.example.dto;

import java.time.LocalDateTime;

/** Period selector for the P&L report. Same shape as DashboardSummaryRequest. */
public record PnLRequest(
        String period,
        LocalDateTime from,
        LocalDateTime to,
        Boolean compareToPrior
) {
}
