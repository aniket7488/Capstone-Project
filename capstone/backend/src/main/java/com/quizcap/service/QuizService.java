package com.quizcap.service;

import com.quizcap.dto.QuizDto;
import com.quizcap.dto.QuizSubmitRequest;
import com.quizcap.dto.ResultDto;
import com.quizcap.model.Lesson;
import com.quizcap.model.Quiz;
import com.quizcap.model.Result;
import com.quizcap.model.User;
import com.quizcap.repository.LessonRepository;
import com.quizcap.repository.QuizRepository;
import com.quizcap.repository.ResultRepository;
import com.quizcap.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Business logic for quiz questions and submissions.
 *
 * SECURITY: correctOpt is NEVER included in outbound QuizDto objects.
 * Scoring always happens server-side in submitQuiz().
 */
@Service
public class QuizService {

    @Autowired private QuizRepository   quizRepository;
    @Autowired private LessonRepository lessonRepository;
    @Autowired private ResultRepository resultRepository;
    @Autowired private UserRepository   userRepository;

    /** Returns all questions for a lesson WITHOUT correct answers. */
    @Transactional(readOnly = true)
    public List<QuizDto> getQuizzesByLesson(Long lessonId) {
        if (!lessonRepository.existsById(lessonId)) {
            throw new EntityNotFoundException("Lesson not found with id: " + lessonId);
        }
        return quizRepository.findByLessonId(lessonId)
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    /**
     * Scores the submitted answers server-side and persists the result.
     *
     * @param request  the answers map { quizId → selectedOption }
     * @param username the authenticated user
     * @return ResultDto with the score
     */
    @Transactional
    public ResultDto submitQuiz(QuizSubmitRequest request, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));

        Lesson lesson = lessonRepository.findById(request.getLessonId())
                .orElseThrow(() -> new EntityNotFoundException("Lesson not found: " + request.getLessonId()));

        List<Quiz> questions = quizRepository.findByLessonId(lesson.getId());

        // Score: count answers where submitted option == correct option
        Map<Long, String> answers = request.getAnswers();
        int score = (int) questions.stream()
                .filter(q -> q.getCorrectOpt().equalsIgnoreCase(answers.getOrDefault(q.getId(), "")))
                .count();

        // Upsert result (UNIQUE constraint on user+lesson – update if exists)
        Result result = resultRepository.findByUserAndLesson(user, lesson)
                .map(existing -> {
                    existing.setScore(score);
                    existing.setMaxScore(questions.size());
                    return existing;
                })
                .orElseGet(() -> Result.builder()
                        .user(user)
                        .lesson(lesson)
                        .score(score)
                        .maxScore(questions.size())
                        .synced(true)
                        .build());

        result = resultRepository.save(result);
        return toDto(result);
    }

    // ── Mapping helpers ───────────────────────────────────────

    /** Maps Quiz → QuizDto (EXCLUDES correctOpt). */
    private QuizDto toDto(Quiz q) {
        return QuizDto.builder()
                .id(q.getId())
                .question(q.getQuestion())
                .optionA(q.getOptionA())
                .optionB(q.getOptionB())
                .optionC(q.getOptionC())
                .optionD(q.getOptionD())
                .lessonId(q.getLesson().getId())
                .build();
    }

    ResultDto toDto(Result r) {
        double percentage = r.getMaxScore() > 0
                ? Math.round((double) r.getScore() / r.getMaxScore() * 1000.0) / 10.0
                : 0.0;
        return ResultDto.builder()
                .id(r.getId())
                .lessonId(r.getLesson().getId())
                .lessonTitle(r.getLesson().getTitle())
                .courseId(r.getLesson().getCourse().getId())
                .courseTitle(r.getLesson().getCourse().getTitle())
                .score(r.getScore())
                .maxScore(r.getMaxScore())
                .percentage(percentage)
                .submittedAt(r.getSubmittedAt())
                .build();
    }
}
