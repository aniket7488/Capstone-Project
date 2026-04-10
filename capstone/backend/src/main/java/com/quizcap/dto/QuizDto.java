package com.quizcap.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Safe data-transfer object for Quiz questions.
 * correctOpt is intentionally EXCLUDED to prevent cheating.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuizDto {

    private Long id;
    private String question;
    private String optionA;
    private String optionB;
    private String optionC;
    private String optionD;
    private Long lessonId;
    // NOTE: correctOpt is NOT included here — only used server-side for scoring
}
