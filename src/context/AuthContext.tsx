import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import api, { checkTokenValidity, setLogoutHandler } from '../utils/axios';
import { useNavigate } from 'react-router-dom';

// Define types
interface User {
  id: string;
  email: string;
  role: string;
  employeeId?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: (shouldRedirect: boolean) => Promise<boolean>;
}

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  logout: () => {},
  checkAuth: async () => false,
});

// Create provider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  // Check authentication on mount
  useEffect(() => {
    const checkAuthentication = async () => {
      setIsLoading(true);
      try {
        const isValid = await checkAuth(false);
        setIsAuthenticated(isValid);
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthentication();
  }, []);

  // Set the logout handler for axios interceptor
  useEffect(() => {
    setLogoutHandler(logout);
  }, []);

  // Login function
  const login = async (email: string, password: string): Promise<void> => {
    try {
      setIsLoading(true);
      // Create form data in the format expected by OAuth2
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const response = await api.post('/token', formData.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const { access_token, id, email: userEmail, role, employee_id } = response.data;
      
      // Log the response data for debugging
      console.log('Login response data:', response.data);
      console.log('Employee ID from API:', employee_id);

      // Store token and user info
      localStorage.setItem('token', access_token);
      localStorage.setItem('userId', id);
      localStorage.setItem('userRole', role);
      localStorage.setItem('userEmail', userEmail);
      localStorage.setItem('authTimestamp', Date.now().toString());
      
      let employeeIdToUse = employee_id;
      
      if (employee_id) {
        console.log('Storing employee ID in localStorage:', employee_id);
        localStorage.setItem('employeeId', employee_id);
      } else if (role === 'employee') {
        // If user role is employee but no employee_id was provided, log a warning
        console.warn('User has employee role but no employee_id was provided by the API');
        
        // Make a follow-up API call to try to get the employee record
        try {
          const employeeResponse = await api.get(`/employees/by-email/${userEmail}`);
          if (employeeResponse.data && employeeResponse.data.id) {
            employeeIdToUse = employeeResponse.data.id;
            console.log('Retrieved employee ID from follow-up call:', employeeIdToUse);
            localStorage.setItem('employeeId', employeeIdToUse);
          } else {
            // If we still can't find by email, use the user ID as a fallback
            console.log('Using user ID as fallback for employee ID:', id);
            localStorage.setItem('employeeId', id);
            employeeIdToUse = id;
          }
        } catch (err) {
          console.error('Failed to fetch employee record:', err);
          // Use user ID as employee ID as a last resort
          console.log('Using user ID as fallback after API error:', id);
          localStorage.setItem('employeeId', id);
          employeeIdToUse = id;
        }
      } else {
        console.warn('No employee_id received from API');
      }

      // Set user state
      setUser({
        id,
        email: userEmail,
        role,
        employeeId: employeeIdToUse
      });
      
      setIsAuthenticated(true);

      // Navigate based on role
      if (role === 'employee') {
        navigate('/employee');
      } else if (role === 'ats') {
        navigate('/ats');
      } else if (role === 'assistant_manager') {
        navigate('/assistant-manager');
      } else if (role === 'vendor') {
        navigate('/vendor');
      } else if (role === 'manager') {
        navigate('/manager');
      } else if (role === 'admin') {
        navigate('/admin');
      }
    } catch (error: any) {
      console.error('Login failed:', error);
      const errorMessage = error.response?.data?.detail || 'Invalid email or password';
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    // First, clear all auth-related timeouts and intervals
    if (window.sessionTimeoutRef) {
      clearTimeout(window.sessionTimeoutRef);
    }

    // Clear all auth data atomically
    const keysToRemove = [
      'token',
      'userId',
      'userRole',
      'userEmail',
      'employeeId',
      'authTimestamp'
    ];
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Update state
    setUser(null);
    setIsAuthenticated(false);
    
    // Force immediate navigation to login
    window.location.href = '/login';
  };

  // Check if user is authenticated
  const checkAuth = async (shouldRedirect: boolean = false): Promise<boolean> => {
    // Check if token exists
    const token = localStorage.getItem('token');
    if (!token) {
      if (shouldRedirect) {
        navigate('/login');
      }
      return false;
    }

    // Check token validity
    try {
      // Check if token is expired on the client side
      // This is just a basic check - the server is the source of truth
      const authTimestamp = localStorage.getItem('authTimestamp');
      const userId = localStorage.getItem('userId');
      const userEmail = localStorage.getItem('userEmail');
      const userRole = localStorage.getItem('userRole');
      const employeeId = localStorage.getItem('employeeId');
      
      if (!authTimestamp || !userId || !userEmail || !userRole) {
        if (shouldRedirect) {
          navigate('/login');
        }
        return false;
      }

      // Verify token with the server
      const isValid = await checkTokenValidity();
      if (!isValid) {
        if (shouldRedirect) {
          navigate('/login');
        }
        return false;
      }

      // Only update user state if it's different from current state
      const newUser = {
        id: userId,
        email: userEmail,
        role: userRole,
        employeeId: employeeId || undefined
      };

      if (JSON.stringify(user) !== JSON.stringify(newUser)) {
        setUser(newUser);
      }

      // Handle redirection based on role if needed
      if (shouldRedirect && userRole) {
        switch (userRole) {
          case 'employee':
            navigate('/employee');
            break;
          case 'ats':
            navigate('/ats');
            break;
          case 'assistant_manager':
            navigate('/assistant-manager');
            break;
          case 'vendor':
            navigate('/vendor');
            break;
          case 'manager':
            navigate('/manager');
            break;
          case 'admin':
            navigate('/admin');
            break;
          default:
            navigate('/');
        }
      }

      return true;
    } catch (error) {
      console.error('Token validation error:', error);
      if (shouldRedirect) {
        navigate('/login');
      }
      return false;
    }
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    checkAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);

export default AuthContext; 