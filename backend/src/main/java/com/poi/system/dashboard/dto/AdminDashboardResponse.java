package com.poi.system.dashboard.dto;

import java.util.List;

public record AdminDashboardResponse(
        SummaryCard poiSummary,
        SummaryCard disputeSummary,
        SummaryCard taskSummary,
        SummaryCard noticeSummary,
        List<MetricItem> poiStatusMetrics,
        List<MetricItem> categoryMetrics,
        List<MetricItem> taskTypeMetrics,
        List<MetricItem> userRoleMetrics,
        List<MetricItem> integrationMetrics
) {
    public record SummaryCard(
            long total,
            long pending,
            long completed
    ) {
    }

    public record MetricItem(
            String code,
            String label,
            long count
    ) {
    }
}
