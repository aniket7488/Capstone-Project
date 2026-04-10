import React from 'react';
import { Navigate } from 'react-router-dom';
import { getToken, logout } from '../services/authService';

/**
 * ProtectedRoute – wraps any page that requires authentication.
 *
 * Checks:
 *  1. Is there a token in localStorage?
 *  2. Has the token expired? (decoded from JWT payload without a library)
 *
 * If either check fails, clears auth data and redirects to /login.
 */
function ProtectedRoute({ children }) {
  const token = getToken();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Decode JWT payload (base64 middle segment) to check expiry
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp * 1000 < Date.now()) {
      // Token has expired – clear storage and redirect
      logout();
      return <Navigate to="/login" replace />;
    }
  } catch {
    // Malformed token
    logout();
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;
