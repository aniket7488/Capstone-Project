import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Navbar from './components/Navbar';
import OfflineBanner from './components/OfflineBanner';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Courses from './pages/Courses';
import Quiz from './pages/Quiz';
import Chatbot from './pages/Chatbot';

/**
 * Root application component.
 * Defines all client-side routes using React Router v6.
 *
 * Public routes:  /login, /register
 * Protected routes (require JWT): /, /courses, /quiz/:lessonId, /chatbot
 */
function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      {/* Sticky offline notification banner */}
      <OfflineBanner />

      {/* Top navigation bar (shows only when logged in) */}
      <Navbar />

      <Routes>
        {/* Public */}
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected */}
        <Route path="/" element={
          <ProtectedRoute><Dashboard /></ProtectedRoute>
        } />
        <Route path="/courses" element={
          <ProtectedRoute><Courses /></ProtectedRoute>
        } />
        <Route path="/quiz/:lessonId" element={
          <ProtectedRoute><Quiz /></ProtectedRoute>
        } />
        <Route path="/chatbot" element={
          <ProtectedRoute><Chatbot /></ProtectedRoute>
        } />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
