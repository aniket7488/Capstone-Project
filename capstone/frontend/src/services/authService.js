/**
 * authService.js – Authentication API calls and Axios interceptor setup.
 *
 * Axios interceptors are registered here and take effect globally because
 * this file is imported in index.js before anything else renders.
 *
 *  Request interceptor : attaches "Authorization: Bearer <token>" to every request.
 *  Response interceptor: on 401, clears auth data and redirects to /login.
 */

import axios from 'axios';

const API = '/api/auth';

// ── Token helpers ─────────────────────────────────────────────────────────────

export const saveToken   = (token) => localStorage.setItem('quizcap_token', token);
export const getToken    = ()      => localStorage.getItem('quizcap_token');
export const removeToken = ()      => localStorage.removeItem('quizcap_token');

export const saveUser    = (user)  => localStorage.setItem('quizcap_user', JSON.stringify(user));
export const getUser     = ()      => {
  try { return JSON.parse(localStorage.getItem('quizcap_user')); }
  catch { return null; }
};
export const removeUser  = ()      => localStorage.removeItem('quizcap_user');

export const logout = () => {
  removeToken();
  removeUser();
};

// ── API calls ─────────────────────────────────────────────────────────────────

export const register = (data) => axios.post(`${API}/register`, data);
export const login    = (data) => axios.post(`${API}/login`, data);

// ── Axios interceptors ────────────────────────────────────────────────────────

/**
 * Request interceptor – attach Bearer token to every outgoing request.
 * If no token exists (e.g., on public pages), the header is simply omitted.
 */
axios.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Response interceptor – global 401 handler.
 * If any API call returns 401, clear local auth state and redirect to /login.
 */
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      logout();
      // Avoid redirect loop if already on login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
