import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box, LinearProgress } from '@mui/material';
import { useSessionTimeout, isTokenExpiringSoon } from '../utils/sessionTimeout';
import { useAuth } from '../context/AuthContext';

// Time before session expiry to show warning (5 minutes in ms)
const WARNING_BEFORE_TIMEOUT = 5 * 60 * 1000;

// Session timeout duration (30 minutes in ms)
const SESSION_TIMEOUT = 30 * 60 * 1000;

const SessionManager: React.FC = () => {
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(WARNING_BEFORE_TIMEOUT);
  const { isAuthenticated, logout } = useAuth();

  // Set up a warning timer that shows dialog 5 minutes before timeout
  useEffect(() => {
    if (!isAuthenticated) return;

    const warningTimer = setTimeout(() => {
      // Check if token is actually expiring soon
      if (isTokenExpiringSoon()) {
        setShowTimeoutWarning(true);
        setTimeLeft(WARNING_BEFORE_TIMEOUT);
      }
    }, SESSION_TIMEOUT - WARNING_BEFORE_TIMEOUT);

    return () => {
      clearTimeout(warningTimer);
    };
  }, [isAuthenticated]);

  // Countdown timer for the warning dialog
  useEffect(() => {
    if (!showTimeoutWarning) return;

    const countdownInterval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1000) {
          clearInterval(countdownInterval);
          logout();
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);

    return () => {
      clearInterval(countdownInterval);
    };
  }, [showTimeoutWarning, logout]);

  // Setup session timeout
  const onTimeout = () => {
    // This will be called when the session times out
    console.log('Session timed out');
  };

  useSessionTimeout(SESSION_TIMEOUT, onTimeout);

  // Calculate minutes and seconds for display
  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);

  // Calculate progress percentage
  const progressPercentage = (timeLeft / WARNING_BEFORE_TIMEOUT) * 100;

  // Handle continue session
  const handleContinueSession = () => {
    setShowTimeoutWarning(false);
    // The useSessionTimeout hook will reset the timeout on user activity
  };

  // Handle logout
  const handleLogout = () => {
    setShowTimeoutWarning(false);
    logout();
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Dialog open={showTimeoutWarning} onClose={handleContinueSession}>
      <DialogTitle>Session Expiring Soon</DialogTitle>
      <DialogContent>
        <Typography variant="body1" gutterBottom>
          Your session will expire in:
        </Typography>
        <Box my={2} textAlign="center">
          <Typography variant="h4">
            {minutes}:{seconds < 10 ? `0${seconds}` : seconds}
          </Typography>
        </Box>
        <LinearProgress variant="determinate" value={progressPercentage} color="error" />
        <Typography variant="body2" mt={2}>
          For security reasons, you will be automatically logged out when the timer expires.
          Click 'Continue Session' to stay logged in.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleLogout} color="secondary">
          Logout Now
        </Button>
        <Button onClick={handleContinueSession} color="primary" variant="contained" autoFocus>
          Continue Session
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SessionManager; 