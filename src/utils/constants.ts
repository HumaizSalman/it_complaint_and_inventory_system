// API URLs
export const API_BASE_URL = 'http://localhost:8000';

// Common constants
export const DEFAULT_PAGINATION_LIMIT = 100;

// Notification settings
export const NOTIFICATION_POLLING_INTERVAL = 60000; // 1 minute
export const MAX_POLLING_INTERVAL = 300000; // 5 minutes

// Routes
export const ROUTES = {
  LOGIN: '/login',
  EMPLOYEE: '/employee',
  MANAGER: '/manager',
  ADMIN: '/admin',
  ATS: '/ats',
  ASSISTANT_MANAGER: '/assistant-manager',
  VENDOR: '/vendor',
  UNAUTHORIZED: '/unauthorized'
};

// Storage keys
export const STORAGE_KEYS = {
  TOKEN: 'token',
  USER_EMAIL: 'userEmail',
  USER_ROLE: 'userRole',
  USER_ID: 'userId',
  EMPLOYEE_ID: 'employeeId',
  LAST_ACTIVITY: 'lastActivity'
}; 