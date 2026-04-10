package com.quizcap.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Response body for POST /api/chatbot/ask */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatResponse {

    private String answer;
    /** Source of the answer: "FAQ" for matched FAQ entry, "AI_MOCK" for fallback */
    private String source;
}
