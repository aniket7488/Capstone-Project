import React, { useState, useRef, useEffect, useCallback } from 'react';
import { askChatbot } from '../services/aiService';
import { getCachedFaq } from '../utils/offlineStorage';
import { findOfflineAnswer, isModelReady } from '../utils/offlineAI';

/**
 * Chatbot page – AI assistant with online/offline dual mode.
 *
 * Online  → POST /api/chatbot/ask → FAQ match first, then Gemini 1.5 Flash AI
 * Offline → @xenova/transformers (all-MiniLM-L6-v2, ~25MB) semantic search
 *           against locally cached FAQ in IndexedDB
 *
 * The transformer model is downloaded once on first offline use and cached
 * in the browser cache permanently — fully offline after that.
 */
function Chatbot() {
  const [messages,      setMessages]      = useState([WELCOME_MESSAGE]);
  const [input,         setInput]         = useState('');
  const [sending,       setSending]       = useState(false);
  const [isOnline,      setIsOnline]      = useState(navigator.onLine);
  const [modelLoading,  setModelLoading]  = useState(false);
  const [modelProgress, setModelProgress] = useState(0);
  const [modelReady,    setModelReady]    = useState(isModelReady());
  const bottomRef = useRef(null);

  // Track online/offline status
  useEffect(() => {
    const up   = () => setIsOnline(true);
    const down = () => setIsOnline(false);
    window.addEventListener('online',  up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = useCallback((role, text, source = null, extra = null) => {
    setMessages((prev) => [...prev, { id: Date.now() + Math.random(), role, text, source, extra }]);
  }, []);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    addMessage('user', text);
    setInput('');
    setSending(true);

    try {
      if (isOnline) {
        await handleOnlineQuery(text);
      } else {
        await handleOfflineQuery(text);
      }
    } catch (err) {
      addMessage('bot', 'Something went wrong. Please try again.', 'ERROR');
    } finally {
      setSending(false);
    }
  };

  // ── Online: call backend (FAQ → Gemini) ──────────────────────────────────

  const handleOnlineQuery = async (text) => {
    const { data } = await askChatbot(text);
    addMessage('bot', data.answer, data.source);
  };

  // ── Offline: semantic AI with @xenova/transformers ───────────────────────

  const handleOfflineQuery = async (text) => {
    const faqList = await getCachedFaq();

    if (faqList.length === 0) {
      addMessage('bot',
        'The offline FAQ hasn\'t been cached yet. Please connect to the internet and ' +
        'log in once to enable offline AI support.',
        'OFFLINE_NOTICE'
      );
      return;
    }

    // First use offline: need to download/load the model (~25MB)
    if (!isModelReady()) {
      setModelLoading(true);
      setModelProgress(0);
      addMessage('bot',
        '⏳ Loading offline AI model for the first time (~25MB). This is a one-time download — ' +
        'it will be cached and work instantly next time.',
        'MODEL_LOADING'
      );
    }

    const result = await findOfflineAnswer(text, faqList, (progress) => {
      setModelProgress(progress);
    });

    setModelLoading(false);
    setModelReady(true);

    addMessage('bot', result.answer, result.source,
      result.score > 0 ? `Match confidence: ${result.score}%` : null
    );
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div style={styles.page}>

      {/* Header */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>🤖 AI Learning Assistant</h2>
          <p style={styles.subtitle}>
            {isOnline
              ? 'Online — Gemini AI + FAQ'
              : modelReady
                ? 'Offline — Local AI model ready'
                : 'Offline — Local AI (first use downloads ~25MB)'}
          </p>
        </div>
        <StatusPill isOnline={isOnline} modelReady={modelReady} />
      </div>

      {/* Model download progress bar (shown only during first offline use) */}
      {modelLoading && (
        <div style={styles.progressWrap}>
          <div style={styles.progressLabel}>
            Downloading AI model… {modelProgress}%
          </div>
          <div style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: `${modelProgress}%` }} />
          </div>
        </div>
      )}

      {/* Message list */}
      <div style={styles.messages}>
        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}

        {/* Typing indicator */}
        {sending && !modelLoading && (
          <div style={{ ...styles.row, justifyContent: 'flex-start' }}>
            <div style={styles.bubble('bot')}>
              <TypingDots />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div style={styles.inputArea}>
        <textarea
          style={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isOnline
            ? 'Ask anything… (Enter to send)'
            : 'Ask a platform or subject question… (offline AI)'}
          rows={2}
          disabled={sending}
        />
        <button
          onClick={handleSend}
          style={{ ...styles.sendBtn, opacity: (sending || !input.trim()) ? 0.5 : 1 }}
          disabled={sending || !input.trim()}
        >
          ↑
        </button>
      </div>

      {/* Suggested questions */}
      <div style={styles.suggestions}>
        <span style={styles.suggestLabel}>Try:</span>
        {SUGGESTIONS.map((s) => (
          <button key={s} style={styles.suggestBtn} onClick={() => setInput(s)}>
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div style={{ ...styles.row, justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
      <div>
        <div style={styles.bubble(msg.role)}>{msg.text}</div>
        {msg.source && !isUser && (
          <div style={styles.sourceRow}>
            <span style={sourceStyle(msg.source)}>
              {SOURCE_LABELS[msg.source] || msg.source}
            </span>
            {msg.extra && <span style={styles.extra}>{msg.extra}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusPill({ isOnline, modelReady }) {
  const color = isOnline ? '#16a34a' : modelReady ? '#7c3aed' : '#f59e0b';
  const label = isOnline ? '🟢 Online' : modelReady ? '🟣 Offline AI' : '🟡 Offline';
  return (
    <div style={{ ...styles.pill, background: color + '22', color }}>
      {label}
    </div>
  );
}

function TypingDots() {
  return <span style={{ letterSpacing: '4px', fontSize: '18px' }}>···</span>;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const WELCOME_MESSAGE = {
  id: 1,
  role: 'bot',
  text: "Hello! I'm your AI learning assistant. 🎓\n\n" +
        "• Online: I use Google Gemini AI to answer complex educational and platform questions.\n" +
        "• Offline: I run a local AI model (downloaded once, ~25MB) for smart offline answers.\n\n" +
        "What would you like to know?",
  source: null,
};

const SUGGESTIONS = [
  'How do I start a course?',
  'Explain how fractions work',
  'How does offline sync work?',
  'What is the water cycle?',
];

const SOURCE_LABELS = {
  FAQ:              '📋 FAQ',
  GEMINI_AI:        '✨ Gemini AI',
  BUILTIN_AI:       '📚 Built-in AI',
  OFFLINE_AI:       '🧠 Offline AI',
  OFFLINE_FALLBACK: '📴 Offline',
  FALLBACK:         'ℹ Suggestion',
  AI_ERROR:         '⚠ AI Error',
  MODEL_LOADING:    '⏳ Loading',
  OFFLINE_NOTICE:   'ℹ Notice',
  ERROR:            '⚠ Error',
};

function sourceStyle(source) {
  const colors = {
    GEMINI_AI:        { color: '#7c3aed', background: '#f5f3ff' },
    BUILTIN_AI:       { color: '#0369a1', background: '#f0f9ff' },
    OFFLINE_AI:       { color: '#0369a1', background: '#f0f9ff' },
    FAQ:              { color: '#065f46', background: '#f0fdf4' },
    OFFLINE_FALLBACK: { color: '#92400e', background: '#fffbeb' },
    FALLBACK:         { color: '#92400e', background: '#fffbeb' },
    AI_ERROR:         { color: '#dc2626', background: '#fef2f2' },
  };
  const c = colors[source] || { color: '#6b7280', background: '#f3f4f6' };
  return { ...styles.sourceTag, ...c };
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = {
  page: {
    maxWidth: '760px', margin: '0 auto', padding: '20px',
    display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: '12px',
  },
  title:    { fontSize: '20px', fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: '12px', color: '#6b7280', marginTop: '2px' },
  pill: {
    padding: '5px 12px', borderRadius: '20px', fontSize: '12px',
    fontWeight: '600', whiteSpace: 'nowrap',
  },
  progressWrap: {
    background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px',
    padding: '10px 14px', marginBottom: '10px',
  },
  progressLabel: { fontSize: '12px', color: '#0369a1', marginBottom: '6px' },
  progressBar:  { height: '6px', background: '#e0f2fe', borderRadius: '4px', overflow: 'hidden' },
  progressFill: { height: '100%', background: '#0284c7', borderRadius: '4px', transition: 'width 0.3s' },
  messages: {
    flex: 1, overflowY: 'auto', padding: '12px', background: '#f8fafc',
    borderRadius: '12px', border: '1px solid #e5e7eb',
    display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '10px',
  },
  row: { display: 'flex' },
  bubble: (role) => ({
    maxWidth: '78%',
    padding: '10px 14px',
    borderRadius: role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
    background: role === 'user' ? '#4f46e5' : '#fff',
    color: role === 'user' ? '#fff' : '#1e293b',
    fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-wrap',
    boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
    border: role === 'bot' ? '1px solid #e5e7eb' : 'none',
  }),
  sourceRow: { display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', paddingLeft: '4px' },
  sourceTag: {
    fontSize: '11px', padding: '2px 8px', borderRadius: '10px', fontWeight: '500',
  },
  extra: { fontSize: '11px', color: '#9ca3af' },
  inputArea: { display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'flex-end' },
  input: {
    flex: 1, padding: '10px 14px', border: '1.5px solid #d1d5db', borderRadius: '10px',
    fontSize: '14px', resize: 'none', outline: 'none', lineHeight: '1.5', fontFamily: 'inherit',
  },
  sendBtn: {
    width: '44px', height: '44px', background: '#4f46e5', color: '#fff', border: 'none',
    borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '18px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  suggestions: { display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' },
  suggestLabel: { fontSize: '11px', color: '#9ca3af' },
  suggestBtn: {
    fontSize: '12px', background: '#f3f4f6', color: '#4b5563', border: '1px solid #e5e7eb',
    padding: '4px 10px', borderRadius: '16px', cursor: 'pointer',
  },
};

export default Chatbot;
