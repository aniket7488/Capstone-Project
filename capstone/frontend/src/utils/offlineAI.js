/**
 * offlineAI.js – Semantic AI for offline chatbot mode.
 *
 * Uses @xenova/transformers to run the all-MiniLM-L6-v2 model directly
 * in the browser (WebAssembly + ONNX Runtime).
 *
 * First use: ~25MB model download (cached in browser cache forever after).
 * Subsequent uses: instant — fully offline, zero network calls.
 *
 * How it works:
 *  1. Encode user's question as a 384-dim sentence embedding.
 *  2. Encode all FAQ questions as embeddings (cached after first run).
 *  3. Find the FAQ entry with the highest cosine similarity to the user's question.
 *  4. If similarity > MATCH_THRESHOLD → return that FAQ answer.
 *  5. Else → return a platform-aware fallback based on detected topic keywords.
 */

import { pipeline, cos_sim, env } from '@xenova/transformers';

// Use remote model files from HuggingFace CDN (cached locally after first download)
env.allowLocalModels = false;

// Minimum cosine similarity score to consider a FAQ match good enough
const MATCH_THRESHOLD = 0.40;

// Singleton: loaded once, reused for all queries
let embedder = null;
let isLoading = false;

// Cached FAQ embeddings so we don't re-encode every query
let cachedFaqEmbeddings = null;
let cachedFaqList       = null;

/** Progress callback – called during model download with 0–100 value */
let onProgressCallback = null;

export function setProgressCallback(cb) {
  onProgressCallback = cb;
}

/**
 * Loads the embedding model (lazy, cached after first load).
 * Notifies progress via the registered callback.
 */
async function getEmbedder() {
  if (embedder) return embedder;
  if (isLoading) {
    // Wait for ongoing load to finish
    while (isLoading) await new Promise((r) => setTimeout(r, 200));
    return embedder;
  }

  isLoading = true;
  try {
    embedder = await pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2',
      {
        progress_callback: (progress) => {
          if (onProgressCallback && progress.status === 'progress') {
            const pct = Math.round(progress.progress ?? 0);
            onProgressCallback(pct);
          }
        },
      }
    );
    return embedder;
  } finally {
    isLoading = false;
  }
}

/**
 * Encodes a single text string into a normalized embedding vector.
 * @param {string} text
 * @returns {Float32Array}
 */
async function encode(text) {
  const model = await getEmbedder();
  const output = await model(text, { pooling: 'mean', normalize: true });
  return output.data;
}

/**
 * Finds the best FAQ answer for the user's offline question using
 * semantic (embedding) similarity rather than simple keyword matching.
 *
 * @param {string}  question  - raw user input
 * @param {Array}   faqList   - array of { id, question, answer, keyword } objects
 * @param {Function} onProgress - optional progress callback(0-100) during model load
 * @returns {Promise<{ answer: string, source: string, score: number }>}
 */
export async function findOfflineAnswer(question, faqList, onProgress) {
  if (onProgress) setProgressCallback(onProgress);

  try {
    // Encode the user's question
    const questionEmbedding = await encode(question);

    // Build FAQ embeddings cache (invalidate if FAQ list changed)
    if (!cachedFaqEmbeddings || cachedFaqList !== faqList) {
      cachedFaqList = faqList;
      cachedFaqEmbeddings = await Promise.all(
        faqList.map((faq) => encode(faq.question))
      );
    }

    // Find the closest FAQ by cosine similarity
    let bestScore = -1;
    let bestIndex = -1;
    for (let i = 0; i < cachedFaqEmbeddings.length; i++) {
      const score = cos_sim(questionEmbedding, cachedFaqEmbeddings[i]);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }

    if (bestScore >= MATCH_THRESHOLD && bestIndex !== -1) {
      return {
        answer: faqList[bestIndex].answer,
        source: 'OFFLINE_AI',
        score:  Math.round(bestScore * 100),
      };
    }

    // Below threshold – use topic-based fallback
    return {
      answer: getTopicFallback(question),
      source: 'OFFLINE_FALLBACK',
      score:  0,
    };

  } catch (err) {
    console.error('[OfflineAI] Error:', err);
    // Model not loaded yet or error – use simple keyword fallback
    return {
      answer: getTopicFallback(question),
      source: 'OFFLINE_FALLBACK',
      score:  0,
    };
  }
}

/**
 * Returns a helpful fallback answer based on detected topic keywords.
 * This covers common platform questions even without a FAQ match.
 */
function getTopicFallback(question) {
  const q = question.toLowerCase();

  if (/course|lesson|learn|study|subject|topic/.test(q))
    return 'To access courses, click "Courses" in the navigation bar. Each course has lessons with content and a quiz at the end. Your progress is saved automatically.';

  if (/quiz|test|question|answer|score|result|mark/.test(q))
    return 'Take quizzes by opening a lesson from the Courses page and clicking "Start". Each question has 4 options (A–D). Submit when done to see your score. Results are saved locally if you\'re offline.';

  if (/offline|sync|internet|connect|network/.test(q))
    return 'Quiz-Cap works offline! Courses and lessons are cached for reading. Quiz results saved offline are automatically synced to the server when your internet returns.';

  if (/progress|dashboard|history|performance|report/.test(q))
    return 'Your Dashboard shows completed lessons, average score, and recent quiz results. It updates automatically as you complete quizzes.';

  if (/login|logout|password|account|register|signup/.test(q))
    return 'Use the Register page to create a Student account. Login with your username and password. Your session lasts 24 hours.';

  if (/chatbot|ai|assistant|help/.test(q))
    return 'I\'m your AI learning assistant! I work both online and offline. Online, I use Google Gemini to answer complex questions. Offline, I use a local AI model to match your questions to the FAQ.';

  return 'I\'m currently offline and couldn\'t find a specific answer. Try asking about courses, quizzes, your progress, or how the platform works. For complex questions, I\'ll give much better answers when you\'re online!';
}

/** Returns true if the embedding model is already loaded and ready. */
export function isModelReady() {
  return embedder !== null;
}
