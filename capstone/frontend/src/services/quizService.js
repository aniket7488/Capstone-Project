/**
 * quizService.js – Quiz and result API calls.
 */
import axios from 'axios';

/** Fetch quiz questions for a lesson (correct answers excluded). */
export const getQuizzesByLesson = (lessonId) =>
  axios.get(`/api/quizzes/lesson/${lessonId}`);

/**
 * Submit quiz answers and receive a scored result.
 * @param {{ lessonId: number, answers: Object.<number, string> }} payload
 */
export const submitQuiz = (payload) =>
  axios.post('/api/quizzes/submit', payload);

/** Get full result history for the logged-in user. */
export const getMyResults = () =>
  axios.get('/api/progress/me');

/** Get aggregated progress summary for the Dashboard. */
export const getProgressSummary = () =>
  axios.get('/api/progress/me/summary');
