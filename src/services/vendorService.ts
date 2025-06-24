import api from '../utils/axios';

export interface Vendor {
  id: string;
  name: string;
  email: string;
  phone: string;
  service_type: string;
  address?: string;
  contact_person?: string;
  contract_start?: string;
  contract_end?: string;
}

export interface VendorCreate {
  name: string;
  email: string;
  phone: string;
  service_type: string;
  address?: string;
  contact_person?: string;
  contract_start?: string;
  contract_end?: string;
}

export interface VendorFilterOptions {
  service_type?: string;
}

export interface VendorPerformance {
  onTimeDelivery: number;
  qualityRating: number;
  responseTime: string;
  completedOrders: number;
}

export interface PurchaseRequest {
  id: string;
  title: string;
  description: string;
  budget: number;
  priority: string;
  status: string;
  dateCreated: string;
  quantity?: number;
  sentTo: string[];
  responses: VendorResponse[];
}

export interface VendorResponse {
  vendorId: string;
  quote: number;
  response: string;
  status: string;
}

export interface QuoteSubmission {
  vendorId: string;
  quote: number;
  response: string;
  status: string;
}

class VendorService {
  /**
   * Get all vendors with optional filters
   */
  async getVendors(filters: VendorFilterOptions = {}): Promise<Vendor[]> {
    try {
      // Build query params
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, String(value));
      });
      
      const query = params.toString() ? `?${params.toString()}` : '';
      const response = await api.get(`/vendor/${query}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching vendors:', error);
      throw error;
    }
  }

  /**
   * Get a specific vendor by ID
   */
  async getVendorById(id: string): Promise<Vendor> {
    try {
      const response = await api.get(`/vendor/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching vendor with ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get purchase requests for a vendor
   */
  async getVendorRequests(vendorId: string): Promise<PurchaseRequest[]> {
    try {
      const response = await api.get(`/vendor/${vendorId}/requests`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching requests for vendor ${vendorId}:`, error);
      throw error;
    }
  }

  /**
   * Create a new vendor
   */
  async createVendor(vendorData: VendorCreate): Promise<Vendor> {
    try {
      const response = await api.post('/vendor/', vendorData);
      return response.data;
    } catch (error) {
      console.error('Error creating vendor:', error);
      throw error;
    }
  }

  /**
   * Update an existing vendor
   */
  async updateVendor(id: string, updateData: Partial<VendorCreate>): Promise<Vendor> {
    try {
      const response = await api.put(`/vendor/${id}`, updateData);
      return response.data;
    } catch (error) {
      console.error(`Error updating vendor ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a vendor
   */
  async deleteVendor(id: string): Promise<void> {
    try {
      await api.delete(`/vendor/${id}`);
    } catch (error) {
      console.error(`Error deleting vendor ${id}:`, error);
      throw error;
    }
  }

  /**
   * Submit a quote for a purchase request
   */
  async submitQuote(requestId: string, quoteData: QuoteSubmission): Promise<any> {
    try {
      const response = await api.post(`/purchase-requests/${requestId}/quotes`, quoteData);
      return response.data;
    } catch (error) {
      console.error(`Error submitting quote for request ${requestId}:`, error);
      throw error;
    }
  }

  /**
   * Get all purchase requests (for admin)
   */
  async getAllPurchaseRequests(): Promise<PurchaseRequest[]> {
    try {
      const response = await api.get('/purchase-requests/');
      return response.data;
    } catch (error) {
      console.error('Error fetching purchase requests:', error);
      throw error;
    }
  }

  /**
   * Create a new purchase request
   */
  async createPurchaseRequest(requestData: any): Promise<PurchaseRequest> {
    try {
      const response = await api.post('/purchase-requests/', requestData);
      return response.data;
    } catch (error) {
      console.error('Error creating purchase request:', error);
      throw error;
    }
  }

  /**
   * Get quotes for a purchase request
   */
  async getRequestQuotes(requestId: string): Promise<VendorResponse[]> {
    try {
      const response = await api.get(`/purchase-requests/${requestId}/quotes`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching quotes for request ${requestId}:`, error);
      throw error;
    }
  }

  /**
   * Accept a vendor's quote
   */
  async acceptQuote(requestId: string, vendorId: string): Promise<any> {
    try {
      const response = await api.post(`/purchase-requests/${requestId}/quotes/${vendorId}/accept`);
      return response.data;
    } catch (error) {
      console.error(`Error accepting quote from vendor ${vendorId} for request ${requestId}:`, error);
      throw error;
    }
  }

  /**
   * Reject a vendor's quote
   */
  async rejectQuote(requestId: string, vendorId: string, reason: string): Promise<any> {
    try {
      const response = await api.post(`/purchase-requests/${requestId}/quotes/${vendorId}/reject`, { reason });
      return response.data;
    } catch (error) {
      console.error(`Error rejecting quote from vendor ${vendorId} for request ${requestId}:`, error);
      throw error;
    }
  }
}

export default new VendorService(); 