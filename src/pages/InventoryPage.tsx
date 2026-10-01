import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Search,
  RefreshCw,
  AlertCircle,
  Filter,
  Layers,
  Building,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Tag,
  Shield,
  X,
} from 'lucide-react';
import { fetchInventoryWithRelations } from '../lib/supabase';
import { InventoryProduct, CategoryItem, StockStatusType } from '../types';

export const InventoryPage: React.FC = () => {
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { products: fetchedProducts, categories: fetchedCategories } =
        await fetchInventoryWithRelations();
      setProducts(fetchedProducts);
      setCategories(fetchedCategories);
    } catch (err: any) {
      console.error('Failed to load inventory from Supabase:', err);
      setError(err?.message || 'Failed to fetch inventory data from Supabase.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      // 1. Search by product name or SKU
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.sku.toLowerCase().includes(query);

      // 2. Category Filter (using real category_id)
      const matchesCategory =
        selectedCategoryId === 'all' ||
        item.category_id === selectedCategoryId ||
        item.category_name.toLowerCase() === selectedCategoryId.toLowerCase();

      // 3. Stock Status Filter
      const matchesStatus =
        selectedStatus === 'all' ||
        item.status.toLowerCase() === selectedStatus.toLowerCase();

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [products, searchQuery, selectedCategoryId, selectedStatus]);

  // Aggregate stats of filtered view
  const totalFilteredUnits = useMemo(() => {
    return filteredProducts.reduce((sum, p) => sum + (p.quantity || 0), 0);
  }, [filteredProducts]);

  const lowStockFilteredCount = useMemo(() => {
    return filteredProducts.filter((p) => p.status === 'Low Stock' || p.status === 'Out of Stock').length;
  }, [filteredProducts]);

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedCategoryId('all');
    setSelectedStatus('all');
  };

  const hasActiveFilters = searchQuery !== '' || selectedCategoryId !== 'all' || selectedStatus !== 'all';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>Nowshera Shopping Mall</span>
            <span aria-hidden="true">·</span>
            <span>Live Inventory Database</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-slate-700">public.products</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Inventory Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational product stock levels, categories, suppliers, and reorder alerts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-2xs transition-colors disabled:opacity-60"
            title="Refresh inventory from Supabase"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-600' : 'text-slate-600'}`} />
            <span>{isLoading ? 'Fetching...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Security & RLS Compliance Notice */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-start sm:items-center gap-2.5">
        <Shield className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 sm:mt-0" />
        <div className="text-xs text-slate-600">
          <span className="font-semibold text-slate-800">Security Policy: </span>
          Only permitted columns (<code className="font-mono text-slate-700">id, name, sku, category_id, supplier_id, quantity, selling_price, low_stock_threshold</code>) are queried. <code className="font-mono text-slate-700">cost_price</code> and profit calculations are strictly excluded.
        </div>
      </div>

      {/* Requirement 8: Error State */}
      {error && (
        <div
          className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs"
          role="alert"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-rose-900">Failed to Load Products</div>
              <p className="text-xs text-rose-700 mt-0.5 font-mono">{error}</p>
            </div>
          </div>
          <button
            onClick={loadData}
            className="px-3 py-1.5 text-xs font-semibold bg-white border border-rose-300 text-rose-700 hover:bg-rose-100/50 rounded-lg transition-colors shrink-0"
          >
            Retry Query
          </button>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Requirement 4: Search products by product name or SKU */}
          <div className="relative md:col-span-6">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by product name or SKU code..."
              className="w-full pl-10 pr-9 py-2 text-xs sm:text-sm bg-slate-50/50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label="Clear search query"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Requirement 5: Category Filter from real categories */}
          <div className="md:col-span-3">
            <div className="relative">
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="w-full py-2 pl-3 pr-8 text-xs sm:text-sm bg-slate-50/50 border border-slate-300 rounded-lg text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 transition-colors cursor-pointer"
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Requirement 6: Stock-status filter */}
          <div className="md:col-span-3">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full py-2 pl-3 pr-8 text-xs sm:text-sm bg-slate-50/50 border border-slate-300 rounded-lg text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 transition-colors cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="In Stock">In Stock</option>
              <option value="Low Stock">Low Stock</option>
              <option value="Out of Stock">Out of Stock</option>
            </select>
          </div>
        </div>

        {/* Quick Filter Badges & Summary Counts */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-500 font-medium mr-1">Status Filter:</span>
            {(['all', 'In Stock', 'Low Stock', 'Out of Stock'] as const).map((st) => {
              const isActive = selectedStatus.toLowerCase() === st.toLowerCase();
              return (
                <button
                  key={st}
                  onClick={() => setSelectedStatus(st)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-2xs font-semibold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st === 'all' ? 'All' : st}
                </button>
              );
            })}

            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="ml-2 text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1 text-xs font-medium"
              >
                <X className="w-3 h-3" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 text-slate-500 font-mono text-[11px] tabular-nums">
            <span>
              Products: <strong className="text-slate-900">{filteredProducts.length}</strong>
            </span>
            <span>·</span>
            <span>
              Units: <strong className="text-slate-900">{totalFilteredUnits.toLocaleString()}</strong>
            </span>
            {lowStockFilteredCount > 0 && (
              <>
                <span>·</span>
                <span className="text-amber-700 font-semibold">
                  Low/Out: {lowStockFilteredCount}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Requirement 8 & 9: Loading, Empty, and Responsive Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Loading State */}
        {isLoading && products.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-emerald-600 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-900">Loading Product Catalog...</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Connecting to Supabase <code className="font-mono">public.products</code>, resolving categories and suppliers.
            </p>
          </div>
        ) : filteredProducts.length === 0 ? (
          /* Empty State */
          <div className="p-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
              <Package className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">
              {hasActiveFilters ? 'No products match your filters' : 'No products found in database'}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {hasActiveFilters
                ? 'Try adjusting your search keywords, category selection, or stock status filter.'
                : 'Products added to the public.products table in Supabase will automatically display here.'}
            </p>
            {hasActiveFilters && (
              <div className="pt-2">
                <button
                  onClick={clearAllFilters}
                  className="px-3.5 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition-colors"
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View (>= lg) */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-medium select-none">
                    <th className="py-3 px-4 font-semibold">Product Name</th>
                    <th className="py-3 px-4 font-semibold">SKU</th>
                    <th className="py-3 px-4 font-semibold">Category</th>
                    <th className="py-3 px-4 font-semibold">Supplier</th>
                    <th className="py-3 px-4 font-semibold text-right">Current Stock</th>
                    <th className="py-3 px-4 font-semibold text-right">Selling Price</th>
                    <th className="py-3 px-4 font-semibold text-center">Stock Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredProducts.map((p) => {
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Product Name */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{p.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            Threshold: {p.low_stock_threshold} units
                          </div>
                        </td>

                        {/* SKU */}
                        <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">
                          {p.sku}
                        </td>

                        {/* Category (resolved from public.categories) */}
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 text-slate-700">
                            <Tag className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{p.category_name}</span>
                          </span>
                        </td>

                        {/* Supplier (resolved from public.suppliers) */}
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 text-slate-600">
                            <Building className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[140px]">{p.supplier_name}</span>
                          </span>
                        </td>

                        {/* Current Stock */}
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-slate-900">
                          {p.quantity.toLocaleString()}
                        </td>

                        {/* Selling Price */}
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                          {p.selling_price !== null && p.selling_price !== undefined
                            ? `PKR ${Number(p.selling_price).toLocaleString()}`
                            : '—'}
                        </td>

                        {/* Stock Status (Requirement 3) */}
                        <td className="py-3 px-4 text-center">
                          {p.status === 'Out of Stock' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              <XCircle className="w-3 h-3 shrink-0" />
                              <span>Out of Stock</span>
                            </span>
                          ) : p.status === 'Low Stock' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              <span>Low Stock</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 shrink-0" />
                              <span>In Stock</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile / Tablet Responsive Cards (< lg) */}
            <div className="lg:hidden divide-y divide-slate-100">
              {filteredProducts.map((p) => (
                <div key={p.id} className="p-4 space-y-3 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-sm text-slate-900">{p.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        SKU: {p.sku}
                      </div>
                    </div>
                    {/* Status Badge */}
                    <div className="shrink-0">
                      {p.status === 'Out of Stock' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <XCircle className="w-3 h-3" />
                          <span>Out of Stock</span>
                        </span>
                      ) : p.status === 'Low Stock' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Low Stock</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>In Stock</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50/80 p-2.5 rounded-lg border border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-medium">Category</span>
                      <span className="font-medium text-slate-700 truncate block">{p.category_name}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-medium">Supplier</span>
                      <span className="font-medium text-slate-700 truncate block">{p.supplier_name}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-medium">Current Stock</span>
                      <span className="font-bold text-slate-900 font-mono tabular-nums">
                        {p.quantity.toLocaleString()} units
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-medium">Selling Price</span>
                      <span className="font-semibold text-slate-900 font-mono tabular-nums">
                        {p.selling_price !== null && p.selling_price !== undefined
                          ? `PKR ${Number(p.selling_price).toLocaleString()}`
                          : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Table Footer */}
            <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500">
              <div className="flex items-center gap-2">
                <span>Nowshera Shopping Mall Catalog</span>
                <span aria-hidden="true">·</span>
                <span>Source: public.products</span>
              </div>
              <div>
                Displaying {filteredProducts.length} of {products.length} products
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
