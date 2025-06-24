import React, { useState, FormEvent, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  FormControlLabel,
  Checkbox,
  Container,
  Grid,
  Fade,
  IconButton,
  InputAdornment,
  useTheme,
  useMediaQuery,
  Stack,
  Divider,
  Paper,
  Slide,
  Zoom,
  Tooltip,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Lock,
  Email,
  Business,
  Security,
  Support,
  CheckCircleOutline,
  Computer,
  Cloud,
  Shield,
  Login as LoginIcon,
  Insights,
  Speed,
  VerifiedUser,
  Assessment,
  Inventory,
  BugReport,
} from '@mui/icons-material';

interface LoginResponse {
  access_token: string;
  token_type: string;
  id: string;
  email: string;
  role: string;
  employee_id?: string;
}

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));
  const { login, isAuthenticated, isLoading, checkAuth } = useAuth();
  
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  // Get query parameters
  const queryParams = new URLSearchParams(location.search);
  const expired = queryParams.get('expired');
  const authFailed = queryParams.get('auth_failed');

  // Memoize the checkAuthStatus function
  const checkAuthStatus = useCallback(async () => {
    if (!hasCheckedAuth && isAuthenticated) {
      setHasCheckedAuth(true);
      await checkAuth(true);
    }
  }, [isAuthenticated, checkAuth, hasCheckedAuth]);

  // Check authentication status and redirect if needed
  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // Reset hasCheckedAuth when isAuthenticated changes to false
  useEffect(() => {
    if (!isAuthenticated) {
      setHasCheckedAuth(false);
    }
  }, [isAuthenticated]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData(prevData => ({ ...prevData, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    try {
      await login(formData.email, formData.password);
      // Login function in AuthContext handles redirection
    } catch (error: any) {
      console.error('Login error:', error);
      setError(error.message || 'Invalid email or password');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          backgroundColor: theme.palette.grey[100],
          position: 'relative',
        }}
      >
        <Paper
          elevation={1}
          sx={{
            p: theme.spacing(4),
            borderRadius: theme.shape.borderRadius,
            backgroundColor: 'white',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          }}
        >
          <CircularProgress 
            size={40} 
            sx={{ 
              color: theme.palette.primary.main,
              mb: theme.spacing(2)
            }} 
          />
          <Typography variant="h6" sx={{ color: theme.palette.grey[800], fontWeight: 500, mb: theme.spacing(1) }}>
            Loading...
          </Typography>
          <Typography variant="body2" sx={{ color: theme.palette.grey[600] }}>
            Please wait
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        maxHeight: '100vh',
        backgroundColor: theme.palette.grey[50],
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Container 
        maxWidth="lg" 
        sx={{ 
          height: '100vh',
          display: 'flex', 
          alignItems: 'center',
          position: 'relative',
          py: theme.spacing(2),
        }}
      >
        <Grid 
          container 
          spacing={4} 
          sx={{ 
            alignItems: 'center', 
            width: '100%', 
            height: '100%',
          }}
        >
          
          {/* Left Side - System Information */}
          {!isMobile && (
            <Grid 
              item 
              xs={12} 
              md={6}
              sx={{ 
                height: '100%', 
                display: 'flex', 
                alignItems: 'center',
                pr: theme.spacing(4),
              }}
            >
              <Fade in timeout={800}>
                <Box
                  sx={{
                    width: '100%',
                    maxWidth: 500,
                    mx: 'auto',
                  }}
                >
                  {/* System Title */}
                  <Box sx={{ mb: theme.spacing(5) }}>
                    <Typography 
                      variant="h3"
                      component="h1"
                      sx={{ 
                        fontWeight: 600, 
                        color: theme.palette.grey[800],
                        mb: theme.spacing(2),
                        fontSize: { md: '2rem', lg: '2.25rem' },
                        lineHeight: 1.2,
                      }}
                    >
                      IT Complaint and Inventory Management System
                    </Typography>
                    <Typography 
                      variant="h6" 
                      component="p"
                      sx={{ 
                        color: theme.palette.grey[600],
                        fontWeight: 400,
                        lineHeight: 1.5,
                        fontSize: '1rem',
                      }}
                    >
                      A system for tracking IT equipment and managing support complaints within your organization.
                    </Typography>
                  </Box>

                  {/* System Features */}
                  <Grid container spacing={theme.spacing(3)}>
                    {[
                      { 
                        icon: <Inventory />, 
                        title: 'Inventory Tracking', 
                        description: 'Track and manage IT equipment',
                      },
                      { 
                        icon: <BugReport />, 
                        title: 'Complaint Management', 
                        description: 'Handle support requests and issues',
                      },
                      { 
                        icon: <Assessment />, 
                        title: 'Basic Reports', 
                        description: 'View simple status reports',
                      },
                      { 
                        icon: <Security />, 
                        title: 'Secure Access', 
                        description: 'User authentication and access control',
                      },
                    ].map((feature, index) => (
                      <Grid item xs={12} sm={6} key={index}>
                        <Paper
                          elevation={0}
                          sx={{
                            p: theme.spacing(3),
                            backgroundColor: 'white',
                            border: `1px solid ${theme.palette.grey[200]}`,
                            borderRadius: theme.shape.borderRadius,
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              borderColor: theme.palette.grey[300],
                              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                            },
                          }}
                        >
                          <Box
                            sx={{
                              width: 40,
                              height: 40,
                              borderRadius: '50%',
                              backgroundColor: `${theme.palette.primary.main}15`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              mb: theme.spacing(2),
                            }}
                          >
                            {React.cloneElement(feature.icon, { 
                              sx: { fontSize: 20, color: theme.palette.primary.main } 
                            })}
                          </Box>
                          <Typography 
                            variant="subtitle2" 
                            sx={{ 
                              color: theme.palette.grey[800], 
                              fontWeight: 600,
                              mb: theme.spacing(0.5),
                            }}
                          >
                            {feature.title}
                          </Typography>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: theme.palette.grey[600],
                              fontSize: '0.875rem',
                              lineHeight: 1.4,
                            }}
                          >
                            {feature.description}
                          </Typography>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </Fade>
            </Grid>
          )}

          {/* Right Side - Login Form */}
          <Grid 
            item 
            xs={12} 
            md={6}
            sx={{ 
              height: '100%', 
              display: 'flex', 
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Box
              sx={{
                width: '100%',
                maxWidth: 420,
                mx: 'auto',
                px: { xs: theme.spacing(3), md: theme.spacing(2) },
              }}
            >
              <Fade in timeout={600} style={{ transitionDelay: '200ms' }}>
                <Card
                  elevation={2}
                  sx={{
                    backgroundColor: 'white',
                    borderRadius: theme.shape.borderRadius,
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                    border: `1px solid ${theme.palette.grey[200]}`,
                  }}
                >
                  <CardContent sx={{ p: theme.spacing(4) }}>
                    {/* Header */}
                    <Box sx={{ textAlign: 'center', mb: theme.spacing(4) }}>
                      <Box
                        sx={{
                          width: 60,
                          height: 60,
                          borderRadius: '50%',
                          backgroundColor: theme.palette.primary.main,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mx: 'auto',
                          mb: theme.spacing(3),
                        }}
                      >
                        <Lock sx={{ fontSize: 28, color: 'white' }} />
                      </Box>
                      
                      <Typography 
                        variant="h5" 
                        component="h1"
                        sx={{ 
                          fontWeight: 600, 
                          color: theme.palette.grey[800],
                          mb: theme.spacing(1),
                        }}
                      >
                        Sign In
                      </Typography>
                      
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: theme.palette.grey[600],
                        }}
                      >
                        Access the IT management system
                      </Typography>
                    </Box>

                    {/* Alert Messages */}
                    {expired && (
                      <Alert 
                        severity="warning" 
                        sx={{ 
                          mb: theme.spacing(3), 
                          borderRadius: theme.shape.borderRadius,
                        }}
                      >
                        Your session has expired. Please sign in again.
                      </Alert>
                    )}

                    {authFailed && (
                      <Alert 
                        severity="error" 
                        sx={{ 
                          mb: theme.spacing(3), 
                          borderRadius: theme.shape.borderRadius,
                        }}
                      >
                        Authentication failed. Please check your credentials.
                      </Alert>
                    )}

                    {error && (
                      <Alert 
                        severity="error" 
                        sx={{ 
                          mb: theme.spacing(3), 
                          borderRadius: theme.shape.borderRadius,
                        }}
                      >
                        {error}
                      </Alert>
                    )}

                    {/* Login Form */}
                    <Box 
                      component="form" 
                      onSubmit={handleSubmit} 
                      noValidate
                    >
                      <TextField
                        fullWidth
                        id="email"
                        name="email"
                        label="Email Address"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        autoComplete="email"
                        autoFocus
                        sx={{ 
                          mb: theme.spacing(3),
                          '& .MuiOutlinedInput-root': {
                            backgroundColor: 'white',
                            '& .MuiOutlinedInput-input': {
                              color: theme.palette.grey[800],
                            },
                            '&:hover fieldset': {
                              borderColor: theme.palette.grey[400],
                            },
                            '&.Mui-focused fieldset': {
                              borderColor: theme.palette.primary.main,
                            },
                          },
                          '& .MuiInputLabel-root': {
                            color: theme.palette.grey[600],
                            '&.Mui-focused': {
                              color: theme.palette.primary.main,
                            },
                          },
                        }}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Email sx={{ color: theme.palette.grey[400], fontSize: 20 }} />
                            </InputAdornment>
                          ),
                        }}
                      />

                      <TextField
                        fullWidth
                        id="password"
                        name="password"
                        label="Password"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={handleChange}
                        required
                        autoComplete="current-password"
                        sx={{ 
                          mb: theme.spacing(2),
                          '& .MuiOutlinedInput-root': {
                            backgroundColor: 'white',
                            '& .MuiOutlinedInput-input': {
                              color: theme.palette.grey[800],
                            },
                            '&:hover fieldset': {
                              borderColor: theme.palette.grey[400],
                            },
                            '&.Mui-focused fieldset': {
                              borderColor: theme.palette.primary.main,
                            },
                          },
                          '& .MuiInputLabel-root': {
                            color: theme.palette.grey[600],
                            '&.Mui-focused': {
                              color: theme.palette.primary.main,
                            },
                          },
                        }}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Lock sx={{ color: theme.palette.grey[400], fontSize: 20 }} />
                            </InputAdornment>
                          ),
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                onClick={handleClickShowPassword}
                                edge="end"
                                sx={{ 
                                  color: theme.palette.grey[400],
                                  '&:hover': {
                                    color: theme.palette.grey[600],
                                  },
                                }}
                              >
                                {showPassword ? <VisibilityOff /> : <Visibility />}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                      />

                      {/* Remember Me */}
                      <Box sx={{ 
                        mb: theme.spacing(3),
                        mt: theme.spacing(1),
                      }}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={rememberMe}
                              onChange={(e) => setRememberMe(e.target.checked)}
                              name="rememberMe"
                              sx={{
                                color: theme.palette.grey[400],
                                '&.Mui-checked': {
                                  color: theme.palette.primary.main,
                                },
                              }}
                            />
                          }
                          label={
                            <Typography variant="body2" sx={{ 
                              color: theme.palette.grey[600], 
                            }}>
                              Remember me
                            </Typography>
                          }
                        />
                      </Box>

                      {/* Login Button */}
                      <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        disabled={isSubmitting}
                        sx={{
                          py: theme.spacing(1.5),
                          fontSize: '1rem',
                          fontWeight: 500,
                          textTransform: 'none',
                          backgroundColor: theme.palette.primary.main,
                          color: 'white',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                          '&:hover': {
                            backgroundColor: theme.palette.primary.dark,
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                          },
                          '&:disabled': {
                            backgroundColor: theme.palette.grey[300],
                            color: theme.palette.grey[500],
                            boxShadow: 'none',
                          },
                        }}
                      >
                        {isSubmitting ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: theme.spacing(1) }}>
                            <CircularProgress size={18} color="inherit" />
                            <span>Signing in...</span>
                          </Box>
                        ) : (
                          'Sign In'
                        )}
                      </Button>
                    </Box>

                    {/* Footer */}
                    <Box sx={{ mt: theme.spacing(3), textAlign: 'center' }}>
                      <Typography variant="caption" sx={{ 
                        color: theme.palette.grey[500], 
                      }}>
                        Need help? Contact your IT administrator
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Fade>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default Login;