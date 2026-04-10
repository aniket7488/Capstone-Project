package com.quizcap.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * FAQ entry used by the offline rule-based chatbot.
 *
 * The 'keyword' field holds comma-separated trigger words.
 * AiService tokenizes the user's message and matches against these keywords.
 * The entire table is returned by GET /api/chatbot/faq so the frontend
 * can cache it in IndexedDB for offline use.
 */
@Entity
@Table(name = "chatbot_data")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatbotData {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Comma-separated trigger words, e.g., "offline,sync,internet" */
    @Column(nullable = false, length = 300)
    private String keyword;

    @Column(nullable = false, length = 500)
    private String question;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String answer;

    @Column(length = 100)
    private String category;
}
