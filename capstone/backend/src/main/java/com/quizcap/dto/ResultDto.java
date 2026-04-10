package com.quizcap.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Safe data-transfer object for Result (quiz submission).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResultDto {

    private Long id;
    private Long lessonId;
    private String lessonTitle;
    private Long courseId;
    private String courseTitle;
    private int score;
    private int maxScore;
    private double percentage;
    private LocalDateTime submittedAt;
}
