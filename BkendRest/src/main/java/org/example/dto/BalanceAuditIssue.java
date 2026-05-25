package org.example.dto;

import java.math.BigDecimal;

public record BalanceAuditIssue(
        String kind,
        Long wholesalerId,
        String partyType,
        Long partyAccountId,
        Long boxTypeId,
        Long categoryId,
        String metric,
        BigDecimal expected,
        BigDecimal actual,
        BigDecimal delta,
        String note
) {
}
