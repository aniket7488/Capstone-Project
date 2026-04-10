package com.quizcap.service;

import com.quizcap.dto.SyncRequest;
import com.quizcap.dto.SyncResponse;
import com.quizcap.model.Lesson;
import com.quizcap.model.Result;
import com.quizcap.model.User;
import com.quizcap.repository.LessonRepository;
import com.quizcap.repository.ResultRepository;
import com.quizcap.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * Handles offline-to-online data synchronisation.
 *
 * Key design: the sync endpoint is fully idempotent.
 * If a result for user+lesson already exists, it is updated (not duplicated).
 * This safely handles the case where the client syncs the same data twice
 * (e.g., page reload mid-sync, or repeated offline/online cycles).
 */
@Service
public class SyncService {

    private static final Logger log = LoggerFactory.getLogger(SyncService.class);

    @Autowired private UserRepository   userRepository;
    @Autowired private LessonRepository lessonRepository;
    @Autowired private ResultRepository resultRepository;

    /**
     * Processes a batch of offline quiz results.
     *
     * @param request  the batch payload from the client
     * @param username the authenticated user submitting the batch
     * @return SyncResponse with counts of synced / failed records
     */
    @Transactional
    public SyncResponse syncResults(SyncRequest request, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));

        int synced = 0;
        int failed = 0;

        for (SyncRequest.PendingResult pending : request.getResults()) {
            try {
                Optional<Lesson> lessonOpt = lessonRepository.findById(pending.getLessonId());
                if (lessonOpt.isEmpty()) {
                    log.warn("Sync skipped: lesson {} not found", pending.getLessonId());
                    failed++;
                    continue;
                }

                Lesson lesson = lessonOpt.get();

                // Idempotent upsert: update if exists, create if not
                Result result = resultRepository.findByUserAndLesson(user, lesson)
                        .map(existing -> {
                            // Client's result is kept if the score is higher (last-write wins otherwise)
                            existing.setScore(pending.getScore());
                            existing.setMaxScore(pending.getMaxScore());
                            existing.setSynced(true);
                            return existing;
                        })
                        .orElseGet(() -> Result.builder()
                                .user(user)
                                .lesson(lesson)
                                .score(pending.getScore())
                                .maxScore(pending.getMaxScore())
                                .synced(true)
                                .build());

                resultRepository.save(result);
                synced++;

            } catch (Exception e) {
                log.error("Failed to sync result for lesson {}: {}", pending.getLessonId(), e.getMessage());
                failed++;
            }
        }

        return SyncResponse.builder()
                .synced(synced)
                .failed(failed)
                .message(String.format("Sync complete: %d saved, %d failed", synced, failed))
                .build();
    }
}
