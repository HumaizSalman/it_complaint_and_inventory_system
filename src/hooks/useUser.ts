import { useAuth } from '../context/AuthContext';

interface UseUserReturn {
  user: {
    id: string;
    email: string;
    role: string;
    employeeId?: string;
  } | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  isEmployee: boolean;
  isManager: boolean;
  isATS: boolean;
  isAssistantManager: boolean;
  isVendor: boolean;
  hasRole: (role: string | string[]) => boolean;
  checkPermission: (permission: string) => boolean;
}

/**
 * Hook to access user information and check permissions
 */
export const useUser = (): UseUserReturn => {
  const { user, isAuthenticated, isLoading } = useAuth();

  // Check if user has a specific role
  const hasRole = (role: string | string[]): boolean => {
    if (!user) return false;
    
    if (Array.isArray(role)) {
      return role.includes(user.role);
    }
    
    return user.role === role;
  };

  // Role-based flags for easy access
  const isAdmin = hasRole('admin');
  const isEmployee = hasRole('employee');
  const isManager = hasRole('manager');
  const isATS = hasRole('ats');
  const isAssistantManager = hasRole('assistant_manager');
  const isVendor = hasRole('vendor');

  // Check if user has a specific permission
  // This can be expanded to include more complex permission checking
  const checkPermission = (permission: string): boolean => {
    if (!user) return false;

    // Map roles to permissions
    const rolePermissions: Record<string, string[]> = {
      admin: ['read', 'write', 'delete', 'manage_users', 'manage_assets', 'manage_complaints', 'approve_requests'],
      manager: ['read', 'write', 'manage_assets', 'manage_complaints', 'approve_requests'],
      assistant_manager: ['read', 'write', 'manage_assets', 'manage_complaints'],
      ats: ['read', 'manage_complaints', 'update_complaints'],
      employee: ['read', 'create_complaints', 'view_assets'],
      vendor: ['read', 'update_maintenance', 'view_assignments']
    };

    // Get permissions for the user's role
    const userPermissions = rolePermissions[user.role] || [];
    
    // Admin has all permissions
    if (user.role === 'admin') return true;
    
    // Check if the user's permissions include the required permission
    return userPermissions.includes(permission);
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    isAdmin,
    isEmployee,
    isManager,
    isATS,
    isAssistantManager,
    isVendor,
    hasRole,
    checkPermission
  };
};

export default useUser; 