import React, { memo } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { theme } from './theme';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import AdminPortal from './pages/AdminPortal';
import ManagerPortal from './pages/ManagerPortal';
import EmployeePortal from './pages/EmployeePortal';
import VendorPortal from './pages/VendorPortal';
import ATSPortal from './pages/ATSPortal';
import AssistantManagerPortal from './pages/AssistantManagerPortal';
import ProtectedRoute from './components/ProtectedRoute';
import Unauthorized from './pages/Unauthorized';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import SessionManager from './components/SessionManager';

// Memoized component for authenticated routes to avoid unnecessary rerenders
const AuthenticatedRoutes = memo(() => {
  const { user } = useAuth();
  
  // Only use NotificationProvider if user is authenticated
  const content = (
    <>
      <SessionManager />
      <div className="app-container">
        <Routes>
          {/* Authenticated routes */}
          <Route element={<ProtectedRoute allowedRoles={['employee']} />}>
            <Route path="/employee/*" element={<EmployeePortal />} />
          </Route>
          
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin/*" element={<AdminPortal />} />
          </Route>
          
          <Route element={<ProtectedRoute allowedRoles={['manager']} />}>
            <Route path="/manager/*" element={<ManagerPortal />} />
          </Route>
          
          <Route element={<ProtectedRoute allowedRoles={['vendor']} />}>
            <Route path="/vendor/*" element={<VendorPortal />} />
          </Route>
          
          <Route element={<ProtectedRoute allowedRoles={['ats']} />}>
            <Route path="/ats/*" element={<ATSPortal />} />
          </Route>
          
          <Route element={<ProtectedRoute allowedRoles={['assistant_manager']} />}>
            <Route path="/assistant-manager/*" element={<AssistantManagerPortal />} />
          </Route>
        </Routes>
      </div>
    </>
  );
  
  // Only wrap with NotificationProvider if user is authenticated
  // This prevents notification polling when not needed
  return user ? (
    <NotificationProvider>
      {content}
    </NotificationProvider>
  ) : content;
});

// Main App component
export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            
            {/* Authenticated routes wrapped in a separate component */}
            <Route path="/*" element={<AuthenticatedRoutes />} />
          </Routes>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}