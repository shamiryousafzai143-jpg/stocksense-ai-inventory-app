import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  UserProfile,
  DashboardMetrics,
  ProductItem,
  StockActivityItem,
  InventoryProduct,
  CategoryItem,
  SupplierItem,
  StockStatusType,
  StockInProductOption,
  StockOutType,
  HistoryTransactionItem,
  ManagerProductFinancialItem,
} from '../types';

// Retrieve Supabase URL and Anon Key from environment variables with fallback to storage
const getEnvConfig = () => {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const localUrl = typeof window !== 'undefined' ? localStorage.getItem('stocksense_supabase_url') : null;
  const localKey = typeof window !== 'undefined' ? localStorage.getItem('stocksense_supabase_anon_key') : null;

  const url = (envUrl && envUrl.startsWith('http') ? envUrl : localUrl) || '';
  const anonKey = (envKey && envKey.length > 10 ? envKey : localKey) || '';

  return { url, anonKey };
};

let activeConfig = getEnvConfig();

// Create default singleton client
const createConfiguredClient = (url: string, key: string): SupabaseClient => {
  const validUrl = url && url.startsWith('http') ? url : 'https://placeholder.supabase.co';
  const validKey = key && key.length > 10 ? key : 'placeholder-anon-key';

  return createClient(validUrl, validKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
};

// Reusable Supabase client instance
export let supabase: SupabaseClient = createConfiguredClient(activeConfig.url, activeConfig.anonKey);

export const isSupabaseConfigured = (): boolean => {
  const { url, anonKey } = activeConfig;
  return Boolean(url && url.startsWith('http') && anonKey && anonKey.length > 10);
};

export const getSupabaseClient = (): SupabaseClient => {
  return supabase;
};

// Update credentials dynamically if needed (e.g. via UI when env vars are not set)
export const updateSupabaseCredentials = (url: string, anonKey: string): boolean => {
  try {
    const cleanUrl = url.trim();
    const cleanKey = anonKey.trim();
    if (!cleanUrl.startsWith('http') || cleanKey.length < 10) {
      return false;
    }
    localStorage.setItem('stocksense_supabase_url', cleanUrl);
    localStorage.setItem('stocksense_supabase_anon_key', cleanKey);
    activeConfig = { url: cleanUrl, anonKey: cleanKey };
    supabase = createConfiguredClient(cleanUrl, cleanKey);
    return true;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return false;
  }
};

export const clearStoredSupabaseCredentials = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('stocksense_supabase_url');
    localStorage.removeItem('stocksense_supabase_anon_key');
  }
  activeConfig = getEnvConfig();
  supabase = createConfiguredClient(activeConfig.url, activeConfig.anonKey);
};

export const getActiveSupabaseConfig = () => ({
  url: activeConfig.url,
  hasAnonKey: Boolean(activeConfig.anonKey),
  isFromEnv: Boolean(import.meta.env.VITE_SUPABASE_URL),
});

/**
 * Fetch authenticated user's profile from public.profiles using the authenticated user's id.
 * The profile contains:
 * - id
 * - full_name
 * - role
 * Role is strictly derived from public.profiles and never hardcoded.
 */
export const fetchUserProfile = async (userId: string, authEmail?: string): Promise<UserProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn('Error reading from public.profiles:', error.message);
      // If table row doesn't exist yet, return minimal profile without hardcoded role
      return {
        id: userId,
        full_name: authEmail ? authEmail.split('@')[0] : 'User',
        role: 'Unknown',
        email: authEmail,
      };
    }

    if (data) {
      return {
        id: data.id,
        full_name: data.full_name || (authEmail ? authEmail.split('@')[0] : 'User'),
        role: data.role || 'Member',
        email: authEmail,
      };
    }
  } catch (err) {
    console.error('Exception fetching profile:', err);
  }

  return {
    id: userId,
    full_name: authEmail ? authEmail.split('@')[0] : 'User',
    role: 'User',
    email: authEmail,
  };
};

/**
 * Fetch Dashboard Metrics from existing Supabase tables:
 * - Source of truth: public.products and public.stock_transactions
 *
 * STRICT SECURITY REQUIREMENTS:
 * For normal dashboard product queries, explicitly select only:
 * id, name, sku, category_id, supplier_id, quantity, selling_price, low_stock_threshold, created_at, updated_at
 * NEVER use select('*') on products.
 * Do NOT query cost_price.
 * Do NOT calculate or expose profit.
 */
export const fetchDashboardMetrics = async (): Promise<DashboardMetrics> => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase client is not configured. Please check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  // 1. Query products table explicitly selecting only permitted columns
  const { data: productsData, error: productsError } = await supabase
    .from('products')
    .select('id, name, sku, category_id, supplier_id, quantity, selling_price, low_stock_threshold, created_at, updated_at');

  if (productsError) {
    console.error('Error querying public.products from Supabase:', productsError);
    throw new Error(`Supabase products query failed: ${productsError.message}`);
  }

  const products = (productsData || []) as ProductItem[];

  // 1. Total Products: real count of records
  const totalProducts = products.length;

  // 2. Total Stock Units: sum of quantity across all products
  const totalStockUnits = products.reduce((acc, p) => acc + (Number(p.quantity) || 0), 0);

  // 3. Low Stock Items: quantity <= low_stock_threshold
  const lowStockCount = products.filter(
    (p) => Number(p.quantity ?? 0) <= Number(p.low_stock_threshold ?? 0)
  ).length;

  // Build product lookup map (id -> { name, sku }) to resolve product names for transactions
  const productMap = new Map<string, { name: string; sku: string }>();
  for (const p of products) {
    productMap.set(String(p.id), { name: p.name, sku: p.sku });
  }

  // 4. Recent Stock Activity: read latest 10 records from public.stock_transactions
  const { data: txData, error: txError } = await supabase
    .from('stock_transactions')
    .select('id, product_id, transaction_type, quantity, quantity_before, quantity_after, created_at, notes')
    .order('created_at', { ascending: false })
    .limit(10);

  if (txError) {
    console.error('Error querying public.stock_transactions from Supabase:', txError);
    throw new Error(`Supabase stock_transactions query failed: ${txError.message}`);
  }

  const transactions = txData || [];

  // Check if any product_id in transactions was not in products table query (e.g. if archived)
  const missingProductIds = transactions
    .map((tx: any) => String(tx.product_id))
    .filter((id: string) => id && !productMap.has(id));

  if (missingProductIds.length > 0) {
    const { data: missingProducts } = await supabase
      .from('products')
      .select('id, name, sku')
      .in('id', Array.from(new Set(missingProductIds)));

    if (Array.isArray(missingProducts)) {
      for (const mp of missingProducts) {
        productMap.set(String(mp.id), { name: mp.name, sku: mp.sku });
      }
    }
  }

  const recentActivities: StockActivityItem[] = transactions.map((tx: any) => {
    const pInfo = tx.product_id ? productMap.get(String(tx.product_id)) : null;
    return {
      id: String(tx.id),
      product_id: tx.product_id ? String(tx.product_id) : undefined,
      product_name: pInfo?.name || (tx.product_id ? `Product #${String(tx.product_id).slice(0, 8)}` : 'Unknown Product'),
      sku: pInfo?.sku,
      transaction_type: tx.transaction_type || 'TRANSACTION',
      quantity: Number(tx.quantity ?? 0),
      quantity_before: tx.quantity_before !== null && tx.quantity_before !== undefined ? Number(tx.quantity_before) : null,
      quantity_after: tx.quantity_after !== null && tx.quantity_after !== undefined ? Number(tx.quantity_after) : null,
      created_at: tx.created_at || new Date().toISOString(),
      notes: tx.notes || undefined,
    };
  });

  return {
    totalProducts,
    lowStockCount,
    totalStockUnits,
    recentActivities,
  };
};

/**
 * Fetch Product Catalog for Read-Only Inventory View with resolved Category and Supplier names
 * STRICT SECURITY:
 * Explicitly select ONLY:
 * id, name, sku, category_id, supplier_id, quantity, selling_price, low_stock_threshold, created_at, updated_at
 * Never use select('*').
 * Never request cost_price or calculate profit.
 */
export const fetchInventoryWithRelations = async (): Promise<{
  products: InventoryProduct[];
  categories: CategoryItem[];
}> => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase client is not configured.');
  }

  // 1. Fetch real products from public.products selecting ONLY permitted columns
  const { data: productsData, error: productsError } = await supabase
    .from('products')
    .select('id, name, sku, category_id, supplier_id, quantity, selling_price, low_stock_threshold, created_at, updated_at')
    .order('name', { ascending: true });

  if (productsError) {
    console.error('Error fetching products from public.products:', productsError);
    throw new Error(`Failed to load products from public.products: ${productsError.message}`);
  }

  // 2. Resolve category_id using public.categories
  const categoryMap = new Map<string, string>();
  let categoriesList: CategoryItem[] = [];
  try {
    const { data: catData, error: catError } = await supabase
      .from('categories')
      .select('id, name')
      .order('name', { ascending: true });

    if (!catError && Array.isArray(catData)) {
      categoriesList = catData.map((c: any) => ({
        id: String(c.id),
        name: c.name || 'Unnamed Category',
      }));
      for (const cat of categoriesList) {
        categoryMap.set(String(cat.id), cat.name);
      }
    } else if (catError) {
      console.warn('Note on public.categories query:', catError.message);
    }
  } catch (err) {
    console.warn('Exception querying public.categories:', err);
  }

  // 3. Resolve supplier_id using public.suppliers
  const supplierMap = new Map<string, string>();
  try {
    const { data: supData, error: supError } = await supabase
      .from('suppliers')
      .select('id, name')
      .order('name', { ascending: true });

    if (!supError && Array.isArray(supData)) {
      for (const sup of supData) {
        supplierMap.set(String(sup.id), sup.name || 'Unnamed Supplier');
      }
    } else if (supError) {
      console.warn('Note on public.suppliers query:', supError.message);
    }
  } catch (err) {
    console.warn('Exception querying public.suppliers:', err);
  }

  // 4. Transform and determine stock status:
  // - If quantity = 0 → "Out of Stock"
  // - If quantity <= low_stock_threshold → "Low Stock"
  // - Otherwise → "In Stock"
  const products: InventoryProduct[] = (productsData || []).map((p: any) => {
    const qty = Number(p.quantity ?? 0);
    const threshold = Number(p.low_stock_threshold ?? 0);

    let status: StockStatusType = 'In Stock';
    if (qty === 0) {
      status = 'Out of Stock';
    } else if (qty <= threshold) {
      status = 'Low Stock';
    } else {
      status = 'In Stock';
    }

    const catName = p.category_id ? (categoryMap.get(String(p.category_id)) || 'Uncategorized') : 'Uncategorized';
    const supName = p.supplier_id ? (supplierMap.get(String(p.supplier_id)) || 'Unassigned') : 'Unassigned';

    return {
      id: String(p.id),
      name: p.name || 'Unnamed Product',
      sku: p.sku || `SKU-${String(p.id).slice(0, 6)}`,
      category_id: p.category_id ? String(p.category_id) : null,
      category_name: catName,
      supplier_id: p.supplier_id ? String(p.supplier_id) : null,
      supplier_name: supName,
      quantity: qty,
      selling_price: p.selling_price !== null && p.selling_price !== undefined ? Number(p.selling_price) : null,
      low_stock_threshold: threshold,
      status,
      created_at: p.created_at,
      updated_at: p.updated_at,
    };
  });

  return {
    products,
    categories: categoriesList,
  };
};

/**
 * Fetch Product Catalog for Read-Only Inventory View
 * STRICT SECURITY: explicitly select only non-cost columns
 */
export const fetchInventoryList = async (): Promise<ProductItem[]> => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase client is not configured.');
  }

  const { data, error } = await supabase
    .from('products')
    .select('id, name, sku, category_id, supplier_id, quantity, selling_price, low_stock_threshold, created_at, updated_at')
    .order('name', { ascending: true })
    .limit(200);

  if (error) {
    throw new Error(`Failed to load inventory: ${error.message}`);
  }

  return (data || []) as ProductItem[];
};

/**
 * STOCK IN OPERATIONS:
 * 1. Load real products from public.products:
 *    For the product selector query ONLY: id, name, sku, quantity
 * 2. Load real suppliers from public.suppliers: id, name
 * 3. Call public.stock_in RPC function:
 *    public.stock_in(p_product_id BIGINT, p_quantity INTEGER, p_supplier_id BIGINT, p_notes TEXT)
 *
 * STRICT SECURITY:
 * Never query cost_price.
 * Never expose profit.
 * Never directly update public.products or insert into public.stock_transactions.
 * The stock_in RPC is the ONLY method allowed to perform the stock change.
 */

export const fetchProductsForStockIn = async (): Promise<StockInProductOption[]> => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase client is not configured.');
  }

  const { data, error } = await supabase
    .from('products')
    .select('id, name, sku, quantity')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching products for stock-in:', error);
    throw new Error(`Failed to load products: ${error.message}`);
  }

  return (data || []).map((item: any) => ({
    id: String(item.id),
    name: item.name || 'Unnamed Product',
    sku: item.sku || `SKU-${String(item.id).slice(0, 6)}`,
    quantity: Number(item.quantity ?? 0),
  }));
};

export const fetchSuppliersForStockIn = async (): Promise<SupplierItem[]> => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase client is not configured.');
  }

  const { data, error } = await supabase
    .from('suppliers')
    .select('id, name')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching suppliers for stock-in:', error);
    throw new Error(`Failed to load suppliers: ${error.message}`);
  }

  return (data || []).map((s: any) => ({
    id: String(s.id),
    name: s.name || 'Unnamed Supplier',
  }));
};

export const fetchSingleProductForStockIn = async (
  productId: string
): Promise<StockInProductOption | null> => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase client is not configured.');
  }

  const { data, error } = await supabase
    .from('products')
    .select('id, name, sku, quantity')
    .eq('id', productId)
    .maybeSingle();

  if (error) {
    console.error('Error re-fetching product for stock-in:', error);
    throw new Error(`Failed to refresh product data: ${error.message}`);
  }

  if (!data) return null;

  return {
    id: String(data.id),
    name: data.name || 'Unnamed Product',
    sku: data.sku || `SKU-${String(data.id).slice(0, 6)}`,
    quantity: Number(data.quantity ?? 0),
  };
};

export interface StockInRpcParams {
  productId: string;
  quantity: number;
  supplierId: string;
  notes?: string;
}

export const executeStockInRpc = async ({
  productId,
  quantity,
  supplierId,
  notes,
}: StockInRpcParams): Promise<any> => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase client is not configured.');
  }

  // Parse numeric IDs for BIGINT parameters
  const numericProductId = !isNaN(Number(productId)) ? Number(productId) : productId;
  const numericSupplierId = !isNaN(Number(supplierId)) ? Number(supplierId) : supplierId;
  const integerQty = Math.floor(Number(quantity));

  if (integerQty <= 0) {
    throw new Error('Quantity must be a positive integer greater than 0.');
  }

  // Call the official existing public.stock_in RPC function
  const { data, error } = await supabase.rpc('stock_in', {
    p_product_id: numericProductId,
    p_quantity: integerQty,
    p_supplier_id: numericSupplierId,
    p_notes: notes && notes.trim().length > 0 ? notes.trim() : null,
  });

  if (error) {
    console.error('Supabase stock_in RPC error:', error);
    throw new Error(`Stock In transaction failed: ${error.message}`);
  }

  return data;
};

/**
 * STOCK OUT OPERATIONS:
 * 1. Load products from public.products:
 *    Selecting ONLY: id, name, sku, quantity
 * 2. Call public.stock_out RPC:
 *    public.stock_out(p_product_id BIGINT, p_quantity INTEGER, p_type TEXT, p_notes TEXT)
 *
 * STRICT SECURITY:
 * Never query cost_price.
 * Never expose profit.
 * Never directly update public.products.
 * Never directly insert into public.stock_transactions.
 * The stock_out RPC is the only method allowed to perform the stock change.
 */

export const fetchProductsForStockOut = async (): Promise<StockInProductOption[]> => {
  return fetchProductsForStockIn();
};

export const fetchSingleProductForStockOut = async (
  productId: string
): Promise<StockInProductOption | null> => {
  return fetchSingleProductForStockIn(productId);
};

export interface StockOutRpcParams {
  productId: string;
  quantity: number;
  type: StockOutType;
  notes?: string;
}

export const executeStockOutRpc = async ({
  productId,
  quantity,
  type,
  notes,
}: StockOutRpcParams): Promise<any> => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase client is not configured.');
  }

  const numericProductId = !isNaN(Number(productId)) ? Number(productId) : productId;
  const integerQty = Math.floor(Number(quantity));

  if (integerQty <= 0) {
    throw new Error('Quantity must be a positive integer greater than 0.');
  }

  // Call the official existing public.stock_out RPC function
  const { data, error } = await supabase.rpc('stock_out', {
    p_product_id: numericProductId,
    p_quantity: integerQty,
    p_type: type,
    p_notes: notes && notes.trim().length > 0 ? notes.trim() : null,
  });

  if (error) {
    console.error('Supabase stock_out RPC error:', error);
    throw new Error(`Stock Out transaction failed: ${error.message}`);
  }

  return data;
};

/**
 * HISTORY & AUDIT TRAIL:
 * 1. Fetch real transaction records from public.stock_transactions:
 *    id, product_id, transaction_type, quantity, quantity_before, quantity_after, supplier_id, performed_by, notes, created_at
 * 2. Resolve product_id using public.products (ONLY: id, name, sku)
 * 3. Resolve performed_by using public.profiles (full_name, role)
 * 4. Resolve supplier_id using public.suppliers (id, name)
 *
 * STRICT SECURITY:
 * Never query cost_price.
 * Never calculate or expose profit.
 * Never use service_role.
 * Read-only: does not modify records.
 */
export const fetchHistoryTransactions = async (): Promise<{
  transactions: HistoryTransactionItem[];
  products: { id: string; name: string; sku: string }[];
}> => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase client is not configured.');
  }

  // 1. Fetch real transaction records from public.stock_transactions
  const { data: rawTx, error: txError } = await supabase
    .from('stock_transactions')
    .select('id, product_id, transaction_type, quantity, quantity_before, quantity_after, supplier_id, performed_by, notes, created_at')
    .order('created_at', { ascending: false });

  if (txError) {
    console.error('Error fetching stock_transactions from Supabase:', txError);
    throw new Error(`Failed to load transaction history: ${txError.message}`);
  }

  const transactionsData = rawTx || [];

  // 2. Resolve product_id to product information (ONLY: id, name, sku)
  const productMap = new Map<string, { id: string; name: string; sku: string }>();
  let productList: { id: string; name: string; sku: string }[] = [];
  try {
    const { data: prodData, error: prodError } = await supabase
      .from('products')
      .select('id, name, sku')
      .order('name', { ascending: true });

    if (!prodError && Array.isArray(prodData)) {
      productList = prodData.map((p: any) => ({
        id: String(p.id),
        name: p.name || 'Unnamed Product',
        sku: p.sku || `SKU-${String(p.id).slice(0, 6)}`,
      }));
      for (const p of productList) {
        productMap.set(String(p.id), p);
      }
    }
  } catch (err) {
    console.warn('Note on resolving products for history:', err);
  }

  // 3. Resolve performed_by using public.profiles (Display: full_name, role)
  const profileMap = new Map<string, { full_name: string; role: string }>();
  const performerIds = Array.from(
    new Set(transactionsData.map((t: any) => t.performed_by).filter(Boolean))
  );

  if (performerIds.length > 0) {
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .in('id', performerIds);

      if (!profilesError && Array.isArray(profilesData)) {
        for (const pr of profilesData) {
          profileMap.set(String(pr.id), {
            full_name: pr.full_name || 'Staff User',
            role: pr.role || 'Staff',
          });
        }
      }
    } catch (err) {
      console.warn('Note on resolving profiles for history:', err);
    }
  }

  // 4. Resolve supplier_id using public.suppliers when it exists
  const supplierMap = new Map<string, string>();
  const supplierIds = Array.from(
    new Set(transactionsData.map((t: any) => t.supplier_id).filter(Boolean))
  );

  if (supplierIds.length > 0) {
    try {
      const { data: supData, error: supError } = await supabase
        .from('suppliers')
        .select('id, name')
        .in('id', supplierIds);

      if (!supError && Array.isArray(supData)) {
        for (const s of supData) {
          supplierMap.set(String(s.id), s.name || 'Unnamed Supplier');
        }
      }
    } catch (err) {
      console.warn('Note on resolving suppliers for history:', err);
    }
  }

  // 5. Combine and normalize records
  const transactions: HistoryTransactionItem[] = transactionsData.map((tx: any) => {
    const prod = tx.product_id ? productMap.get(String(tx.product_id)) : null;
    const performer = tx.performed_by ? profileMap.get(String(tx.performed_by)) : null;
    const supplierName = tx.supplier_id ? supplierMap.get(String(tx.supplier_id)) : undefined;

    return {
      id: String(tx.id),
      product_id: String(tx.product_id || ''),
      product_name: prod?.name || (tx.product_id ? `Product #${String(tx.product_id).slice(0, 8)}` : 'Unknown Product'),
      sku: prod?.sku || 'N/A',
      transaction_type: tx.transaction_type || 'transaction',
      quantity: Number(tx.quantity ?? 0),
      quantity_before: tx.quantity_before !== null && tx.quantity_before !== undefined ? Number(tx.quantity_before) : null,
      quantity_after: tx.quantity_after !== null && tx.quantity_after !== undefined ? Number(tx.quantity_after) : null,
      supplier_id: tx.supplier_id ? String(tx.supplier_id) : null,
      supplier_name: supplierName,
      performed_by: tx.performed_by ? String(tx.performed_by) : null,
      performer_name: performer?.full_name || (tx.performed_by ? 'Mall Staff' : 'System'),
      performer_role: performer?.role || 'Staff',
      notes: tx.notes || undefined,
      created_at: tx.created_at || new Date().toISOString(),
    };
  });

  return {
    transactions,
    products: productList,
  };
};

/**
 * MANAGER-ONLY FINANCIAL OVERVIEW:
 * Call official secure RPC: supabase.rpc('get_manager_products')
 *
 * STRICT SECURITY:
 * Never query cost_price directly from public.products.
 * Never use service_role.
 * Never bypass RLS/security.
 * Never put manager financial data in local mock data.
 * Only get financial product data through get_manager_products().
 */
export const fetchManagerProductsFinancials = async (): Promise<ManagerProductFinancialItem[]> => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase client is not configured.');
  }

  // Call the official existing secure RPC function
  const { data, error } = await supabase.rpc('get_manager_products');

  if (error) {
    console.error('Supabase get_manager_products RPC error:', error);
    throw new Error(error.message);
  }

  const rawList = (data || []) as any[];

  return rawList.map((item: any) => {
    const qty = Number(item.quantity ?? 0);
    const sellingPrice =
      item.selling_price !== null && item.selling_price !== undefined
        ? Number(item.selling_price)
        : null;
    const costPrice =
      item.cost_price !== null && item.cost_price !== undefined
        ? Number(item.cost_price)
        : null;

    const profitPerUnit =
      sellingPrice !== null && costPrice !== null
        ? sellingPrice - costPrice
        : item.profit_per_unit !== null && item.profit_per_unit !== undefined
        ? Number(item.profit_per_unit)
        : null;

    const stockCostValue =
      costPrice !== null
        ? qty * costPrice
        : item.stock_cost_value !== null && item.stock_cost_value !== undefined
        ? Number(item.stock_cost_value)
        : null;

    return {
      id: String(item.id),
      name: item.name || 'Unnamed Product',
      sku: item.sku || `SKU-${String(item.id).slice(0, 6)}`,
      quantity: qty,
      selling_price: sellingPrice,
      cost_price: costPrice,
      profit_per_unit: profitPerUnit,
      stock_cost_value: stockCostValue,
    };
  });
};




