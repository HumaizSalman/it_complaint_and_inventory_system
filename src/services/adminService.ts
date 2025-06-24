import api from '../utils/axios';

export interface AdminStatistics {
  counts: {
    employees: number;
    assets: number;
    complaints: number;
    vendors: number;
  };
  asset_status: Record<string, number>;
  complaint_status: Record<string, number>;
  user_roles: Record<string, number>;
  recent_complaints: {
    id: string;
    title: string;
    status: string;
    date_submitted: string;
    employee_name: string;
  }[];
  ats_complaints: number;
  assistant_manager_complaints: number;
  manager_complaints: number;
  active_complaints: number;
}

export interface UserCreate {
  email: string;
  password: string;
  role: 'employee' | 'ats' | 'assistant_manager' | 'manager' | 'vendor' | 'admin';
}

export interface User {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

class AdminService {
  /**
   * Get admin dashboard statistics
   */
  async getAdminStatistics(): Promise<AdminStatistics> {
    try {
      const response = await api.get('/admin/statistics');
      return response.data;
    } catch (error) {
      console.error('Error fetching admin statistics:', error);
      throw error;
    }
  }

  /**
   * Create a new user (admin only)
   */
  async createUser(userData: UserCreate): Promise<User> {
    try {
      const response = await api.post('/admin/create-user', userData);
      return response.data;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }
}

export default new AdminService(); 