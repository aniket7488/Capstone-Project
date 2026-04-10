import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getUser } from '../services/authService';
import { getProgressSummary, getMyResults } from '../services/quizService';
import { getFaq } from '../services/aiService';
import { getAllCourses } from '../services/courseService';
import { cacheFaq, cacheCourses } from '../utils/offlineStorage';

/**
 * Dashboard – landing page after login.
 *
 * Shows:
 *  - Welcome card with user info
 *  - Progress summary (completed lessons, average score)
 *  - Recent quiz results
 *
 * Also seeds the IndexedDB FAQ and courses caches in the background
 * when the user is online.
 */
function Dashboard() {
  const user    = getUser();
  const [summary, setSummary]   = useState(null);
  const [results, setResults]   = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    loadData();
    if (navigator.onLine) {
      seedCaches();
    }
    // eslint-disable-next-line
  }, []);

  async function loadData() {
    try {
      const [summaryRes, resultsRes] = await Promise.all([
        getProgressSummary(),
        getMyResults(),
      ]);
      setSummary(summaryRes.data);
      setResults(resultsRes.data.slice(0, 5)); // show latest 5
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function seedCaches() {
    try {
      const [faqRes, coursesRes] = await Promise.allSettled([
        getFaq(),
        getAllCourses(),
      ]);
      if (faqRes.status === 'fulfilled')     await cacheFaq(faqRes.value.data);
      if (coursesRes.status === 'fulfilled') await cacheCourses(coursesRes.value.data);
    } catch (e) {
      console.warn('Cache seed failed:', e);
    }
  }

  if (loading) return <div style={styles.center}><Spinner /></div>;

  const percent = summary
    ? Math.round((summary.completedLessons / Math.max(summary.totalLessons, 1)) * 100)
    : 0;

  return (
    <div style={styles.page}>
      {/* Welcome */}
      <div style={styles.welcomeCard}>
        <h2 style={styles.welcome}>
          Welcome back, <span style={{ color: '#4f46e5' }}>{user?.username}</span>! 👋
        </h2>
        <p style={styles.roleTag}>{user?.role}</p>
      </div>

      {/* Stats row */}
      {summary && (
        <div style={styles.statsRow}>
          <StatCard title="Lessons Completed" value={summary.completedLessons} icon="✅" />
          <StatCard title="Total Lessons"     value={summary.totalLessons}     icon="📖" />
          <StatCard title="Average Score"
                    value={`${summary.averageScore}%`}
                    icon="🏆"
                    highlight={summary.averageScore >= 70} />
        </div>
      )}

      {/* Progress bar */}
      {summary && (
        <div style={styles.progressSection}>
          <div style={styles.progressHeader}>
            <span>Overall Progress</span>
            <span style={{ fontWeight: '600' }}>{percent}%</span>
          </div>
          <div style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: `${percent}%` }} />
          </div>
        </div>
      )}

      {/* Recent results */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Recent Quiz Results</h3>
        {results.length === 0 ? (
          <div style={styles.empty}>
            No results yet.{' '}
            <Link to="/courses" style={styles.link}>Start a course!</Link>
          </div>
        ) : (
          <div>
            {results.map((r) => (
              <div key={r.id} style={styles.resultCard}>
                <div>
                  <div style={styles.resultTitle}>{r.lessonTitle}</div>
                  <div style={styles.resultCourse}>{r.courseTitle}</div>
                </div>
                <div style={styles.scoreBox}>
                  <span style={{
                    ...styles.score,
                    color: r.percentage >= 70 ? '#16a34a' : '#dc2626',
                  }}>
                    {r.score}/{r.maxScore}
                  </span>
                  <span style={styles.pct}>{r.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div style={styles.quickLinks}>
        <Link to="/courses" style={styles.quickBtn}>📖 Browse Courses</Link>
        <Link to="/chatbot" style={styles.quickBtn}>🤖 Ask AI Assistant</Link>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, highlight }) {
  return (
    <div style={{ ...styles.statCard, ...(highlight ? styles.statHighlight : {}) }}>
      <div style={styles.statIcon}>{icon}</div>
      <div style={styles.statValue}>{value}</div>
      <div style={styles.statTitle}>{title}</div>
    </div>
  );
}

function Spinner() {
  return <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>Loading...</div>;
}

const styles = {
  page: { maxWidth: '900px', margin: '0 auto', padding: '24px 20px' },
  center: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' },
  welcomeCard: {
    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    color: '#fff',
    borderRadius: '16px',
    padding: '24px 28px',
    marginBottom: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  welcome: { fontSize: '22px', fontWeight: '600' },
  roleTag: {
    background: 'rgba(255,255,255,0.2)',
    borderRadius: '20px',
    padding: '4px 14px',
    fontSize: '13px',
    fontWeight: '500',
  },
  statsRow: { display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' },
  statCard: {
    flex: '1 1 140px',
    background: '#fff',
    borderRadius: '12px',
    padding: '20px 16px',
    textAlign: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    border: '1px solid #e5e7eb',
  },
  statHighlight: { borderColor: '#4f46e5', background: '#eef2ff' },
  statIcon:  { fontSize: '28px', marginBottom: '8px' },
  statValue: { fontSize: '24px', fontWeight: '700', color: '#111827' },
  statTitle: { fontSize: '12px', color: '#6b7280', marginTop: '4px' },
  progressSection: {
    background: '#fff',
    borderRadius: '12px',
    padding: '20px 24px',
    marginBottom: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    border: '1px solid #e5e7eb',
  },
  progressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
    color: '#374151',
    marginBottom: '10px',
  },
  progressBar: {
    height: '10px',
    backgroundColor: '#e5e7eb',
    borderRadius: '6px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4f46e5',
    borderRadius: '6px',
    transition: 'width 0.6s ease',
  },
  section: {
    background: '#fff',
    borderRadius: '12px',
    padding: '20px 24px',
    marginBottom: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    border: '1px solid #e5e7eb',
  },
  sectionTitle: { fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '16px' },
  resultCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: '1px solid #f3f4f6',
  },
  resultTitle:  { fontWeight: '500', fontSize: '14px', color: '#111827' },
  resultCourse: { fontSize: '12px', color: '#6b7280', marginTop: '2px' },
  scoreBox: { textAlign: 'right' },
  score: { fontWeight: '700', fontSize: '18px', display: 'block' },
  pct:   { fontSize: '12px', color: '#6b7280' },
  empty: { textAlign: 'center', color: '#6b7280', padding: '20px 0', fontSize: '14px' },
  link:  { color: '#4f46e5', textDecoration: 'none', fontWeight: '500' },
  quickLinks: { display: 'flex', gap: '12px', flexWrap: 'wrap' },
  quickBtn: {
    flex: '1 1 180px',
    background: '#4f46e5',
    color: '#fff',
    textDecoration: 'none',
    padding: '14px 20px',
    borderRadius: '12px',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: '14px',
    boxShadow: '0 2px 8px rgba(79,70,229,0.3)',
  },
};

export default Dashboard;
