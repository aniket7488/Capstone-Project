package com.quizcap.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Safe data-transfer object for Lesson.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LessonDto {

    private Long id;
    private String title;
    private String content;
    private int position;
    private Long courseId;
    private int quizCount;
}
