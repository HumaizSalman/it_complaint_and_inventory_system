import api from '../utils/axios';
import jwtDecode from 'jwt-decode';

interface DecodedToken {
  sub: string;
  role: string;
  exp: number;
  email: string;
  employee_id?: string;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
}

interface UserData {
  id: string;
  email: string;
  role: string;
  employeeId?: string;
}

const AUTH_TOKEN_KEY = 'token';
const USER_ID_KEY = 'userId';
const EMPLOYEE_ID_KEY = 'employeeId';
const USER_ROLE_KEY = 'userRole';
const USER_EMAIL_KEY = 'userEmail';

class AuthService {
  /**
   * Authenticate user and store tokens
   */
  async login(credentials: LoginCredentials): Promise<UserData> {
    try {
      const formData = new URLSearchParams();
      formData.append('username', credentials.email);
      formData.append('password', credentials.password);

      const response = await api.post<TokenResponse>('/token', formData.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const { access_token } = response.data;
      
      // Store the token
      localStorage.setItem(AUTH_TOKEN_KEY, access_token);
      
      // Decode token to get user info
      const decodedToken = this.decodeToken(access_token);
      
      if (!decodedToken) {
        throw new Error('Invalid token received');
      }
      
      // Store user info
      localStorage.setItem(USER_ID_KEY, decodedToken.sub);
      localStorage.setItem(USER_ROLE_KEY, decodedToken.role);
      localStorage.setItem(USER_EMAIL_KEY, decodedToken.email);
      
      if (decodedToken.employee_id) {
        localStorage.setItem(EMPLOYEE_ID_KEY, decodedToken.employee_id);
      }
      
      // Return user data
      return {
        id: decodedToken.sub,
        email: decodedToken.email,
        role: decodedToken.role,
        employeeId: decodedToken.employee_id
      };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Log out the user by clearing stored tokens
   */
  logout(): void {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_ID_KEY);
    localStorage.removeItem(EMPLOYEE_ID_KEY);
    localStorage.removeItem(USER_ROLE_KEY);
    localStorage.removeItem(USER_EMAIL_KEY);
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;

    try {
      const decodedToken = this.decodeToken(token);
      if (!decodedToken) return false;
      
      // Check if token is expired
      const currentTime = Date.now() / 1000;
      return decodedToken.exp > currentTime;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get current user data
   */
  getCurrentUser(): UserData | null {
    if (!this.isAuthenticated()) return null;

    return {
      id: localStorage.getItem(USER_ID_KEY) || '',
      email: localStorage.getItem(USER_EMAIL_KEY) || '',
      role: localStorage.getItem(USER_ROLE_KEY) || '',
      employeeId: localStorage.getItem(EMPLOYEE_ID_KEY) || undefined
    };
  }

  /**
   * Get current authentication token
   */
  getToken(): string | null {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  }

  /**
   * Check if token will expire soon (within 5 minutes)
   */
  willTokenExpireSoon(minutesThreshold: number = 5): boolean {
    const token = this.getToken();
    if (!token) return false;

    try {
      const decodedToken = this.decodeToken(token);
      if (!decodedToken) return false;
      
      const currentTime = Date.now() / 1000;
      const timeUntilExpiry = decodedToken.exp - currentTime;
      
      // Check if token will expire within the threshold (in seconds)
      return timeUntilExpiry < (minutesThreshold * 60);
    } catch (error) {
      return false;
    }
  }

  /**
   * Decode JWT token
   */
  private decodeToken(token: string): DecodedToken | null {
    try {
      return jwtDecode<DecodedToken>(token);
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }

  /**
   * Fetch the user profile data from the server
   */
  async fetchUserProfile(): Promise<any> {
    try {
      const response = await api.get('/users/me');
      return response.data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  }
}

export default new AuthService(); 