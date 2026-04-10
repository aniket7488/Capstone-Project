package com.quizcap.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response body for POST /api/sync/results
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SyncResponse {

    /** Number of results successfully persisted. */
    private int synced;

    /** Number of results that failed (lesson not found, etc.). */
    private int failed;

    private String message;
}
