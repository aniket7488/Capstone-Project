import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register, saveToken, saveUser } from '../services/authService';

/**
 * Register page – creates a new student account.
 */
function Register() {
  const navigate = useNavigate();
  const [form, setForm]     = useState({ username: '', email: '', password: '', confirm: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirm) {
      setError('Passwords do not match');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const { data } = await register({
        username: form.username,
        email:    form.email,
        password: form.password,
      });

      saveToken(data.token);
      saveUser({ userId: data.userId, username: data.username, email: data.email, role: data.role });
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.error
        || Object.values(err.response?.data?.details || {}).join(', ')
        || 'Registration failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.logo}>📚 Quiz-Cap</h1>
        <p style={styles.subtitle}>Create your free student account</p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <Field label="Username" name="username" value={form.username}
                 placeholder="Choose a username (3–50 chars)" onChange={handleChange} />
          <Field label="Email" name="email" type="email" value={form.email}
                 placeholder="your@email.com" onChange={handleChange} />
          <Field label="Password" name="password" type="password" value={form.password}
                 placeholder="At least 6 characters" onChange={handleChange} />
          <Field label="Confirm Password" name="confirm" type="password" value={form.confirm}
                 placeholder="Re-enter your password" onChange={handleChange} />

          <button type="submit" style={styles.btn} disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p style={styles.footer}>
          Already have an account?{' '}
          <Link to="/login" style={styles.link}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}

function Field({ label, name, type = 'text', value, placeholder, onChange }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <label style={styles.label}>{label}</label>
      <input
        style={styles.input}
        type={type}
        name={name}
        value={value}
        placeholder={placeholder}
        onChange={onChange}
        required
      />
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
    padding: '36px',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
  },
  logo: {
    textAlign: 'center',
    color: '#4f46e5',
    fontSize: '26px',
    marginBottom: '4px',
  },
  subtitle: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: '13px',
    marginBottom: '24px',
  },
  error: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fca5a5',
    color: '#dc2626',
    padding: '10px 14px',
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '14px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '5px',
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
    marginTop: '18px',
    fontSize: '14px',
    color: '#6b7280',
  },
  link: { color: '#4f46e5', textDecoration: 'none', fontWeight: '500' },
};

export default Register;
