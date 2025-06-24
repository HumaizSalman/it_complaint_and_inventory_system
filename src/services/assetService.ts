import api from '../utils/axios';

export interface Asset {
  id: string;
  name: string;
  type: string;
  status: string;
  serial_number: string;
  condition: string;
  specifications: string;
  purchase_cost: number;
  purchase_date: string;
  expected_lifespan: number;
  total_repair_cost: number;
  next_maintenance_due?: string;
  assigned_to_id?: string;
  assigned_date?: string;
  vendor_id?: string;
  warranty_expiry?: string;
}

export interface AssetCreate {
  name: string;
  type: string;
  status: string;
  serial_number: string;
  condition: string;
  specifications: string;
  purchase_cost: number;
  purchase_date: string;
  expected_lifespan: number;
  vendor_id?: string;
  warranty_expiry?: string;
}

export interface AssetFilterOptions {
  status?: string;
  type?: string;
  condition?: string;
  assigned?: boolean;
  vendor_id?: string;
}

export interface Complaint {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  date_submitted: string;
  resolution_notes?: string;
  employee?: {
    name: string;
    email: string;
  };
}

export interface AIPrediction {
  asset_id: string;
  asset_name: string;
  prediction: string;
  complaint_count: number;
  generated_at: string;
  confidence: 'low' | 'medium' | 'high';
  note?: string;
}

class AssetService {
  /**
   * Get all assets with optional filters
   */
  async getAssets(filters: AssetFilterOptions = {}): Promise<Asset[]> {
    try {
      // Build query params
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, String(value));
      });
      
      const query = params.toString() ? `?${params.toString()}` : '';
      const response = await api.get(`/assets${query}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching assets:', error);
      throw error;
    }
  }

  /**
   * Get a specific asset by ID
   */
  async getAssetById(id: string): Promise<Asset> {
    try {
      const response = await api.get(`/assets/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching asset with ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get assets assigned to a specific employee
   */
  async getEmployeeAssets(employeeId: string): Promise<Asset[]> {
    try {
      // First try the direct endpoint to get employee assets
      const response = await api.get(`/employees/${employeeId}/assets`);
      
      // Check if the response is valid
      if (response.data && Array.isArray(response.data)) {
        console.log('Employee assets fetched successfully:', response.data);
        return response.data;
      } else {
        console.warn('Invalid response format from employee assets endpoint:', response.data);
        
        // Fallback approach: get all assets and filter by assigned_to_id
        const allAssetsResponse = await api.get('/assets');
        if (allAssetsResponse.data && Array.isArray(allAssetsResponse.data)) {
          const employeeAssets = allAssetsResponse.data.filter(
            (asset: Asset) => asset.assigned_to_id === employeeId
          );
          console.log('Employee assets fetched through fallback method:', employeeAssets);
          return employeeAssets;
        }
        
        // If everything fails, return empty array
        return [];
      }
    } catch (error) {
      console.error(`Error fetching assets for employee ${employeeId}:`, error);
      
      // Try the fallback approach if the primary endpoint fails
      try {
        const allAssetsResponse = await api.get('/assets');
        if (allAssetsResponse.data && Array.isArray(allAssetsResponse.data)) {
          const employeeAssets = allAssetsResponse.data.filter(
            (asset: Asset) => asset.assigned_to_id === employeeId
          );
          console.log('Employee assets fetched through fallback method after error:', employeeAssets);
          return employeeAssets;
        }
      } catch (fallbackError) {
        console.error('Fallback method also failed:', fallbackError);
      }
      
      throw error;
    }
  }

  /**
   * Create a new asset
   */
  async createAsset(assetData: AssetCreate): Promise<Asset> {
    try {
      const response = await api.post('/assets/', assetData);
      return response.data;
    } catch (error) {
      console.error('Error creating asset:', error);
      throw error;
    }
  }

  /**
   * Update an existing asset
   */
  async updateAsset(id: string, updateData: Partial<Asset>): Promise<Asset> {
    try {
      const response = await api.put(`/assets/${id}`, updateData);
      return response.data;
    } catch (error) {
      console.error(`Error updating asset ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete an asset
   */
  async deleteAsset(id: string): Promise<void> {
    try {
      await api.delete(`/assets/${id}`);
    } catch (error) {
      console.error(`Error deleting asset ${id}:`, error);
      throw error;
    }
  }

  /**
   * Assign an asset to an employee
   */
  async assignAssetToEmployee(assetId: string, employeeId: string): Promise<Asset> {
    try {
      const response = await api.post(`/assets/${assetId}/assign`, { employee_id: employeeId });
      return response.data;
    } catch (error) {
      console.error(`Error assigning asset ${assetId} to employee ${employeeId}:`, error);
      throw error;
    }
  }

  /**
   * Unassign an asset from an employee
   */
  async unassignAsset(assetId: string): Promise<Asset> {
    try {
      const response = await api.put(`/assets/${assetId}/unassign`);
      return response.data;
    } catch (error) {
      console.error(`Error unassigning asset ${assetId}:`, error);
      throw error;
    }
  }

  /**
   * Schedule maintenance for an asset
   */
  async scheduleMaintenance(
    assetId: string, 
    scheduledDate: string, 
    vendorId: string, 
    description: string
  ): Promise<any> {
    try {
      const requestData = {
        asset_id: assetId,
        scheduled_date: scheduledDate,
        vendor_id: vendorId,
        description
      };
      
      const response = await api.post('/maintenance-requests/', requestData);
      return response.data;
    } catch (error) {
      console.error(`Error scheduling maintenance for asset ${assetId}:`, error);
      throw error;
    }
  }

  /**
   * Get maintenance history for an asset
   */
  async getAssetMaintenanceHistory(assetId: string): Promise<any[]> {
    try {
      const response = await api.get(`/assets/${assetId}/maintenance-history`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching maintenance history for asset ${assetId}:`, error);
      throw error;
    }
  }

  /**
   * Get asset statistics
   */
  async getAssetStatistics(): Promise<{
    total: number;
    by_status: Record<string, number>;
    by_type: Record<string, number>;
    by_condition: Record<string, number>;
  }> {
    try {
      const response = await api.get('/assets/statistics');
      return response.data;
    } catch (error) {
      console.error('Error fetching asset statistics:', error);
      throw error;
    }
  }

  /**
   * Get all complaints related to a specific asset
   */
  async getAssetComplaints(assetId: string): Promise<Complaint[]> {
    try {
      const response = await api.get(`/assets/${assetId}/complaints`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching complaints for asset ${assetId}:`, error);
      throw error;
    }
  }

  /**
   * Get AI-powered prediction for asset lifespan based on complaint history
   */
  async getAssetAIPrediction(assetId: string): Promise<AIPrediction> {
    try {
      const response = await api.post(`/assets/${assetId}/ai-prediction`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching AI prediction for asset ${assetId}:`, error);
      throw error;
    }
  }
}

export default new AssetService(); 