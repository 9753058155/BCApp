import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';
import * as serviceWorkerRegistration from './serviceWorkerRegistration'; // Import this

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AuthProvider>
      <Toaster 
  position="top-center" 
  toastOptions={{
    // This ensures ALL toasts disappear after 3 seconds by default
    duration: 3000, 
    style: {
      background: 'var(--bg-card)',
      color: 'var(--text)',
      border: '1px solid var(--border)',
    },
  }} 
/>
      <App />
    </AuthProvider>
  </React.StrictMode>
);

// This line enables the PWA features
serviceWorkerRegistration.register(); 