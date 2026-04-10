package com.quizcap.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.Map;

/**
 * Request body for POST /api/quizzes/submit
 *
 * answers: map of quizId → selected option ("A", "B", "C", or "D")
 * Example: { "lessonId": 1, "answers": { "1": "B", "2": "C", "3": "A" } }
 */
@Data
public class QuizSubmitRequest {

    @NotNull(message = "Lesson ID is required")
    private Long lessonId;

    @NotNull(message = "Answers map is required")
    private Map<Long, String> answers;
}
