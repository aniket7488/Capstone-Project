package com.quizcap.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

/**
 * General application beans.
 */
@Configuration
public class AppConfig {

    /** RestTemplate used by AiService to call the Gemini API. */
    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}
