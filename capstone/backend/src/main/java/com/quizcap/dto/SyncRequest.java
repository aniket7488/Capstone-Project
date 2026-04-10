package com.quizcap.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Request body for POST /api/sync/results
 * Sent by the frontend when connectivity is restored to upload offline-stored results.
 */
@Data
public class SyncRequest {

    @NotNull
    private List<PendingResult> results;

    /**
     * Represents a single offline quiz result pending synchronisation.
     */
    @Data
    public static class PendingResult {

        @NotNull(message = "Lesson ID is required")
        private Long lessonId;

        @NotNull(message = "Score is required")
        private Integer score;

        @NotNull(message = "Max score is required")
        private Integer maxScore;

        /** The timestamp from the client when the quiz was originally submitted. */
        private LocalDateTime submittedAt;
    }
}
