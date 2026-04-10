package com.quizcap.controller;

import com.quizcap.dto.CourseDto;
import com.quizcap.service.CourseService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for courses and lessons.
 *
 * GET /api/courses      – list all courses (summary, no lesson content)
 * GET /api/courses/{id} – single course with all lesson details
 *
 * All endpoints require a valid JWT (enforced by SecurityConfig).
 */
@RestController
@RequestMapping("/api/courses")
public class CourseController {

    @Autowired private CourseService courseService;

    /** Returns all courses ordered by creation date (newest first). */
    @GetMapping
    public ResponseEntity<List<CourseDto>> getAllCourses() {
        return ResponseEntity.ok(courseService.getAllCourses());
    }

    /** Returns a single course with its full lesson list. */
    @GetMapping("/{id}")
    public ResponseEntity<CourseDto> getCourseById(@PathVariable Long id) {
        return ResponseEntity.ok(courseService.getCourseById(id));
    }
}
