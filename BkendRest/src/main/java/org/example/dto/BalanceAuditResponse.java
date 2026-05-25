package org.example.dto;

import java.time.LocalDateTime;
import java.util.List;

public record BalanceAuditResponse(
        Long wholesalerId,
        LocalDateTime runAt,
        int totalChecked,
        int totalIssues,
        List<BalanceAuditIssue> issues
) {
}
