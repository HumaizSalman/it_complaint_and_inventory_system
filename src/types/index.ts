export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  min_quantity: number;
  location: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface Complaint {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'resolved';
  priority: 'low' | 'medium' | 'high';
  reported_by?: string;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceRequest {
  id: string;
  inventory_item_id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  requested_by: string;
  assigned_to?: string; 
  estimated_cost?: number;
  actual_cost?: number;
  start_date?: string;
  completed_date?: string;
  created_at: string;
  updated_at: string;
}