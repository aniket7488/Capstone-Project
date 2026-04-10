package com.quizcap.service;

import com.quizcap.dto.ChatResponse;
import com.quizcap.model.ChatbotData;
import com.quizcap.repository.ChatbotDataRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.util.*;

/**
 * AI chatbot service.
 *
 * Priority chain (online):
 *  1. FAQ keyword match (instant, from DB)
 *  2. Gemini 1.5 Flash (if API key configured)
 *  3. Built-in subject knowledge base (always available, no key needed)
 *  4. Generic helpful fallback
 *
 * Offline mode handled on the frontend via @xenova/transformers.
 */
@Service
@Transactional(readOnly = true)
public class AiService {

    private static final Logger log = LoggerFactory.getLogger(AiService.class);

    private static final String GEMINI_URL =
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=";

    private static final String SYSTEM_PROMPT =
            "You are an AI learning assistant built into Quiz-Cap, an offline-first digital learning " +
            "platform for rural school students (ages 10–18).\n\n" +
            "Platform details:\n" +
            "- Students browse Courses with Lessons and end-of-lesson Quizzes.\n" +
            "- Quiz results save locally when offline and auto-sync when internet returns.\n" +
            "- Dashboard shows progress: completed lessons, average score, recent results.\n" +
            "- Roles: Student (default), Teacher, Admin.\n\n" +
            "Your behaviour:\n" +
            "- Answer platform questions directly and briefly (1–3 sentences).\n" +
            "- For educational/subject questions: give a clear, student-appropriate explanation.\n" +
            "- Keep tone friendly and encouraging.\n" +
            "- Do NOT answer questions unrelated to education or this platform.\n" +
            "- Keep responses under 200 words unless the topic truly needs more detail.";

    @Value("${gemini.api.key:}")
    private String geminiApiKey;

    @Autowired private ChatbotDataRepository chatbotDataRepository;
    @Autowired private RestTemplate          restTemplate;

    // ── Public API ──────────────────────────────────────────────────────────

    public ChatResponse ask(String message) {
        // 1. FAQ keyword match (DB — instant)
        ChatResponse faq = tryFaqMatch(message);
        if (faq != null) return faq;

        // 2. Gemini AI (if key is configured)
        if (geminiApiKey != null && !geminiApiKey.isBlank()) {
            return callGemini(message);
        }

        // 3. Built-in subject knowledge base (always works, no external key)
        ChatResponse builtin = tryBuiltinKnowledge(message);
        if (builtin != null) return builtin;

        // 4. Generic fallback
        return ChatResponse.builder()
                .answer("I couldn't find a specific answer for that question. " +
                        "Try asking about Maths (fractions, multiplication, geometry), " +
                        "Science (states of matter, water cycle, photosynthesis), " +
                        "English (parts of speech, grammar), or how to use this platform. " +
                        "For even better answers, ask your teacher to configure the Gemini AI key.")
                .source("FALLBACK")
                .build();
    }

    public List<ChatbotData> getAllFaq() {
        return chatbotDataRepository.findAll();
    }

    // ── 1. FAQ keyword match ────────────────────────────────────────────────

    private ChatResponse tryFaqMatch(String message) {
        List<String> tokens = tokenize(message);
        for (ChatbotData faq : chatbotDataRepository.findAll()) {
            for (String kw : faq.getKeyword().toLowerCase().split(",")) {
                if (!kw.isBlank() && tokens.contains(kw.trim())) {
                    return ChatResponse.builder()
                            .answer(faq.getAnswer())
                            .source("FAQ")
                            .build();
                }
            }
        }
        return null;
    }

    // ── 2. Gemini AI ────────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private ChatResponse callGemini(String userMessage) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, Object> body = Map.of(
                "system_instruction", Map.of(
                    "parts", List.of(Map.of("text", SYSTEM_PROMPT))
                ),
                "contents", List.of(
                    Map.of("parts", List.of(Map.of("text", userMessage)))
                ),
                "generationConfig", Map.of(
                    "temperature",     0.7,
                    "maxOutputTokens", 300
                )
            );

            Map<String, Object> response = restTemplate.postForObject(
                    GEMINI_URL + geminiApiKey,
                    new HttpEntity<>(body, headers),
                    Map.class
            );

            List<Map<String, Object>> candidates =
                    (List<Map<String, Object>>) response.get("candidates");
            Map<String, Object> content =
                    (Map<String, Object>) candidates.get(0).get("content");
            List<Map<String, Object>> parts =
                    (List<Map<String, Object>>) content.get("parts");
            String text = (String) parts.get(0).get("text");

            return ChatResponse.builder()
                    .answer(text.trim())
                    .source("GEMINI_AI")
                    .build();

        } catch (Exception e) {
            log.error("Gemini API call failed: {}", e.getMessage());
            // Fall through to built-in knowledge
            ChatResponse builtin = tryBuiltinKnowledge(userMessage);
            return builtin != null ? builtin : ChatResponse.builder()
                    .answer("I'm having trouble with AI right now. Please try again shortly.")
                    .source("AI_ERROR")
                    .build();
        }
    }

    // ── 3. Built-in subject knowledge base ─────────────────────────────────
    //
    // Covers the most common school topics students ask about.
    // Works with no external API key — always available.

    private static final List<BuiltinEntry> BUILTIN_KB = List.of(

        // ── Mathematics ────────────────────────────────────────────────────

        new BuiltinEntry(
            new String[]{"fraction","fractions","numerator","denominator"},
            "A fraction represents a part of a whole. It has two parts:\n" +
            "• Numerator (top) — how many parts you have.\n" +
            "• Denominator (bottom) — total equal parts the whole is divided into.\n\n" +
            "Examples: 1/2 = one half, 3/4 = three quarters.\n\n" +
            "Adding fractions:\n" +
            "• Same denominator: just add numerators → 1/5 + 2/5 = 3/5\n" +
            "• Different denominators: find the LCD first → 1/3 + 1/4 = 4/12 + 3/12 = 7/12\n\n" +
            "A proper fraction has numerator < denominator (e.g. 3/5). An improper fraction has numerator ≥ denominator (e.g. 7/4)."
        ),
        new BuiltinEntry(
            new String[]{"multiply","multiplication","times","product","table"},
            "Multiplication is repeated addition.\n" +
            "Example: 4 × 3 = 4 + 4 + 4 = 12\n\n" +
            "Key rules:\n" +
            "• Anything × 0 = 0\n" +
            "• Anything × 1 = itself\n" +
            "• Order doesn't matter: 3 × 5 = 5 × 3 = 15 (commutative property)\n\n" +
            "Tips for learning tables: practice skip-counting (2, 4, 6, 8…) and use patterns — " +
            "the 9 times table digits always add up to 9 (9×2=18 → 1+8=9)."
        ),
        new BuiltinEntry(
            new String[]{"divide","division","quotient","remainder"},
            "Division splits a number into equal groups.\n" +
            "Example: 12 ÷ 4 = 3 (12 shared equally into 4 groups → 3 each)\n\n" +
            "Parts of division:\n" +
            "• Dividend ÷ Divisor = Quotient\n" +
            "• If it doesn't divide evenly, the leftover is the Remainder.\n" +
            "Example: 13 ÷ 4 = 3 remainder 1\n\n" +
            "Division is the opposite (inverse) of multiplication. Check your answer: 3 × 4 = 12 ✓"
        ),
        new BuiltinEntry(
            new String[]{"area","perimeter","shape","rectangle","triangle","circle","geometry"},
            "Area = space inside a shape. Perimeter = distance around the outside.\n\n" +
            "Formulas:\n" +
            "• Rectangle: Area = length × width | Perimeter = 2×(l + w)\n" +
            "• Square: Area = side² | Perimeter = 4 × side\n" +
            "• Triangle: Area = ½ × base × height\n" +
            "• Circle: Area = π × r² | Circumference = 2 × π × r\n" +
            "  (π ≈ 3.14, r = radius)\n\n" +
            "Remember: area is measured in square units (cm², m²), perimeter in plain units (cm, m)."
        ),
        new BuiltinEntry(
            new String[]{"percent","percentage","ratio","proportion"},
            "A percentage means 'per hundred'. 50% = 50 out of 100 = 1/2.\n\n" +
            "To find a percentage of a number:\n" +
            "  (percentage ÷ 100) × total\n" +
            "Example: 20% of 80 = (20 ÷ 100) × 80 = 0.20 × 80 = 16\n\n" +
            "To convert a fraction to %: divide numerator by denominator, then × 100\n" +
            "Example: 3/4 = 0.75 = 75%\n\n" +
            "A ratio compares two quantities: 3:2 means for every 3 of one thing, there are 2 of another."
        ),

        // ── Science ────────────────────────────────────────────────────────

        new BuiltinEntry(
            new String[]{"matter","solid","liquid","gas","state","plasma"},
            "Matter exists in three main states:\n\n" +
            "1. Solid — fixed shape and volume. Particles are tightly packed and only vibrate.\n" +
            "   Examples: ice, rock, wood.\n\n" +
            "2. Liquid — fixed volume, takes shape of its container. Particles flow past each other.\n" +
            "   Examples: water, milk, oil.\n\n" +
            "3. Gas — no fixed shape or volume. Particles move freely and fill any container.\n" +
            "   Examples: air, steam, oxygen.\n\n" +
            "Changes: Solid → Liquid = Melting. Liquid → Gas = Evaporation/Boiling. " +
            "Gas → Liquid = Condensation. Liquid → Solid = Freezing."
        ),
        new BuiltinEntry(
            new String[]{"water","cycle","evaporation","condensation","precipitation","rain","snow"},
            "The water cycle explains how water moves continuously through our environment:\n\n" +
            "1. Evaporation — the sun heats water in oceans/lakes → turns to water vapour → rises.\n" +
            "2. Condensation — water vapour cools high up → forms tiny droplets → creates clouds.\n" +
            "3. Precipitation — water falls from clouds as rain, snow, sleet, or hail.\n" +
            "4. Collection — water gathers in oceans, rivers, and lakes → cycle begins again.\n\n" +
            "The sun provides the energy that drives the whole cycle."
        ),
        new BuiltinEntry(
            new String[]{"photosynthesis","plant","chlorophyll","oxygen","carbon","glucose","leaf"},
            "Photosynthesis is how plants make their own food using sunlight.\n\n" +
            "The equation:\n" +
            "Carbon dioxide + Water + Sunlight → Glucose + Oxygen\n" +
            "CO₂ + H₂O + light → C₆H₁₂O₆ + O₂\n\n" +
            "• Happens in the chloroplasts of plant cells (contain green chlorophyll).\n" +
            "• Carbon dioxide enters through tiny pores called stomata.\n" +
            "• Water is absorbed through the roots.\n" +
            "• Glucose provides energy for the plant to grow.\n" +
            "• Oxygen is released — this is the oxygen we breathe!\n\n" +
            "Photosynthesis is the foundation of almost every food chain on Earth."
        ),
        new BuiltinEntry(
            new String[]{"cell","cells","nucleus","membrane","organism","biology","dna"},
            "A cell is the smallest unit of life. All living things are made of cells.\n\n" +
            "Parts of an animal cell:\n" +
            "• Cell membrane — controls what enters and leaves.\n" +
            "• Nucleus — contains DNA; the control centre.\n" +
            "• Cytoplasm — jelly-like fluid filling the cell.\n" +
            "• Mitochondria — produces energy for the cell.\n\n" +
            "Plant cells have all of the above PLUS:\n" +
            "• Cell wall — gives rigid structure.\n" +
            "• Chloroplasts — for photosynthesis.\n" +
            "• Vacuole — stores water and nutrients."
        ),
        new BuiltinEntry(
            new String[]{"gravity","force","newton","weight","mass","pull"},
            "Gravity is a force that attracts objects with mass towards each other.\n\n" +
            "Key facts:\n" +
            "• Earth's gravity pulls everything towards its centre (downward).\n" +
            "• Mass = amount of matter in an object (stays the same everywhere).\n" +
            "• Weight = force of gravity on your mass (changes on different planets).\n" +
            "  Weight = mass × gravitational acceleration (g = 9.8 m/s² on Earth)\n\n" +
            "Sir Isaac Newton formulated the Law of Universal Gravitation: every object attracts " +
            "every other object. The bigger the mass, the stronger the pull. The greater the " +
            "distance, the weaker the pull."
        ),

        // ── English ────────────────────────────────────────────────────────

        new BuiltinEntry(
            new String[]{"noun","verb","adjective","adverb","pronoun","conjunction","preposition","parts","speech","grammar"},
            "The 8 Parts of Speech:\n\n" +
            "1. Noun — name of a person, place, or thing: dog, school, India.\n" +
            "2. Pronoun — replaces a noun: he, she, they, it.\n" +
            "3. Verb — action or state: run, is, eat, think.\n" +
            "4. Adjective — describes a noun: tall, red, happy.\n" +
            "5. Adverb — describes a verb or adjective: quickly, very, well.\n" +
            "6. Preposition — shows relationship: in, on, under, between.\n" +
            "7. Conjunction — joins words or clauses: and, but, or, because.\n" +
            "8. Interjection — expresses emotion: Oh! Wow! Ouch!"
        ),
        new BuiltinEntry(
            new String[]{"tense","past","present","future","verb","tenses"},
            "Verb tenses tell us WHEN an action happens:\n\n" +
            "Present tense — happening now:\n" +
            "  Simple: 'She walks.' | Continuous: 'She is walking.'\n\n" +
            "Past tense — already happened:\n" +
            "  Simple: 'She walked.' | Continuous: 'She was walking.'\n\n" +
            "Future tense — will happen:\n" +
            "  Simple: 'She will walk.' | Continuous: 'She will be walking.'\n\n" +
            "Tip: Keep the same tense throughout a piece of writing unless the time genuinely changes."
        ),
        new BuiltinEntry(
            new String[]{"sentence","paragraph","write","writing","essay","topic"},
            "A good sentence needs:\n" +
            "1. Capital letter at the start.\n" +
            "2. Subject (who/what) + Predicate (what they do/are).\n" +
            "3. End punctuation: full stop (.), question mark (?), or exclamation mark (!).\n\n" +
            "A good paragraph has:\n" +
            "• Topic sentence — states the main idea.\n" +
            "• Supporting sentences — explain or give examples.\n" +
            "• Concluding sentence — wraps up the idea.\n\n" +
            "Tip: Vary your sentence lengths — mix short punchy sentences with longer ones for better flow."
        ),

        // ── Study skills ───────────────────────────────────────────────────

        new BuiltinEntry(
            new String[]{"study","learn","remember","memorize","exam","revision","tips"},
            "Top study tips:\n\n" +
            "1. Pomodoro technique: 25 min focused study → 5 min break. Repeat.\n" +
            "2. Active recall: test yourself instead of just re-reading.\n" +
            "3. Spaced repetition: review notes after 1 day, 3 days, 1 week.\n" +
            "4. Teach it: explain the topic out loud as if teaching someone else.\n" +
            "5. Mind maps: draw diagrams connecting key ideas.\n" +
            "6. Past quizzes: practise with the quizzes in your courses!\n" +
            "7. Sleep: memory is consolidated during sleep — don't skip it.\n\n" +
            "The Quiz-Cap courses have practice quizzes built in — use them!"
        )
    );

    /**
     * Scans the built-in knowledge base for a topic match.
     * Uses a scoring system — returns the entry with the most keyword hits.
     */
    private ChatResponse tryBuiltinKnowledge(String message) {
        List<String> tokens = tokenize(message);

        BuiltinEntry best = null;
        int bestScore = 0;

        for (BuiltinEntry entry : BUILTIN_KB) {
            int score = 0;
            for (String kw : entry.keywords) {
                if (tokens.contains(kw)) score++;
            }
            if (score > bestScore) {
                bestScore = score;
                best = entry;
            }
        }

        // Require at least 1 keyword match
        if (bestScore > 0 && best != null) {
            return ChatResponse.builder()
                    .answer(best.answer)
                    .source("BUILTIN_AI")
                    .build();
        }
        return null;
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private List<String> tokenize(String text) {
        return Arrays.stream(text.toLowerCase().split("\\W+"))
                .filter(t -> t.length() > 2)
                .toList();
    }

    /** Simple record for built-in knowledge base entries. */
    private record BuiltinEntry(String[] keywords, String answer) {}
}
