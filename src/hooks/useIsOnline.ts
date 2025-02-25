import { useEffect, useState, useRef } from 'react';

export interface IsOnlineValues {
  error: null | string;
  isOffline: boolean;
  isOnline: boolean;
  wasOffline: boolean;
}

const MISSING_BROWSER_ERROR =
  'useIsOnline only works in a browser environment.';

const missingWindow = typeof window === 'undefined';
const missingNavigator = typeof navigator === 'undefined';

const useIsOnline = (): IsOnlineValues => {
  const [error, setError] = useState<null | string>(null);
  const [isOnline, setOnlineStatus] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);
  const prevOnlineState = useRef(true);

  useEffect(() => {
    if (missingWindow || missingNavigator) {
      setError(MISSING_BROWSER_ERROR);
      return;
    }

    setOnlineStatus(window.navigator.onLine);
    prevOnlineState.current = window.navigator.onLine;

    const toggleOnlineStatus = () => {
      const currentOnlineStatus = window.navigator.onLine;

      if (currentOnlineStatus && !prevOnlineState.current) {
        setWasOffline(true);
      }

      prevOnlineState.current = currentOnlineStatus;

      setOnlineStatus(currentOnlineStatus);
    };

    window.addEventListener('online', toggleOnlineStatus);
    window.addEventListener('offline', toggleOnlineStatus);

    return () => {
      window.removeEventListener('online', toggleOnlineStatus);
      window.removeEventListener('offline', toggleOnlineStatus);
    };
  }, []);

  useEffect(() => {
    if (wasOffline && isOnline) {
      const timeoutId = window.setTimeout(() => {
        setWasOffline(false);
      }, 1000);

      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [wasOffline, isOnline]);

  return {
    error: error || null,
    isOffline: !isOnline,
    isOnline,
    wasOffline
  };
};

export { useIsOnline };
