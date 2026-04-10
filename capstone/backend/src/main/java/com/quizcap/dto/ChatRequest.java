package com.quizcap.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/** Request body for POST /api/chatbot/ask */
@Data
public class ChatRequest {

    @NotBlank(message = "Message cannot be blank")
    private String message;
}
