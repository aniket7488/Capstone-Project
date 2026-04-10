import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login, saveToken, saveUser } from '../services/authService';
import { cacheFaq } from '../utils/offlineStorage';
import { getFaq } from '../services/aiService';
import { getAllCourses } from '../services/courseService';
import { cacheCourses } from '../utils/offlineStorage';

/**
 * Login page – authenticates the user and seeds offline caches on success.
 */
function Login() {
  const navigate = useNavigate();
  const [form, setForm]     = useState({ username: '', password: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await login(form);

      // Persist auth data
      saveToken(data.token);
      saveUser({ userId: data.userId, username: data.username, email: data.email, role: data.role });

      // Seed offline caches in the background (don't block navigation)
      if (navigator.onLine) {
        seedOfflineCaches().catch(console.warn);
      }

      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  /** Pre-populate IndexedDB with courses and FAQ data for offline use. */
  async function seedOfflineCaches() {
    const [coursesRes, faqRes] = await Promise.allSettled([
      getAllCourses(),
      getFaq(),
    ]);
    if (coursesRes.status === 'fulfilled') {
      await cacheCourses(coursesRes.value.data);
    }
    if (faqRes.status === 'fulfilled') {
      await cacheFaq(faqRes.value.data);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.logo}>📚 Quiz-Cap</h1>
        <p style={styles.subtitle}>AI-Driven Digital Learning Platform</p>

        <h2 style={styles.title}>Sign In</h2>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={styles.field}>
            <label style={styles.label}>Username</label>
            <input
              style={styles.input}
              type="text"
              name="username"
              value={form.username}
              onChange={handleChange}
              placeholder="Enter your username"
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              style={styles.input}
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
            />
          </div>

          <button type="submit" style={styles.btn} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={styles.footer}>
          Don't have an account?{' '}
          <Link to="/register" style={styles.link}>Register here</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px',
  },
  card: {
    background: '#fff',
    borderRadius: '16px',
    padding: '40px 36px',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
  },
  logo: {
    textAlign: 'center',
    color: '#4f46e5',
    fontSize: '28px',
    marginBottom: '4px',
  },
  subtitle: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: '13px',
    marginBottom: '28px',
  },
  title: {
    fontSize: '20px',
    color: '#111827',
    marginBottom: '20px',
    fontWeight: '600',
  },
  error: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fca5a5',
    color: '#dc2626',
    padding: '10px 14px',
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '16px',
  },
  field: { marginBottom: '16px' },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  btn: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '8px',
  },
  footer: {
    textAlign: 'center',
    marginTop: '20px',
    fontSize: '14px',
    color: '#6b7280',
  },
  link: { color: '#4f46e5', textDecoration: 'none', fontWeight: '500' },
};

export default Login;
