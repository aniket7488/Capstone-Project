package com.quizcap.controller;

import com.quizcap.dto.ChatRequest;
import com.quizcap.dto.ChatResponse;
import com.quizcap.model.ChatbotData;
import com.quizcap.service.AiService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for the AI chatbot module.
 *
 * POST /api/chatbot/ask – send a message to the online chatbot
 * GET  /api/chatbot/faq – retrieve all FAQ entries for offline caching
 *
 * Both endpoints are publicly accessible (no JWT required) so the frontend
 * can seed the offline FAQ cache even before login.
 */
@RestController
@RequestMapping("/api/chatbot")
public class AiController {

    @Autowired private AiService aiService;

    /**
     * Processes a chatbot question using FAQ keyword matching.
     * Falls back to a mock AI response if no FAQ entry matches.
     */
    @PostMapping("/ask")
    public ResponseEntity<ChatResponse> ask(@Valid @RequestBody ChatRequest request) {
        ChatResponse response = aiService.ask(request.getMessage());
        return ResponseEntity.ok(response);
    }

    /**
     * Returns all FAQ entries.
     * Called by the frontend on login to populate the IndexedDB offline chatbot cache.
     */
    @GetMapping("/faq")
    public ResponseEntity<List<ChatbotData>> getFaq() {
        return ResponseEntity.ok(aiService.getAllFaq());
    }
}
