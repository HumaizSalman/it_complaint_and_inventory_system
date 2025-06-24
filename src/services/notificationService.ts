import axios from 'axios';
import { API_BASE_URL, STORAGE_KEYS } from '../utils/constants';

// Define notification types
export enum NotificationType {
  COMPLAINT_FORWARDED_TO_AM = 'complaint_forwarded_to_am',
  COMPLAINT_FORWARDED_TO_MANAGER = 'complaint_forwarded_to_manager',
  COMPLAINT_SENT_TO_VENDOR = 'complaint_sent_to_vendor',
  COMPLAINT_RESOLVED = 'complaint_resolved',
  COMPLAINT_REJECTED = 'complaint_rejected',
  MESSAGE = 'message'
}

// Define notification interfaces
export interface INotification {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  read: boolean;
  type: string;
  related_id?: string;
  metadata?: {
    complaintId?: string;
    forwardedBy?: string;
    forwardedTo?: string;
    status?: string;
  };
}

export interface INotificationCreate {
  user_id: string;
  message: string;
  type: string;
  related_id?: string;
}

// Service class for handling notification operations
class NotificationService {
  
  // Get all notifications for the authenticated user
  async getUserNotifications(unreadOnly = false): Promise<INotification[]> {
    try {
      const params = new URLSearchParams();
      if (unreadOnly) {
        params.append('unread_only', 'true');
      }
      
      console.log(`Fetching notifications from: ${API_BASE_URL}/notifications${params.toString() ? `?${params.toString()}` : ''}`);
      
      const response = await axios.get(`${API_BASE_URL}/notifications${params.toString() ? `?${params.toString()}` : ''}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem(STORAGE_KEYS.TOKEN)}`
        }
      });
      
      console.log('Notifications response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // Return empty array instead of throwing to avoid breaking the UI
      return [];
    }
  }
  
  // Get unread notification count
  async getUnreadCount(): Promise<number> {
    try {
      console.log(`Fetching unread notification count from: ${API_BASE_URL}/notifications/count`);
      
      const response = await axios.get(`${API_BASE_URL}/notifications/count`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem(STORAGE_KEYS.TOKEN)}`
        }
      });
      
      console.log('Unread count response:', response.data);
      return response.data.count;
    } catch (error) {
      console.error('Error fetching unread notification count:', error);
      return 0;
    }
  }
  
  // Mark a notification as read
  async markAsRead(notificationId: string): Promise<INotification> {
    try {
      console.log(`Marking notification as read: ${API_BASE_URL}/notifications/${notificationId}/read`);
      
      const response = await axios.put(`${API_BASE_URL}/notifications/${notificationId}/read`, {}, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem(STORAGE_KEYS.TOKEN)}`
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }
  
  // Mark all notifications as read
  async markAllAsRead(): Promise<boolean> {
    try {
      console.log(`Marking all notifications as read: ${API_BASE_URL}/notifications/read-all`);
      
      const response = await axios.put(`${API_BASE_URL}/notifications/read-all`, {}, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem(STORAGE_KEYS.TOKEN)}`
        }
      });
      
      return response.data.success;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }
  }
  
  // Delete a notification
  async deleteNotification(notificationId: string): Promise<boolean> {
    try {
      console.log(`Deleting notification: ${API_BASE_URL}/notifications/${notificationId}`);
      
      const response = await axios.delete(`${API_BASE_URL}/notifications/${notificationId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem(STORAGE_KEYS.TOKEN)}`
        }
      });
      
      return response.data.success;
    } catch (error) {
      console.error('Error deleting notification:', error);
      return false;
    }
  }

  /**
   * Create a notification for complaint forwarding
   */
  async createComplaintForwardNotification(
    employeeId: string,
    complaintId: string,
    type: NotificationType,
    forwardedBy: string,
    forwardedTo: string,
    status: string
  ): Promise<boolean> {
    try {
      let message = '';
      switch (type) {
        case NotificationType.COMPLAINT_FORWARDED_TO_AM:
          message = 'Your complaint has been forwarded to the Assistant Manager for review.';
          break;
        case NotificationType.COMPLAINT_FORWARDED_TO_MANAGER:
          message = 'Your complaint has been escalated to the Manager for further review.';
          break;
        case NotificationType.COMPLAINT_SENT_TO_VENDOR:
          message = 'Your complaint has been sent to the Vendor for repair assessment.';
          break;
        case NotificationType.COMPLAINT_RESOLVED:
          message = 'Your complaint has been resolved by the ATS team.';
          break;
        default:
          throw new Error('Invalid notification type');
      }

      const notificationData = {
        user_id: employeeId,
        message,
        type,
        related_id: complaintId,
        metadata: {
          complaintId,
          forwardedBy,
          forwardedTo,
          status
        }
      };

      // Try primary endpoint first
      try {
        const response = await axios.post(`${API_BASE_URL}/notifications/create`, notificationData, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem(STORAGE_KEYS.TOKEN)}`,
            'Content-Type': 'application/json'
          }
        });
        console.log('Notification created successfully:', response.data);
        return true;
      } catch (primaryError) {
        console.error('Primary notification endpoint failed:', primaryError);
        
        // Fallback to alternate endpoint
        const fallbackResponse = await axios.post(`${API_BASE_URL}/notifications`, notificationData, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem(STORAGE_KEYS.TOKEN)}`,
            'Content-Type': 'application/json'
          }
        });
        console.log('Notification created successfully (fallback):', fallbackResponse.data);
        return true;
      }
    } catch (error) {
      console.error('Failed to create notification:', error);
      return false;
    }
  }

  /**
   * Create a notification for complaint resolution
   */
  async createComplaintResolvedNotification(
    employeeId: string,
    complaintId: string,
    complaintTitle: string,
    resolvedBy: string
  ): Promise<boolean> {
    try {
      const message = `Your complaint "${complaintTitle}" has been resolved by the ATS team.`;
      
      console.log('Creating notification with type:', NotificationType.COMPLAINT_RESOLVED);
      console.log('Employee ID:', employeeId);
      console.log('Complaint ID:', complaintId);

      const notificationData = {
        user_id: employeeId,
        message,
        type: NotificationType.COMPLAINT_RESOLVED,
        related_id: complaintId,
        metadata: {
          complaintId,
          resolvedBy,
          status: 'resolved'
        }
      };
      
      console.log('Notification data:', notificationData);

      // Try primary endpoint first
      try {
        const response = await axios.post(`${API_BASE_URL}/notifications/create`, notificationData, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem(STORAGE_KEYS.TOKEN)}`,
            'Content-Type': 'application/json'
          }
        });
        console.log('Complaint resolution notification created successfully:', response.data);
        return true;
      } catch (primaryError) {
        console.error('Primary notification endpoint failed:', primaryError);
        
        // Fallback to alternate endpoint
        const fallbackResponse = await axios.post(`${API_BASE_URL}/notifications`, notificationData, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem(STORAGE_KEYS.TOKEN)}`,
            'Content-Type': 'application/json'
          }
        });
        console.log('Complaint resolution notification created successfully (fallback):', fallbackResponse.data);
        return true;
      }
    } catch (error) {
      console.error('Error creating complaint resolution notification:', error);
      return false;
    }
  }

  /**
   * Retry failed notifications
   */
  async retryFailedNotification(
    notificationData: any,
    maxRetries: number = 3,
    delayMs: number = 1000
  ): Promise<boolean> {
    let retries = 0;
    while (retries < maxRetries) {
      try {
        const response = await axios.post(`${API_BASE_URL}/notifications/create`, notificationData, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem(STORAGE_KEYS.TOKEN)}`,
            'Content-Type': 'application/json'
          }
        });
        console.log(`Notification retry successful after ${retries + 1} attempts:`, response.data);
        return true;
      } catch (error) {
        retries++;
        if (retries === maxRetries) {
          console.error('Max retries reached for notification:', error);
          return false;
        }
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, retries - 1)));
      }
    }
    return false;
  }

  /**
   * Get notifications with metadata
   */
  async getNotificationsWithMetadata(userId: string): Promise<INotification[]> {
    try {
      // Prefer the generic /notifications endpoint which returns notifications for the current user
      const response = await axios.get(`${API_BASE_URL}/notifications`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem(STORAGE_KEYS.TOKEN)}`
        }
      });
      return response.data;
    } catch (primaryError) {
      console.error('Primary notifications endpoint failed:', primaryError);
      
      // Fallback to the older /notifications/user/{id} endpoint if it exists
      try {
        const fallbackResponse = await axios.get(`${API_BASE_URL}/notifications/user/${userId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem(STORAGE_KEYS.TOKEN)}`
          }
        });
        return fallbackResponse.data;
      } catch (fallbackError) {
        console.error('Fallback notifications endpoint failed:', fallbackError);
        return [];
      }
    }
  }
}

export default new NotificationService(); 