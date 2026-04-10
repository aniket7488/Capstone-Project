import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Import authService first so Axios interceptors are registered BEFORE
// any component mounts and makes API calls.
import './services/authService';

// Register the offline→online sync listener once at app startup.
// When the browser comes back online, unsynced quiz results are sent to the server.
import { registerSyncListener } from './utils/syncManager';
registerSyncListener();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
