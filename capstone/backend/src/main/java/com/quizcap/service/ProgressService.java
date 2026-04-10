package com.quizcap.service;

import com.quizcap.dto.ProgressSummaryDto;
import com.quizcap.dto.ResultDto;
import com.quizcap.model.User;
import com.quizcap.repository.LessonRepository;
import com.quizcap.repository.ResultRepository;
import com.quizcap.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Provides progress data and result history for the authenticated user.
 */
@Service
@Transactional(readOnly = true)
public class ProgressService {

    @Autowired private ResultRepository resultRepository;
    @Autowired private UserRepository   userRepository;
    @Autowired private LessonRepository lessonRepository;
    @Autowired private QuizService      quizService; // reuse ResultDto mapping

    /** Returns the full quiz result history for the current user. */
    public List<ResultDto> getMyResults(String username) {
        User user = getUser(username);
        return resultRepository.findByUserOrderBySubmittedAtDesc(user)
                .stream()
                .map(quizService::toDto)
                .collect(Collectors.toList());
    }

    /** Returns aggregated stats for the Dashboard summary card. */
    public ProgressSummaryDto getSummary(String username) {
        User user = getUser(username);

        long completed    = resultRepository.countByUser(user);
        long totalLessons = lessonRepository.count();
        Double avgScore   = resultRepository.findAverageScoreByUser(user);

        return ProgressSummaryDto.builder()
                .username(user.getUsername())
                .completedLessons(completed)
                .totalLessons(totalLessons)
                .averageScore(avgScore != null ? Math.round(avgScore * 10.0) / 10.0 : 0.0)
                .build();
    }

    private User getUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));
    }
}
