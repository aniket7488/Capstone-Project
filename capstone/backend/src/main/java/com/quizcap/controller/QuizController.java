package com.quizcap.controller;

import com.quizcap.dto.QuizDto;
import com.quizcap.dto.QuizSubmitRequest;
import com.quizcap.dto.ResultDto;
import com.quizcap.service.QuizService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for quiz questions and submissions.
 *
 * GET  /api/quizzes/lesson/{lessonId}  – questions for a lesson (no correct answers)
 * POST /api/quizzes/submit             – submit answers, get score back
 *
 * All endpoints require a valid JWT.
 */
@RestController
@RequestMapping("/api/quizzes")
public class QuizController {

    @Autowired private QuizService quizService;

    /**
     * Returns quiz questions for a lesson.
     * Correct answers are intentionally excluded from the response.
     */
    @GetMapping("/lesson/{lessonId}")
    public ResponseEntity<List<QuizDto>> getQuizzesByLesson(@PathVariable Long lessonId) {
        return ResponseEntity.ok(quizService.getQuizzesByLesson(lessonId));
    }

    /**
     * Scores the answers server-side and persists the result.
     * Uses @AuthenticationPrincipal to get the current user without a service call.
     */
    @PostMapping("/submit")
    public ResponseEntity<ResultDto> submitQuiz(
            @Valid @RequestBody QuizSubmitRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        ResultDto result = quizService.submitQuiz(request, userDetails.getUsername());
        return ResponseEntity.ok(result);
    }
}
