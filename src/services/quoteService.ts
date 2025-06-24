import axios from '../utils/axios';
import { Vendor } from './vendorService';

// Interfaces
export interface QuoteRequest {
  id: string;
  title: string;
  description: string;
  requirements?: string;
  budget?: number;
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
  status: 'draft' | 'open' | 'pending' | 'fulfilled' | 'cancelled';
  created_at: string;
  updated_at?: string;
  vendor_selections?: QuoteRequestVendor[];
  responses?: QuoteResponse[];
}

export interface QuoteRequestVendor {
  id: string;
  vendor_id: string;
  vendor: Vendor;
  sent_date: string;
  has_responded: boolean;
}

export interface QuoteRequestCreate {
  title: string;
  description: string;
  requirements?: string;
  budget?: number;
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
  status?: 'draft' | 'open' | 'pending' | 'fulfilled' | 'cancelled';
}

export interface QuoteResponse {
  id: string;
  quote_request_id: string;
  vendor_id: string;
  vendor: Vendor;
  quote_amount: number;
  description: string;
  delivery_timeline?: string;
  status: 'pending_review' | 'accepted' | 'rejected' | 'negotiating';
  submitted_at: string;
  reviewed_at?: string;
  notes?: string;
}

export interface QuoteResponseCreate {
  quote_request_id: string;
  vendor_id: string;
  quote_amount: number;
  description: string;
  delivery_timeline?: string;
}

export interface QuoteResponseReview {
  status: 'accepted' | 'rejected' | 'negotiating';
  notes?: string;
}

// Service class
class QuoteService {
  /**
   * Get all quote requests
   */
  async getQuoteRequests(): Promise<QuoteRequest[]> {
    const response = await axios.get('/quote-requests/');
    return response.data;
  }

  /**
   * Get a specific quote request by ID
   */
  async getQuoteRequestById(id: string): Promise<QuoteRequest> {
    const response = await axios.get(`/quote-requests/${id}`);
    return response.data;
  }

  /**
   * Create a new quote request
   */
  async createQuoteRequest(data: QuoteRequestCreate): Promise<QuoteRequest> {
    const response = await axios.post('/quote-requests/', data);
    return response.data;
  }

  /**
   * Update an existing quote request
   */
  async updateQuoteRequest(id: string, data: Partial<QuoteRequestCreate>): Promise<QuoteRequest> {
    const response = await axios.put(`/quote-requests/${id}`, data);
    return response.data;
  }

  /**
   * Delete a quote request
   */
  async deleteQuoteRequest(id: string): Promise<void> {
    await axios.delete(`/quote-requests/${id}`);
  }

  /**
   * Add a vendor to a quote request
   */
  async addVendorToQuoteRequest(requestId: string, vendorId: string): Promise<QuoteRequestVendor> {
    const response = await axios.post(`/quote-requests/${requestId}/vendors`, { vendor_id: vendorId });
    return response.data;
  }

  /**
   * Remove a vendor from a quote request
   */
  async removeVendorFromQuoteRequest(requestId: string, vendorSelectionId: string): Promise<void> {
    await axios.delete(`/quote-requests/vendors/${vendorSelectionId}`);
  }

  /**
   * Get all responses for a quote request
   */
  async getQuoteResponses(requestId: string): Promise<QuoteResponse[]> {
    const response = await axios.get(`/quote-requests/${requestId}/responses`);
    return response.data;
  }

  /**
   * Submit a quote response (as a vendor)
   */
  async submitQuoteResponse(requestId: string, data: QuoteResponseCreate): Promise<QuoteResponse> {
    const response = await axios.post(`/quotes/${requestId}/respond`, data);
    return response.data;
  }

  /**
   * Review a quote response (accept, reject, or negotiate)
   */
  async reviewQuoteResponse(responseId: string, review: QuoteResponseReview): Promise<QuoteResponse> {
    const response = await axios.put(`/quote-responses/${responseId}/review`, review);
    return response.data;
  }

  /**
   * Get vendor-specific quote requests
   */
  async getVendorQuoteRequests(vendorId: string): Promise<QuoteRequest[]> {
    const response = await axios.get(`/quotes/requests/vendor/${vendorId}`);
    return response.data;
  }
}

export default new QuoteService(); 