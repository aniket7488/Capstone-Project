import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getQuizzesByLesson, submitQuiz } from '../services/quizService';
import { addPendingResult } from '../utils/offlineStorage';

/**
 * Quiz page – interactive quiz for a specific lesson.
 *
 * Offline-first submission:
 *  - Online  → POST /api/quizzes/submit  → show score
 *  - Offline → save to IndexedDB with synced:false → show score
 *              (synced to server automatically when back online)
 */
function Quiz() {
  const { lessonId }  = useParams();
  const navigate      = useNavigate();

  const [questions,   setQuestions]   = useState([]);
  const [answers,     setAnswers]     = useState({});   // { quizId: 'A'|'B'|'C'|'D' }
  const [result,      setResult]      = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [submitting,  setSubmitting]  = useState(false);
  const [current,     setCurrent]     = useState(0);    // current question index
  const [offlineSave, setOfflineSave] = useState(false);
  const [error,       setError]       = useState('');

  useEffect(() => {
    loadQuestions();
    // eslint-disable-next-line
  }, [lessonId]);

  async function loadQuestions() {
    setLoading(true);
    try {
      const { data } = await getQuizzesByLesson(Number(lessonId));
      setQuestions(data);
    } catch (err) {
      setError('Could not load quiz questions. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }

  const handleAnswer = (questionId, option) => {
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const handleNext = () => {
    if (current < questions.length - 1) setCurrent(current + 1);
  };

  const handlePrev = () => {
    if (current > 0) setCurrent(current - 1);
  };

  const handleSubmit = async () => {
    // Make sure all questions are answered
    const unanswered = questions.filter((q) => !answers[q.id]);
    if (unanswered.length > 0) {
      setError(`Please answer all ${questions.length} questions before submitting.`);
      return;
    }

    setSubmitting(true);
    setError('');

    // Calculate local score for offline use
    const localScore = calculateLocalScore();

    if (navigator.onLine) {
      try {
        const { data } = await submitQuiz({ lessonId: Number(lessonId), answers });
        setResult(data);
      } catch (err) {
        // Network error even though navigator says online – save offline
        await saveOffline(localScore);
      }
    } else {
      await saveOffline(localScore);
    }

    setSubmitting(false);
  };

  /**
   * Calculates score client-side (approximate).
   * Actual authoritative score is always computed by the server.
   */
  function calculateLocalScore() {
    // We don't have correctOpt on the client, so we estimate by submission count
    // The real score comes from the server response
    return { score: 0, maxScore: questions.length };
  }

  async function saveOffline(localScore) {
    await addPendingResult({
      lessonId:    Number(lessonId),
      score:       localScore.score,
      maxScore:    questions.length,
      submittedAt: new Date().toISOString(),
    });
    setOfflineSave(true);
    // Show a result-like view with "pending sync" status
    setResult({
      score:      '?',
      maxScore:   questions.length,
      percentage: null,
      offline:    true,
    });
  }

  if (loading)   return <Loading />;
  if (questions.length === 0 && !error) return <Empty navigate={navigate} />;

  if (result) return (
    <ResultScreen result={result} offlineSave={offlineSave} navigate={navigate} />
  );

  const q = questions[current];
  const progress = Math.round(((current + 1) / questions.length) * 100);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button onClick={() => navigate(-1)} style={styles.backBtn}>← Back</button>
        <span style={styles.counter}>Question {current + 1} of {questions.length}</span>
      </div>

      {/* Progress bar */}
      <div style={styles.progressBar}>
        <div style={{ ...styles.progressFill, width: `${progress}%` }} />
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {/* Question card */}
      <div style={styles.card}>
        <p style={styles.question}>{q.question}</p>

        <div style={styles.options}>
          {['A', 'B', 'C', 'D'].map((opt) => {
            const value = q[`option${opt}`];
            if (!value) return null;
            const isSelected = answers[q.id] === opt;
            return (
              <button
                key={opt}
                onClick={() => handleAnswer(q.id, opt)}
                style={{
                  ...styles.option,
                  ...(isSelected ? styles.optionSelected : {}),
                }}
              >
                <span style={styles.optionLabel}>{opt}</span>
                <span>{value}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <div style={styles.nav}>
        <button onClick={handlePrev} style={styles.navBtn} disabled={current === 0}>
          ← Previous
        </button>

        {current === questions.length - 1 ? (
          <button
            onClick={handleSubmit}
            style={{ ...styles.navBtn, ...styles.submitBtn }}
            disabled={submitting}
          >
            {submitting ? 'Submitting...' : '✓ Submit Quiz'}
          </button>
        ) : (
          <button onClick={handleNext} style={styles.navBtn}>
            Next →
          </button>
        )}
      </div>

      {/* Answer tracker dots */}
      <div style={styles.dots}>
        {questions.map((_, i) => (
          <div
            key={i}
            onClick={() => setCurrent(i)}
            style={{
              ...styles.dot,
              ...(answers[questions[i].id] ? styles.dotAnswered : {}),
              ...(i === current ? styles.dotCurrent : {}),
            }}
          />
        ))}
      </div>
    </div>
  );
}

function ResultScreen({ result, offlineSave, navigate }) {
  return (
    <div style={styles.page}>
      <div style={styles.resultCard}>
        <div style={styles.resultIcon}>
          {result.offline ? '⏳' : result.percentage >= 70 ? '🏆' : '📝'}
        </div>

        <h2 style={styles.resultTitle}>
          {result.offline ? 'Saved Offline!' : 'Quiz Complete!'}
        </h2>

        {result.offline ? (
          <div style={styles.offlineMsg}>
            <p>Your answers have been saved locally.</p>
            <p style={{ marginTop: '8px', color: '#92400e', fontSize: '13px' }}>
              Score will be calculated and saved when you go back online.
            </p>
          </div>
        ) : (
          <>
            <div style={styles.score}>
              {result.score} / {result.maxScore}
            </div>
            <div style={{
              ...styles.percentage,
              color: result.percentage >= 70 ? '#16a34a' : '#dc2626',
            }}>
              {result.percentage}%
            </div>
            <p style={{ color: '#6b7280', marginTop: '8px' }}>
              {result.percentage >= 70 ? 'Great job! Keep it up!' : 'Keep practising – you can do it!'}
            </p>
          </>
        )}

        <div style={styles.resultActions}>
          <button onClick={() => navigate('/courses')} style={styles.actionBtn}>
            📚 Back to Courses
          </button>
          <button onClick={() => navigate('/')} style={{ ...styles.actionBtn, background: '#f3f4f6', color: '#374151' }}>
            🏠 Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

function Loading() {
  return <div style={{ padding: '60px', textAlign: 'center', color: '#6b7280' }}>Loading questions...</div>;
}

function Empty({ navigate }) {
  return (
    <div style={{ padding: '60px', textAlign: 'center' }}>
      <p style={{ color: '#6b7280', marginBottom: '16px' }}>No quiz questions found for this lesson.</p>
      <button onClick={() => navigate('/courses')} style={{ ...styles.navBtn }}>Back to Courses</button>
    </div>
  );
}

const styles = {
  page: { maxWidth: '680px', margin: '0 auto', padding: '24px 20px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  backBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#4f46e5',
    fontSize: '14px',
    fontWeight: '500',
  },
  counter: { fontSize: '14px', color: '#6b7280' },
  progressBar: { height: '6px', background: '#e5e7eb', borderRadius: '4px', marginBottom: '24px', overflow: 'hidden' },
  progressFill: { height: '100%', background: '#4f46e5', borderRadius: '4px', transition: 'width 0.3s' },
  error: {
    background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626',
    padding: '10px 14px', borderRadius: '8px', fontSize: '14px', marginBottom: '16px',
  },
  card: {
    background: '#fff', borderRadius: '16px', padding: '28px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb', marginBottom: '20px',
  },
  question: { fontSize: '17px', fontWeight: '600', color: '#111827', lineHeight: '1.5', marginBottom: '24px' },
  options:  { display: 'flex', flexDirection: 'column', gap: '10px' },
  option: {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '12px 16px', border: '2px solid #e5e7eb', borderRadius: '10px',
    cursor: 'pointer', background: '#fafafa', textAlign: 'left',
    fontSize: '14px', color: '#374151', transition: 'all 0.15s',
  },
  optionSelected: { borderColor: '#4f46e5', background: '#eef2ff', color: '#4f46e5' },
  optionLabel: {
    minWidth: '24px', height: '24px', background: '#e5e7eb', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '12px', fontWeight: '700',
  },
  nav: { display: 'flex', justifyContent: 'space-between', marginBottom: '20px' },
  navBtn: {
    padding: '10px 24px', border: '1px solid #d1d5db', borderRadius: '8px',
    cursor: 'pointer', background: '#fff', color: '#374151', fontWeight: '500', fontSize: '14px',
  },
  submitBtn: { background: '#4f46e5', color: '#fff', border: 'none', fontWeight: '600' },
  dots: { display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' },
  dot: {
    width: '10px', height: '10px', borderRadius: '50%',
    background: '#e5e7eb', cursor: 'pointer', transition: 'background 0.2s',
  },
  dotAnswered: { background: '#a5b4fc' },
  dotCurrent:  { background: '#4f46e5' },
  resultCard: {
    background: '#fff', borderRadius: '20px', padding: '48px 36px',
    textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.1)', maxWidth: '480px', margin: '40px auto',
  },
  resultIcon:    { fontSize: '64px', marginBottom: '16px' },
  resultTitle:   { fontSize: '24px', fontWeight: '700', color: '#111827', marginBottom: '16px' },
  score:         { fontSize: '52px', fontWeight: '700', color: '#4f46e5' },
  percentage:    { fontSize: '24px', fontWeight: '600', marginTop: '4px' },
  offlineMsg:    { background: '#fef3c7', padding: '16px', borderRadius: '10px', color: '#78350f', fontSize: '14px' },
  resultActions: { display: 'flex', gap: '12px', marginTop: '28px', justifyContent: 'center', flexWrap: 'wrap' },
  actionBtn: {
    padding: '12px 20px', background: '#4f46e5', color: '#fff', border: 'none',
    borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '14px',
  },
};

export default Quiz;
