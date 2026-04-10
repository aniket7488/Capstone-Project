package com.quizcap.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Stores the quiz result for a user on a specific lesson.
 *
 * The UNIQUE constraint on (user_id, lesson_id) means a student can only have
 * one result per lesson. SyncService performs an upsert to handle re-syncs.
 */
@Entity
@Table(
    name = "results",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_user_lesson",
        columnNames = {"user_id", "lesson_id"}
    )
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Result {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lesson_id", nullable = false)
    private Lesson lesson;

    @Column(nullable = false)
    private int score;

    @Column(name = "max_score", nullable = false)
    private int maxScore;

    @CreationTimestamp
    @Column(name = "submitted_at", updatable = false)
    private LocalDateTime submittedAt;

    /**
     * Always true for server-side records.
     * The client stores false for pending unsynced records in IndexedDB.
     */
    @Column(nullable = false)
    @Builder.Default
    private boolean synced = true;
}
