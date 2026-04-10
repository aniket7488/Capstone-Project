import React, { useState, useEffect } from 'react';

/**
 * OfflineBanner – displays a sticky warning when the browser is offline.
 *
 * Listens to the native browser 'online' and 'offline' events.
 * When offline, shows an amber banner at the very top of the screen.
 * Banner disappears automatically when connectivity is restored.
 */
function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline  = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);

    // Clean up listeners when component unmounts
    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div style={styles.banner}>
      <span style={styles.icon}>⚠</span>
      <span>
        You are <strong>offline</strong>. You can still read cached lessons.
        Quiz results will be saved locally and synced when you reconnect.
      </span>
    </div>
  );
}

const styles = {
  banner: {
    position: 'sticky',
    top: 0,
    zIndex: 1000,
    backgroundColor: '#f59e0b',
    color: '#1c1917',
    padding: '10px 20px',
    textAlign: 'center',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
  },
  icon: {
    fontSize: '16px',
  },
};

export default OfflineBanner;
