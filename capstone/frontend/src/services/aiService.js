/**
 * aiService.js – Chatbot and FAQ API calls.
 */
import axios from 'axios';

/**
 * Send a message to the online chatbot.
 * @param {string} message
 */
export const askChatbot = (message) =>
  axios.post('/api/chatbot/ask', { message });

/**
 * Fetch all FAQ entries from the server.
 * Called on login to pre-populate the offline IndexedDB FAQ cache.
 */
export const getFaq = () =>
  axios.get('/api/chatbot/faq');
