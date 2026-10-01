export interface UserProfile {
  id: string;
  full_name: string;
  role: string;
  email?: string;
  created_at?: string;
}

export interface CategoryItem {
  id: string;
  name: string;
}

export interface SupplierItem {
  id: string;
  name: string;
}

export interface StockInProductOption {
  id: string;
  name: string;
  sku: string;
  quantity: number;
}

export type StockOutType = 'sale' | 'damage';

export interface HistoryTransactionItem {
  id: string;
  product_id: string;
  product_name: string;
  sku: string;
  transaction_type: string;
  quantity: number;
  quantity_before: number | null;
  quantity_after: number | null;
  supplier_id?: string | null;
  supplier_name?: string;
  performed_by?: string | null;
  performer_name?: string;
  performer_role?: string;
  notes?: string;
  created_at: string;
}

export interface ManagerProductFinancialItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  selling_price: number | null;
  cost_price: number | null;
  profit_per_unit: number | null;
  stock_cost_value: number | null;
}

export type StockStatusType = 'In Stock' | 'Low Stock' | 'Out of Stock';

export interface InventoryProduct {
  id: string;
  name: string;
  sku: string;
  category_id?: string | null;
  category_name: string;
  supplier_id?: string | null;
  supplier_name: string;
  quantity: number;
  selling_price: number | null;
  low_stock_threshold: number;
  status: StockStatusType;
  created_at?: string;
  updated_at?: string;
}

export interface ProductItem {
  id: string;
  name: string;
  sku: string;
  category_id?: string | null;
  supplier_id?: string | null;
  quantity: number;
  selling_price: number | null;
  low_stock_threshold: number;
  created_at?: string;
  updated_at?: string;
}

export interface StockActivityItem {
  id: string;
  product_id?: string;
  product_name: string;
  sku?: string;
  transaction_type: string;
  quantity: number;
  quantity_before: number | null;
  quantity_after: number | null;
  created_at: string;
  notes?: string;
}

export interface DashboardMetrics {
  totalProducts: number;
  lowStockCount: number;
  totalStockUnits: number;
  recentActivities: StockActivityItem[];
}

export type ActiveNavTab =
  | 'dashboard'
  | 'inventory'
  | 'stock-in'
  | 'stock-out'
  | 'history'
  | 'financials'
  | 'ai-assistant';
