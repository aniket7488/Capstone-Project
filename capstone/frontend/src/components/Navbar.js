import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getUser, logout } from '../services/authService';

/**
 * Navbar – top navigation bar.
 * Hidden on public pages (/login, /register).
 * Shows the current user's name and a logout button.
 */
function Navbar() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const user      = getUser();

  // Don't render on auth pages
  const publicPaths = ['/login', '/register'];
  if (publicPaths.includes(location.pathname) || !user) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav style={styles.nav}>
      <div style={styles.brand}>
        <Link to="/" style={styles.brandLink}>
          📚 Quiz-Cap
        </Link>
      </div>

      <div style={styles.links}>
        <NavLink to="/"         label="Dashboard" current={location.pathname} />
        <NavLink to="/courses"  label="Courses"   current={location.pathname} />
        <NavLink to="/chatbot"  label="AI Chat"   current={location.pathname} />
      </div>

      <div style={styles.userArea}>
        <span style={styles.username}>
          {user.role === 'ADMIN' ? '👑' : user.role === 'TEACHER' ? '🎓' : '👤'}
          &nbsp;{user.username}
        </span>
        <button onClick={handleLogout} style={styles.logoutBtn}>
          Logout
        </button>
      </div>
    </nav>
  );
}

function NavLink({ to, label, current }) {
  const isActive = current === to;
  return (
    <Link
      to={to}
      style={{
        ...styles.link,
        ...(isActive ? styles.activeLink : {}),
      }}
    >
      {label}
    </Link>
  );
}

const styles = {
  nav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#4f46e5',
    color: '#fff',
    padding: '0 24px',
    height: '60px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
    position: 'sticky',
    top: 0,
    zIndex: 999,
  },
  brand: {
    fontWeight: '700',
    fontSize: '20px',
  },
  brandLink: {
    color: '#fff',
    textDecoration: 'none',
  },
  links: {
    display: 'flex',
    gap: '8px',
  },
  link: {
    color: 'rgba(255,255,255,0.8)',
    textDecoration: 'none',
    padding: '6px 14px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background 0.2s',
  },
  activeLink: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: '#fff',
  },
  userArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  username: {
    fontSize: '14px',
    opacity: 0.9,
  },
  logoutBtn: {
    background: 'rgba(255,255,255,0.15)',
    border: '1px solid rgba(255,255,255,0.4)',
    color: '#fff',
    padding: '5px 14px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
  },
};

export default Navbar;
