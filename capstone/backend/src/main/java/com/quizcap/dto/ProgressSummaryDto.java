package com.quizcap.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Aggregated progress stats for the Dashboard page.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProgressSummaryDto {

    private long completedLessons;
    private long totalLessons;
    private double averageScore;     // percentage (0–100)
    private String username;
}
