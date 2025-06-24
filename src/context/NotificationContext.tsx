import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback, useRef } from 'react';
import notificationService, { INotification } from '../services/notificationService';
import { useAuth } from './AuthContext';
import { NOTIFICATION_POLLING_INTERVAL, MAX_POLLING_INTERVAL } from '../utils/constants';

interface NotificationContextType {
  notifications: INotification[];
  unreadCount: number;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const { user } = useAuth();
  
  // Use refs to avoid unnecessary rerenders and prevent stale closures in interval callbacks
  const timerRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);
  
  // Memoize the fetch function to avoid recreating it on each render
  const fetchNotifications = useCallback(async () => {
    if (!user || !isMountedRef.current) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Fetching notifications...');
      const fetchedNotifications = await notificationService.getUserNotifications();
      
      // Check if component is still mounted before updating state
      if (!isMountedRef.current) return;
      
      // Only update state if we got a valid response
      if (Array.isArray(fetchedNotifications)) {
        setNotifications(fetchedNotifications);
        
        // Count unread
        const unread = fetchedNotifications.filter(n => !n.read).length;
        setUnreadCount(unread);
        
        // Reset failed attempts counter on success
        if (failedAttempts > 0) {
          setFailedAttempts(0);
        }
      } else {
        console.warn('Received non-array notifications response', fetchedNotifications);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      if (isMountedRef.current) {
        setError('Could not load notifications');
        setFailedAttempts(prev => prev + 1);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [user, failedAttempts]);
  
  // Mark notification as read
  const markAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === id 
            ? { ...notification, read: true } 
            : notification
        )
      );
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
      // Don't set error state here to avoid UI disruption
    }
  };
  
  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      const success = await notificationService.markAllAsRead();
      
      if (success) {
        // Update local state
        setNotifications(prev => 
          prev.map(notification => ({ ...notification, read: true }))
        );
        
        // Reset unread count
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      // Don't set error state here to avoid UI disruption
    }
  };
  
  // Delete notification
  const deleteNotification = async (id: string) => {
    try {
      const success = await notificationService.deleteNotification(id);
      
      if (success) {
        // Update local state
        const removedNotification = notifications.find(n => n.id === id);
        setNotifications(prev => prev.filter(notification => notification.id !== id));
        
        // Update unread count if needed
        if (removedNotification && !removedNotification.read) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      // Don't set error state here to avoid UI disruption
    }
  };
  
  // Set up polling only once on mount
  useEffect(() => {
    // Skip if no user
    if (!user) return;
    
    // Set mounted flag
    isMountedRef.current = true;
    
    // Initial fetch
    fetchNotifications();
    
    // Clean up any existing timer to prevent multiple timers
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Calculate polling interval with exponential backoff
    const pollingInterval = failedAttempts > 0 
      ? Math.min(NOTIFICATION_POLLING_INTERVAL * Math.pow(2, failedAttempts - 1), MAX_POLLING_INTERVAL)
      : NOTIFICATION_POLLING_INTERVAL;
    
    console.log(`Setting notification polling interval to ${pollingInterval / 1000} seconds`);
    
    // Set up polling and store the timer ID
    timerRef.current = window.setInterval(() => {
      if (isMountedRef.current && user) {
        fetchNotifications();
      }
    }, pollingInterval);
    
    // Cleanup function to prevent memory leaks and remove timers
    return () => {
      console.log('Cleaning up notification polling');
      isMountedRef.current = false;
      
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [user, fetchNotifications, failedAttempts]);
  
  return (
    <NotificationContext.Provider 
      value={{ 
        notifications, 
        unreadCount, 
        fetchNotifications, 
        markAsRead, 
        markAllAsRead, 
        deleteNotification,
        isLoading,
        error
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}; 