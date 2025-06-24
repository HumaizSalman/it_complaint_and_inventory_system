import React, { useState, useEffect, useCallback } from 'react';
import {
  Badge,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  Box,
  Divider,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Forward as ForwardIcon,
  Assignment as AssignmentIcon,
  Build as BuildIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import notificationService, { INotification, NotificationType } from '../services/notificationService';
import { formatDistanceToNow } from 'date-fns';

const NotificationBell: React.FC = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) {
      console.log('No user ID available for fetching notifications');
      return;
    }
    
    console.log('Fetching notifications for user ID:', user.id);
    setLoading(true);
    setError(null);
    try {
      const fetchedNotifications = await notificationService.getNotificationsWithMetadata(user.id);
      console.log('Fetched notifications:', fetchedNotifications);
      setNotifications(fetchedNotifications);
      
      // Log any COMPLAINT_RESOLVED notifications
      const resolvedNotifications = fetchedNotifications.filter(n => n.type === NotificationType.COMPLAINT_RESOLVED);
      if (resolvedNotifications.length > 0) {
        console.log('Found resolved complaint notifications:', resolvedNotifications);
      }
    } catch (err) {
      setError('Failed to fetch notifications');
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchNotifications();
    
    // Set up polling for real-time updates
    const pollInterval = setInterval(() => {
      console.log('Polling for notifications...');
      fetchNotifications();
    }, 15000); // Poll every 15 seconds for quicker updates
    
    return () => clearInterval(pollInterval);
  }, [fetchNotifications]);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = async (notification: INotification) => {
    try {
      // Mark notification as read
      await notificationService.markAsRead(notification.id);
      
      // Update local state
      setNotifications(prevNotifications =>
        prevNotifications.map(n =>
          n.id === notification.id ? { ...n, read: true } : n
        )
      );

      // Handle navigation based on notification type
      if (notification.metadata?.complaintId) {
        // Navigate to the specific complaint detail page
        window.location.href = `/complaints/${notification.metadata.complaintId}`;
      }
    } catch (err) {
      console.error('Error handling notification click:', err);
    }
    handleClose();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case NotificationType.COMPLAINT_FORWARDED_TO_AM:
        return <ForwardIcon color="primary" />;
      case NotificationType.COMPLAINT_FORWARDED_TO_MANAGER:
        return <AssignmentIcon color="primary" />;
      case NotificationType.COMPLAINT_SENT_TO_VENDOR:
        return <BuildIcon color="primary" />;
      case NotificationType.COMPLAINT_RESOLVED:
        return <CheckCircleIcon color="success" />;
      case NotificationType.COMPLAINT_REJECTED:
        return <ForwardIcon color="error" />;
      default:
        return <NotificationsIcon color="primary" />;
    }
  };

  const getNotificationContent = (notification: INotification) => {
    const timeAgo = formatDistanceToNow(new Date(notification.created_at), { addSuffix: true });
    
    // Enhanced display for special notification types
    const isResolutionNotification = notification.type === NotificationType.COMPLAINT_RESOLVED;
    const isRejectionNotification = notification.type === NotificationType.COMPLAINT_REJECTED;
    
    return (
      <Box>
        <Typography variant="body1" sx={{ 
          fontWeight: notification.read ? 'normal' : 'bold',
          color: isResolutionNotification ? 'success.main' : 
                 isRejectionNotification ? 'error.main' : 'inherit'
        }}>
          {notification.message}
        </Typography>
        <Typography variant="caption" color="textSecondary">
          {timeAgo}
        </Typography>
        {notification.metadata && (
          <Typography variant="caption" color="textSecondary" display="block">
            {isResolutionNotification 
              ? `Resolved by: ${notification.metadata.resolvedBy || 'ATS Team'}`
              : isRejectionNotification
              ? `Requires Action`
              : `Status: ${notification.metadata.status || 'Unknown'}`
            }
          </Typography>
        )}
      </Box>
    );
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <>
      <IconButton
        color="inherit"
        onClick={handleClick}
        sx={{ ml: 2 }}
        aria-label={`${unreadCount} unread notifications`}
      >
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: {
            maxHeight: 400,
            width: '350px',
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6">Notifications</Typography>
        </Box>
        <Divider />
        
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <CircularProgress size={24} />
          </Box>
        )}
        
        {error && (
          <Box sx={{ p: 2 }}>
            <Typography color="error">{error}</Typography>
          </Box>
        )}
        
        {!loading && !error && notifications.length === 0 && (
          <Box sx={{ p: 2 }}>
            <Typography color="textSecondary">No notifications</Typography>
          </Box>
        )}

        <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
          {notifications.map((notification) => (
            <ListItem
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              sx={{
                cursor: 'pointer',
                bgcolor: notification.read ? 'transparent' : 'action.hover',
                '&:hover': {
                  bgcolor: 'action.selected',
                },
              }}
            >
              <ListItemIcon>
                {getNotificationIcon(notification.type)}
              </ListItemIcon>
              <ListItemText
                primary={getNotificationContent(notification)}
              />
            </ListItem>
          ))}
        </List>
      </Menu>
    </>
  );
};

export default NotificationBell; 