import axios from 'axios';
import { useAuth } from '../context/AuthContext';

// Create axios instance with base URL
const api = axios.create({
  baseURL: 'http://localhost:8000'
});

// Token refresh mechanism
let isRefreshing = false;
let failedQueue = [];

// Create a variable to store the logout function
let logoutFunction: () => void;

// Export a function to set the logout handler
export const setLogoutHandler = (handler: () => void) => {
  logoutFunction = handler;
};

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

// Add a request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    console.log('Making API request to:', config.url, 'with method:', config.method);
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Set default content type for POST, PUT and PATCH requests if not already set
    if (['post', 'put', 'patch'].includes(config.method?.toLowerCase() || '') && !config.headers['Content-Type']) {
      config.headers['Content-Type'] = 'application/json';
    }
    
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Add a response interceptor
api.interceptors.response.use(
  (response) => {
    console.log('API Response from:', response.config.url, 'Status:', response.status);
    return response;
  },
  async (error) => {
    // Log detailed error information
    console.error('API Error:', error?.message);
    
    const originalRequest = error.config;
    
    if (error.response) {
      console.error('Error Response Data:', error.response.data);
      console.error('Error Response Status:', error.response.status);
      console.error('Error Response Headers:', error.response.headers);
      console.error('Request URL that failed:', originalRequest?.url);
      console.error('Request Method that failed:', originalRequest?.method);
      
      // Print request data for debugging
      if (originalRequest?.data) {
        try {
          const requestData = typeof originalRequest.data === 'string' 
            ? JSON.parse(originalRequest.data)
            : originalRequest.data;
          console.error('Request Data:', requestData);
        } catch (e) {
          console.error('Request Data (non-JSON):', originalRequest.data);
        }
      }
      
      // Handle token expiration (401 Unauthorized)
      if (error.response.status === 401 && !originalRequest._retry) {
        if (error.response.data?.detail?.includes("expired")) {
          // Try token refresh logic here if you implement it
          if (isRefreshing) {
            return new Promise(function(resolve, reject) {
              failedQueue.push({resolve, reject});
            })
              .then(token => {
                originalRequest.headers['Authorization'] = 'Bearer ' + token;
                return api(originalRequest);
              })
              .catch(err => {
                return Promise.reject(err);
              });
          }
          
          originalRequest._retry = true;
          isRefreshing = true;
          
          // Use the centralized logout function
          if (logoutFunction) {
            logoutFunction();
          } else {
            console.error('Logout function not set');
            window.location.href = '/login?expired=true';
          }
          return Promise.reject(error);
        } else {
          // Other authentication errors
          console.error('Authentication failed');
          if (logoutFunction) {
            logoutFunction();
          } else {
            console.error('Logout function not set');
            window.location.href = '/login?auth_failed=true';
          }
        }
      }
      
      // Handle forbidden errors (403)
      if (error.response.status === 403) {
        console.error('Permission denied');
        // You could redirect to an access denied page
        // window.location.href = '/access-denied';
      }
    } else if (error.request) {
      console.error('Error Request:', error.request);
      // Network error (server not responding, etc.)
      return Promise.reject({
        ...error,
        userMessage: 'Network error. Please check your connection.'
      });
    }
    
    return Promise.reject(error);
  }
);

// Function to check if token is valid
export const checkTokenValidity = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return false;
    
    // Try to access a protected endpoint that all authenticated users can access
    await api.get('/users/me');
    return true;
  } catch (error) {
    console.error('Token validation failed:', error);
    return false;
  }
};

export default api; 