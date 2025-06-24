import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

// Default session timeout in milliseconds (30 minutes)
const DEFAULT_TIMEOUT = 30 * 60 * 1000;

// Add type declaration for window
declare global {
  interface Window {
    sessionTimeoutRef: number | null;
  }
}

/**
 * Hook to handle session timeout
 * @param timeoutInMs - Timeout duration in milliseconds
 * @param onTimeout - Optional callback to be called when session times out
 */
export const useSessionTimeout = (
  timeoutInMs: number = DEFAULT_TIMEOUT,
  onTimeout?: () => void
) => {
  const { isAuthenticated, logout } = useAuth();

  const resetTimeout = () => {
    // Clear existing timeout if any
    if (window.sessionTimeoutRef !== null) {
      window.clearTimeout(window.sessionTimeoutRef);
      window.sessionTimeoutRef = null;
    }

    // Set new timeout only if authenticated
    if (isAuthenticated) {
      window.sessionTimeoutRef = window.setTimeout(() => {
        if (onTimeout) {
          onTimeout();
        }
        logout();
      }, timeoutInMs);
    }
  };

  // Set up activity listeners
  useEffect(() => {
    if (!isAuthenticated) return;

    // Reset the timeout on mount
    resetTimeout();

    // Event listeners for user activity
    const activityEvents = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ];

    // Add event listeners
    const resetTimeoutOnActivity = () => resetTimeout();
    activityEvents.forEach(event => {
      window.addEventListener(event, resetTimeoutOnActivity);
    });

    // Cleanup: remove event listeners and clear timeout
    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, resetTimeoutOnActivity);
      });

      if (window.sessionTimeoutRef !== null) {
        window.clearTimeout(window.sessionTimeoutRef);
      }
    };
  }, [isAuthenticated, timeoutInMs, logout, onTimeout]);

  return { resetTimeout };
};

/**
 * Check if token is expiring soon (within 5 minutes)
 */
export const isTokenExpiringSoon = (): boolean => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return false;

    // Get token payload
    const payload = JSON.parse(atob(token.split('.')[1]));
    
    // Check if exp exists in payload
    if (!payload.exp) return false;
    
    // Calculate time until expiry in seconds
    const timeUntilExpiry = payload.exp - Math.floor(Date.now() / 1000);
    
    // Return true if token expires within 5 minutes
    return timeUntilExpiry > 0 && timeUntilExpiry < 300;
  } catch (error) {
    console.error('Error checking token expiration:', error);
    return false;
  }
}; 