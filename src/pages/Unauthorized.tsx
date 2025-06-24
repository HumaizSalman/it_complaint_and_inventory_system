import React from 'react';
import { Box, Typography, Button, Container } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Unauthorized: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Determine where to redirect the user based on their role
  const handleRedirect = () => {
    if (!user) {
      navigate('/login');
      return;
    }

    switch (user.role) {
      case 'employee':
        navigate('/employee');
        break;
      case 'admin':
        navigate('/admin');
        break;
      case 'ats':
        navigate('/ats');
        break;
      case 'assistant_manager':
        navigate('/assistant-manager');
        break;
      case 'manager':
        navigate('/manager');
        break;
      case 'vendor':
        navigate('/vendor');
        break;
      default:
        navigate('/login');
    }
  };

  return (
    <Container maxWidth="md">
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
        textAlign="center"
      >
        <Typography variant="h1" color="error" gutterBottom>
          403
        </Typography>
        <Typography variant="h4" gutterBottom>
          Access Denied
        </Typography>
        <Typography variant="body1" paragraph>
          You do not have permission to access this page.
        </Typography>
        <Box mt={4} display="flex" gap={2}>
          <Button variant="contained" color="primary" onClick={handleRedirect}>
            Go to Dashboard
          </Button>
          <Button variant="outlined" color="secondary" onClick={logout}>
            Log Out
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default Unauthorized; 