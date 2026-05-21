package org.example.dto;

import java.util.List;

public record BoxLossStatsResponse(
        int months,
        long totalLost,
        long totalBangla,
        long totalChina,
        List<MonthBucket> buckets
) {
    public record MonthBucket(String month, long bangla, long china, long total) {}
}
