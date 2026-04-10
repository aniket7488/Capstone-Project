package com.quizcap.service;

import com.quizcap.dto.CourseDto;
import com.quizcap.dto.LessonDto;
import com.quizcap.model.Course;
import com.quizcap.repository.CourseRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Business logic for courses and lessons.
 */
@Service
@Transactional(readOnly = true)
public class CourseService {

    @Autowired private CourseRepository courseRepository;

    /** Returns all courses (without lesson content – for list view). */
    public List<CourseDto> getAllCourses() {
        return courseRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::toSummaryDto)
                .collect(Collectors.toList());
    }

    /** Returns a single course with full lesson detail. */
    public CourseDto getCourseById(Long id) {
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Course not found with id: " + id));
        return toDetailDto(course);
    }

    // ── Mapping helpers ───────────────────────────────────────

    /** Summary DTO – no lesson content, just counts. */
    private CourseDto toSummaryDto(Course c) {
        return CourseDto.builder()
                .id(c.getId())
                .title(c.getTitle())
                .description(c.getDescription())
                .thumbnailUrl(c.getThumbnailUrl())
                .createdByUsername(c.getCreatedBy().getUsername())
                .createdAt(c.getCreatedAt())
                .lessons(null) // not needed in list view
                .build();
    }

    /** Detail DTO – includes all lessons with their content. */
    private CourseDto toDetailDto(Course c) {
        List<LessonDto> lessonDtos = c.getLessons().stream()
                .map(l -> LessonDto.builder()
                        .id(l.getId())
                        .title(l.getTitle())
                        .content(l.getContent())
                        .position(l.getPosition())
                        .courseId(c.getId())
                        .quizCount(l.getQuizzes().size())
                        .build())
                .collect(Collectors.toList());

        return CourseDto.builder()
                .id(c.getId())
                .title(c.getTitle())
                .description(c.getDescription())
                .thumbnailUrl(c.getThumbnailUrl())
                .createdByUsername(c.getCreatedBy().getUsername())
                .createdAt(c.getCreatedAt())
                .lessons(lessonDtos)
                .build();
    }
}
