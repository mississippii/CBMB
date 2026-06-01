package org.example.dto;

import java.util.List;

public record CrateLossStatsResponse(
        int months,
        long totalLost,
        List<CrateTypeQuantity> byType,
        List<MonthBucket> buckets
) {
    public record MonthBucket(String month, long total, List<CrateTypeQuantity> byType) {}
}
