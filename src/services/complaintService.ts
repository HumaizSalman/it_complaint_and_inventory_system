import api from '../utils/axios';
import { API_BASE_URL, STORAGE_KEYS } from '../utils/constants';
import axios from 'axios';
import notificationService, { NotificationType } from './notificationService';

export interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
}

export interface Reply {
  id: string;
  complaint_id: string;
  message: string;
  from_user: string;
  timestamp: string;
  user_id?: string;
}

export interface Complaint {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  employee_id: string;
  employee?: Employee;
  date_submitted: string;
  last_updated: string;
  resolution_date?: string;
  resolution_notes?: string;
  approval_status?: string;
  approval_history?: ApprovalHistoryItem[];
  replies?: Reply[];
  images?: string[];
  assigned_to?: string;
}

export interface ApprovalHistoryItem {
  level: string;
  status: string;
  comment: string;
  timestamp: string;
  by: string;
}

export interface ComplaintCreate {
  title: string;
  description: string;
  priority: string;
  employee_id: string;
  images?: string[];
}

export interface ReplyCreate {
  complaint_id: string;
  message: string;
  from_user: string;
  user_id?: string;
}

export interface ComplaintFilterOptions {
  status?: string;
  priority?: string;
  approval_status?: string;
  handled_by?: string;
  from_date?: string;
  to_date?: string;
  employee_id?: string;
}

class ComplaintService {
  /**
   * Get all complaints with optional filters
   */
  async getComplaints(filters: ComplaintFilterOptions = {}): Promise<Complaint[]> {
    try {
      // Build query params
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      
      const query = params.toString() ? `?${params.toString()}` : '';
      const response = await api.get(`/complaints${query}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching complaints:', error);
      throw error;
    }
  }

  /**
   * Get a specific complaint by ID
   */
  async getComplaintById(id: string): Promise<Complaint> {
    try {
      // Since the direct endpoint is not available and /complaints/all is failing,
      // we'll try a different approach to get the complaint data.
      
      // First, try to get the complaint through the PATCH endpoint
      // using a harmless update to fetch current data
      try {
        const response = await api.patch(`/complaints/${id}`, {
          // Empty update - just to get current data
        });
        return response.data;
      } catch (patchError) {
        // If PATCH fails (e.g., permission issues), try the PUT endpoint
        try {
          const putResponse = await api.put(`/complaints/${id}`, {
            // Empty update - just to get current data
          });
          return putResponse.data;
        } catch (putError) {
          // If both direct approaches fail, we might have to fall back to a workaround
          // Try to get employee complaints and filter for this specific ID
          
          // We don't know which employee this complaint belongs to,
          // so this is a best effort approach that will only work
          // for complaints related to the current user
          console.error("Failed to get complaint directly:", patchError);
          throw new Error(`Unable to fetch complaint with ID ${id}. The backend API may not support the necessary operations.`);
        }
      }
    } catch (error) {
      console.error(`Error fetching complaint with ID ${id}:`, error);
      // Create a minimal mock complaint as a last resort
      return {
        id: id,
        title: "Unavailable",
        description: "Complaint details could not be loaded",
        priority: "medium",
        status: "unknown",
        employee_id: "",
        date_submitted: new Date().toISOString(),
        last_updated: new Date().toISOString(),
        resolution_notes: "" // Important to return empty string instead of undefined
      };
    }
  }

  /**
   * Get complaints for a specific employee
   */
  async getEmployeeComplaints(employeeId: string): Promise<Complaint[]> {
    try {
      const response = await api.get(`/employees/${employeeId}/complaints`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching complaints for employee ${employeeId}:`, error);
      throw error;
    }
  }

  /**
   * Create a new complaint
   */
  async createComplaint(complaintData: ComplaintCreate): Promise<Complaint> {
    try {
      const response = await api.post('/complaints/', complaintData);
      return response.data;
    } catch (error) {
      console.error('Error creating complaint:', error);
      throw error;
    }
  }

  /**
   * Update an existing complaint
   */
  async updateComplaint(id: string, updateData: Partial<Complaint>): Promise<Complaint> {
    try {
      const response = await api.put(`/complaints/${id}`, updateData);
      return response.data;
    } catch (error) {
      console.error(`Error updating complaint ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a complaint
   */
  async deleteComplaint(id: string): Promise<void> {
    try {
      await api.delete(`/complaints/${id}`);
    } catch (error) {
      console.error(`Error deleting complaint ${id}:`, error);
      throw error;
    }
  }

  /**
   * Forward a complaint to the next level (ATS → Assistant Manager → Manager)
   */
  async forwardComplaint(complaintId: string, fromLevel: string, toLevel: string, comment: string): Promise<Complaint> {
    try {
      // First, get the current complaint to preserve existing notes
      const currentComplaint = await this.getComplaintById(complaintId);
      
      // Get existing notes
      const existingNotes = currentComplaint.resolution_notes || "";
      
      // Create the forwarding message
      const forwardingNote = `Forwarded from ${fromLevel} to ${toLevel}: ${comment}`;
      
      // Append forwarding note to existing notes with a newline separator
      const updatedNotes = existingNotes 
        ? existingNotes.trim() + '\n' + forwardingNote
        : forwardingNote;
      
      // Use PATCH method for updating partial complaint data
      const response = await api.patch(`/complaints/${complaintId}`, {
        status: 'forwarded',
        resolution_notes: updatedNotes
      });
      
      return response.data;
    } catch (error) {
      console.error(`Error forwarding complaint ${complaintId}:`, error);
      throw error;
    }
  }

  /**
   * Approve a complaint at a specific level
   */
  async approveComplaint(complaintId: string, level: string, comment: string): Promise<Complaint> {
    try {
      // Update complaint with approval metadata
      const response = await api.patch(`/complaints/${complaintId}`, {
        status: 'in_progress',
        // Don't use approval_status since it doesn't exist in the database yet
        // approval_status: level === 'assistant_manager' ? 'approved_assistant_manager' : 'approved_manager',
        resolution_notes: `Approved by ${level}: ${comment}`
      });
      return response.data;
    } catch (error) {
      console.error(`Error approving complaint ${complaintId}:`, error);
      throw error;
    }
  }

  /**
   * Check if a complaint has associated quote requests (vendor codes)
   */
  async checkComplaintHasQuoteRequests(complaintId: string): Promise<{
    complaint_id: string;
    has_quote_requests: boolean;
    matching_quote_requests: any[];
    can_approve: boolean;
    message: string;
  }> {
    try {
      const response = await api.get(`/complaints/${complaintId}/has-quote-requests`);
      return response.data;
    } catch (error) {
      console.error(`Error checking quote requests for complaint ${complaintId}:`, error);
      throw error;
    }
  }

  /**
   * Reject a complaint at a specific level
   */
  async rejectComplaint(complaintId: string, level: string, comment: string): Promise<Complaint> {
    try {
      // First, get the current complaint to preserve existing data
      const currentComplaint = await this.getComplaintById(complaintId);
      
      // Get existing notes
      const existingNotes = currentComplaint.resolution_notes || "";
      
      // Create the rejection message
      const rejectionNote = `Rejected by ${level}: ${comment}`;
      
      // Append rejection note to existing notes with a newline separator
      const updatedNotes = existingNotes 
        ? existingNotes.trim() + '\n' + rejectionNote
        : rejectionNote;
      
      // Create a complete update object with all required fields
      const updateData = {
        title: currentComplaint.title,
        description: currentComplaint.description,
        priority: currentComplaint.priority,
        status: 'closed', // Using 'closed' as the valid status instead of 'rejected'
        resolution_notes: updatedNotes
      };
      
      console.debug('Rejecting complaint with complete data:', updateData);
      
      // Use PUT with the complete data
      const response = await api.put(`/complaints/${complaintId}`, updateData);
      
      return response.data;
    } catch (error) {
      console.error(`Error rejecting complaint ${complaintId}:`, error);
      throw error;
    }
  }

  /**
   * Mark a complaint as resolved
   */
  async resolveComplaint(complaintId: string, notes: string): Promise<Complaint> {
    try {
      console.log(`🔧 Resolving complaint ${complaintId} with notes: ${notes}`);
      
      // Use the new backend endpoint that handles both complaint resolution and notification
      const response = await api.post(`/complaints/${complaintId}/resolve`, {
        resolution_notes: notes
      });
      
      console.log('✅ Complaint resolved successfully with automatic notification');
      return response.data;
    } catch (error) {
      console.error(`❌ Error resolving complaint ${complaintId}:`, error);
      throw error;
    }
  }

  /**
   * Add a reply to a complaint - since there's no direct endpoint for replies in the backend,
   * we're sending as part of the complaint update
   */
  async addReply(replyData: ReplyCreate): Promise<Reply> {
    try {
      // Format the new message
      const newMessage = `Message from ${replyData.from_user}: ${replyData.message}`;
      
      // Try to get the current complaint to check existing resolution_notes
      let existingNotes = "";
      let complaintDetails: Complaint | null = null;
      
      try {
        complaintDetails = await this.getComplaintById(replyData.complaint_id);
        existingNotes = complaintDetails.resolution_notes || "";
      } catch (error) {
        console.warn("Could not get existing notes, will create new notes", error);
        // Continue without existing notes
      }
      
      // Append to existing notes or set as new notes
      // Make sure to add a newline between existing content and new message
      let updatedNotes = existingNotes 
        ? existingNotes.trim() + '\n' + newMessage
        : newMessage;
      
      // Since there's no direct endpoint for replies, we'll update the complaint
      // with the reply message in the resolution_notes field
      // Use PATCH as it's more likely to succeed with partial updates
      await api.patch(`/complaints/${replyData.complaint_id}`, {
        resolution_notes: updatedNotes,
        last_updated: new Date().toISOString()
      });
      
      // Create a mock reply object since the backend doesn't support replies directly
      const mockReply: Reply = {
        id: `temp-${Date.now()}`,
        complaint_id: replyData.complaint_id,
        message: replyData.message,
        from_user: replyData.from_user,
        timestamp: new Date().toISOString(),
        user_id: replyData.user_id
      };
      
      // Try to create notification, but don't fail if it doesn't work
      if (complaintDetails) {
        this.createNotificationForReply(replyData, complaintDetails)
          .catch(error => console.error("Non-critical notification error:", error));
      }
      
      return mockReply;
    } catch (error) {
      console.error('Error adding reply:', error);
      throw error;
    }
  }

  /**
   * Helper method to create notifications for new replies
   * Separated to keep the main method cleaner
   */
  private async createNotificationForReply(replyData: ReplyCreate, complaintDetails: Complaint): Promise<void> {
    try {
      console.log("Attempting to create notification for reply");
      
      // Handle notification based on the sender
      if (replyData.from_user.includes("Employee")) {
        // Employee is sending a message to staff (ATS, Manager, Assistant Manager)
        await this.notifyStaffAboutMessage(replyData, complaintDetails);
      } 
      else if (replyData.from_user.includes("ATS")) {
        // ATS is sending a message to Employee
        await this.notifyEmployeeAboutMessage(replyData, complaintDetails);
      }
      else if (replyData.from_user.includes("Manager")) {
        // Manager is sending a message to Employee
        await this.notifyEmployeeAboutMessage(replyData, complaintDetails);
      }
      else if (replyData.from_user.includes("Assistant Manager")) {
        // Assistant Manager is sending a message to Employee
        await this.notifyEmployeeAboutMessage(replyData, complaintDetails);
      }
      else {
        console.log(`Unknown sender type: ${replyData.from_user}, not creating notification`);
      }
    } catch (error) {
      console.error('Error in notification creation:', error);
      // Don't throw - this is non-critical
    }
  }

  /**
   * Notify ATS/Manager/Assistant Manager about a message from an employee
   */
  private async notifyStaffAboutMessage(replyData: ReplyCreate, complaintDetails: Complaint): Promise<void> {
    try {
      // Find users to notify based on complaint status
      // First, check if there's an assigned user
      if (complaintDetails.assigned_to) {
        await this.createNotificationForUser(
          complaintDetails.assigned_to,
          `New message from ${complaintDetails.employee?.name || 'Employee'} on complaint "${complaintDetails.title}"`,
          replyData.complaint_id
        );
        return;
      }

      // If no assigned user, get users from backend based on their roles
      try {
        // Get all ATS users - this endpoint needs to exist in the backend
        const atsResponse = await api.get('/users/by-role/ats');
        const atsUsers = atsResponse.data;

        if (Array.isArray(atsUsers) && atsUsers.length > 0) {
          // Create a notification for each ATS user
          for (const atsUser of atsUsers) {
            await this.createNotificationForUser(
              atsUser.id,
              `New message from ${complaintDetails.employee?.name || 'Employee'} on complaint "${complaintDetails.title}"`,
              replyData.complaint_id
            );
          }
        } else {
          console.log('No ATS users found to notify');
        }
      } catch (error) {
        console.error('Error notifying ATS users:', error);
      }
    } catch (error) {
      console.error('Error notifying staff:', error);
    }
  }

  /**
   * Notify employee about a message from staff
   */
  private async notifyEmployeeAboutMessage(replyData: ReplyCreate, complaintDetails: Complaint): Promise<void> {
    try {
      if (!complaintDetails.employee_id) {
        console.error('No employee_id found in complaint details');
        return;
      }

      try {
        // Get the employee details
        const employeeResponse = await api.get(`/employees/${complaintDetails.employee_id}`);
        const employee = employeeResponse.data;
        
        if (!employee || !employee.email) {
          console.error('Invalid employee data', employee);
          return;
        }
        
        // Get the user associated with this employee
        try {
          const userResponse = await api.get(`/users/by-email/${employee.email}`);
          const userData = userResponse.data;
          
          if (userData && userData.id) {
            await this.createNotificationForUser(
              userData.id,
              `New message from ${replyData.from_user} on complaint "${complaintDetails.title}"`,
              replyData.complaint_id
            );
          } else {
            console.warn('Invalid user data returned:', userData);
          }
        } catch (userError) {
          console.error('Error with user endpoint:', userError);
          
          // Try a different approach - if the backend has a direct way to get a user ID from employee ID
          try {
            const directUserResponse = await api.get(`/employees/${complaintDetails.employee_id}/user`);
            if (directUserResponse.data && directUserResponse.data.id) {
              await this.createNotificationForUser(
                directUserResponse.data.id,
                `New message from ${replyData.from_user} on complaint "${complaintDetails.title}"`,
                replyData.complaint_id
              );
            }
          } catch (directError) {
            console.error('Error with direct user lookup:', directError);
          }
        }
      } catch (employeeError) {
        console.error('Error fetching employee:', employeeError);
      }
    } catch (error) {
      console.error('Error notifying employee:', error);
    }
  }

  /**
   * Create a notification for a specific user
   */
  private async createNotificationForUser(userId: string, message: string, relatedId: string): Promise<void> {
    try {
      const notificationData = {
        user_id: userId,
        message: message,
        type: "message",
        related_id: relatedId
      };
      
      // Create notification through server-side endpoint that doesn't require special auth
      const response = await api.post(`/notifications/create`, notificationData);
      console.log('Notification created successfully:', response.data);
    } catch (error) {
      // Try alternate endpoint directly
      try {
        const notificationData = {
          user_id: userId,
          message: message,
          type: "message",
          related_id: relatedId
        };
        
        // Use the API_BASE_URL constant
        const response = await axios.post(`${API_BASE_URL}/notifications`, notificationData, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem(STORAGE_KEYS.TOKEN)}`,
            'Content-Type': 'application/json'
          }
        });
        console.log('Notification created successfully (alternate method):', response.data);
      } catch (altError) {
        console.error('Error creating notification (both methods failed):', altError);
      }
    }
  }

  /**
   * Get all replies for a complaint - since there's no direct endpoint for replies in the backend,
   * we can't actually implement this properly
   */
  async getComplaintReplies(complaintId: string, isEmployee: boolean = false): Promise<Reply[]> {
    try {
      // Since replies aren't directly supported by the backend, we'll get the complaint
      // and check if there are any resolution_notes that we can parse as replies
      const complaint = await this.getComplaintById(complaintId);
      
      // If no resolution notes or we got a fallback response, return empty array
      if (!complaint.resolution_notes || complaint.status === "unknown") {
        return [];
      }
      
      // Parse the resolution notes into individual messages
      // Messages could be in various formats, so we'll split by newlines
      const notesText = complaint.resolution_notes;
      const lines = notesText.split('\n').filter(line => line.trim().length > 0);
      
      const replies: Reply[] = [];
      let index = 0;
      
      // Process each line that looks like a message
      for (const line of lines) {
        // Try to match message patterns like "Message from X: Y" or "Forwarded from X: Y"
        const messageMatch = line.match(/^(Message from|Forwarded from|Approved by|Rejected by) ([^:]+): (.+)$/);
        
        if (messageMatch) {
          const prefix = messageMatch[1];
          const fromUser = messageMatch[2].trim();
          const message = messageMatch[3].trim();
          
          // Skip forwarding messages if this is for an employee view
          if (isEmployee && prefix === 'Forwarded from') {
            continue;
          }
          
          if (message) {
            replies.push({
              id: `note-${complaintId}-${index++}`,
              complaint_id: complaintId,
              message: message,
              from_user: fromUser,
              timestamp: complaint.last_updated,
            });
          }
        } else {
          // If we have a resolution notes line but it doesn't match our expected pattern,
          // we'll try to extract any useful information from it
          const genericMatch = line.match(/^([^:]+): (.+)$/);
          if (genericMatch) {
            const source = genericMatch[1].trim();
            const content = genericMatch[2].trim();
            
            // Skip forwarding-related content for employee view
            if (isEmployee && (
              line.includes('forwarded to') || 
              line.includes('Forwarded to') || 
              line.includes('for review')
            )) {
              continue;
            }
            
            if (content) {
              replies.push({
                id: `note-${complaintId}-${index++}`,
                complaint_id: complaintId,
                message: content,
                from_user: source,
                timestamp: complaint.last_updated,
              });
            }
          } else if (line.trim()) {
            // Skip forwarding-related content for employee view
            if (isEmployee && (
              line.includes('forwarded to') || 
              line.includes('Forwarded to') || 
              line.includes('for review')
            )) {
              continue;
            }
            
            // If it doesn't match any pattern but has content, add it as a system message
            replies.push({
              id: `note-${complaintId}-system-${index++}`,
              complaint_id: complaintId,
              message: line.trim(),
              from_user: "System",
              timestamp: complaint.last_updated
            });
          }
        }
      }
      
      // If still no messages parsed, create a system message with the whole notes
      // Skip this for employee view if it contains forwarding messages
      if (replies.length === 0 && complaint.resolution_notes) {
        if (!isEmployee || (
          !complaint.resolution_notes.includes('forwarded to') &&
          !complaint.resolution_notes.includes('Forwarded to') &&
          !complaint.resolution_notes.includes('for review')
        )) {
          replies.push({
            id: `note-${complaintId}-system`,
            complaint_id: complaintId,
            message: complaint.resolution_notes,
            from_user: "System",
            timestamp: complaint.last_updated
          });
        }
      }
      
      return replies;
    } catch (error) {
      console.error(`Error fetching replies for complaint ${complaintId}:`, error);
      return []; // Return empty array on error instead of throwing
    }
  }

  /**
   * Forward complaint to Assistant Manager
   */
  async forwardToAssistantManager(complaintId: string, employeeId: string): Promise<boolean> {
    try {
      const response = await api.put(`/complaints/${complaintId}/forward`, {
        status: 'forwarded_to_am',
        forwarded_by: localStorage.getItem('userId'),
        forwarded_to: 'assistant_manager'
      });

      if (response.data.success) {
        // Send notification to employee
        const notificationSent = await notificationService.createComplaintForwardNotification(
          employeeId,
          complaintId,
          NotificationType.COMPLAINT_FORWARDED_TO_AM,
          localStorage.getItem('userId') || '',
          'assistant_manager',
          'forwarded_to_am'
        );

        if (!notificationSent) {
          // Retry notification if it failed
          await notificationService.retryFailedNotification({
            user_id: employeeId,
            type: NotificationType.COMPLAINT_FORWARDED_TO_AM,
            related_id: complaintId,
            message: 'Your complaint has been forwarded to the Assistant Manager for review.',
            metadata: {
              complaintId,
              forwardedBy: localStorage.getItem('userId'),
              forwardedTo: 'assistant_manager',
              status: 'forwarded_to_am'
            }
          });
        }
      }

      return response.data.success;
    } catch (error) {
      console.error('Error forwarding complaint to Assistant Manager:', error);
      return false;
    }
  }

  /**
   * Forward complaint to Manager
   */
  async forwardToManager(complaintId: string, employeeId: string): Promise<boolean> {
    try {
      const response = await api.put(`/complaints/${complaintId}/forward`, {
        status: 'forwarded_to_manager',
        forwarded_by: localStorage.getItem('userId'),
        forwarded_to: 'manager'
      });

      if (response.data.success) {
        // Send notification to employee
        const notificationSent = await notificationService.createComplaintForwardNotification(
          employeeId,
          complaintId,
          NotificationType.COMPLAINT_FORWARDED_TO_MANAGER,
          localStorage.getItem('userId') || '',
          'manager',
          'forwarded_to_manager'
        );

        if (!notificationSent) {
          // Retry notification if it failed
          await notificationService.retryFailedNotification({
            user_id: employeeId,
            type: NotificationType.COMPLAINT_FORWARDED_TO_MANAGER,
            related_id: complaintId,
            message: 'Your complaint has been escalated to the Manager for further review.',
            metadata: {
              complaintId,
              forwardedBy: localStorage.getItem('userId'),
              forwardedTo: 'manager',
              status: 'forwarded_to_manager'
            }
          });
        }
      }

      return response.data.success;
    } catch (error) {
      console.error('Error forwarding complaint to Manager:', error);
      return false;
    }
  }

  /**
   * Send complaint to Vendor
   */
  async sendToVendor(complaintId: string, employeeId: string, vendorId: string): Promise<boolean> {
    try {
      const response = await api.put(`/complaints/${complaintId}/vendor`, {
        status: 'sent_to_vendor',
        vendor_id: vendorId,
        sent_by: localStorage.getItem('userId')
      });

      if (response.data.success) {
        // Send notification to employee
        const notificationSent = await notificationService.createComplaintForwardNotification(
          employeeId,
          complaintId,
          NotificationType.COMPLAINT_SENT_TO_VENDOR,
          localStorage.getItem('userId') || '',
          vendorId,
          'sent_to_vendor'
        );

        if (!notificationSent) {
          // Retry notification if it failed
          await notificationService.retryFailedNotification({
            user_id: employeeId,
            type: NotificationType.COMPLAINT_SENT_TO_VENDOR,
            related_id: complaintId,
            message: 'Your complaint has been sent to the Vendor for repair assessment.',
            metadata: {
              complaintId,
              forwardedBy: localStorage.getItem('userId'),
              forwardedTo: vendorId,
              status: 'sent_to_vendor'
            }
          });
        }
      }

      return response.data.success;
    } catch (error) {
      console.error('Error sending complaint to Vendor:', error);
      return false;
    }
  }

  /**
   * Get all complaints for admin users
   */
  async getAllComplaintsAdmin(): Promise<Complaint[]> {
    try {
      const response = await api.get('/complaints/all');
      return response.data;
    } catch (error) {
      console.error('Error fetching all complaints for admin:', error);
      throw error;
    }
  }
}

// Create an instance of the service
const complaintServiceInstance = new ComplaintService();

// Export the instance and the types
export { complaintServiceInstance as complaintService };
export default complaintServiceInstance; 