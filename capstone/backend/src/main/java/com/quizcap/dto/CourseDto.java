package com.quizcap.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Safe data-transfer object for Course – excludes entity references and lazy-loaded relationships.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CourseDto {

    private Long id;
    private String title;
    private String description;
    private String thumbnailUrl;
    private String createdByUsername;
    private LocalDateTime createdAt;

    /** Populated only for GET /api/courses/{id} (detail view). Null for list view. */
    private List<LessonDto> lessons;
}
