import React, { useState, useEffect, useMemo } from 'react';
import {
  History,
  Search,
  RefreshCw,
  AlertCircle,
  ArrowDownToLine,
  ArrowUpFromLine,
  ShoppingCart,
  AlertTriangle,
  SlidersHorizontal,
  Package,
  Building,
  User,
  Shield,
  Clock,
  X,
  FileText,
  Boxes,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchHistoryTransactions } from '../lib/supabase';
import { HistoryTransactionItem } from '../types';

export const HistoryPage: React.FC = () => {
  const { profile } = useAuth();

  // Data States
  const [transactions, setTransactions] = useState<HistoryTransactionItem[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<{ id: string; name: string; sku: string }[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [productFilter, setProductFilter] = useState<string>('all');

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { transactions: fetchedTx, products: fetchedProds } =
        await fetchHistoryTransactions();
      setTransactions(fetchedTx);
      setCatalogProducts(fetchedProds);
      setLastRefreshed(new Date());
    } catch (err: any) {
      console.error('Failed loading history from Supabase:', err);
      setError(err?.message || 'Failed to fetch transaction history from Supabase.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Helper to normalize transaction type keys
  const normalizeType = (typeStr: string): 'stock_in' | 'sale' | 'damage' | 'adjustment' | string => {
    const lower = (typeStr || '').toLowerCase().trim();
    if (lower.includes('in') || lower.includes('receive') || lower.includes('add')) return 'stock_in';
    if (lower.includes('sale') || lower.includes('dispatch') || lower.includes('checkout')) return 'sale';
    if (lower.includes('damage') || lower.includes('waste') || lower.includes('expired')) return 'damage';
    if (lower.includes('adjust')) return 'adjustment';
    return lower;
  };

  // Requirement 7: Summary Cards calculated from real loaded transaction data
  const summaryMetrics = useMemo(() => {
    const total = transactions.length;
    let stockInCount = 0;
    let stockOutCount = 0;

    for (const tx of transactions) {
      const norm = normalizeType(tx.transaction_type);
      if (norm === 'stock_in') {
        stockInCount++;
      } else if (norm === 'sale' || norm === 'damage') {
        stockOutCount++;
      }
    }

    return {
      total,
      stockInCount,
      stockOutCount,
    };
  }, [transactions]);

  // Requirement 5 & 6: Search & Filtering
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // 1. Search by product name, SKU, or notes
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        tx.product_name.toLowerCase().includes(q) ||
        tx.sku.toLowerCase().includes(q) ||
        (tx.notes && tx.notes.toLowerCase().includes(q));

      // 2. Transaction Type Filter
      let matchesType = true;
      if (typeFilter !== 'all') {
        const norm = normalizeType(tx.transaction_type);
        matchesType = norm === typeFilter.toLowerCase();
      }

      // 3. Product Filter
      const matchesProduct =
        productFilter === 'all' ||
        tx.product_id === productFilter ||
        tx.product_name.toLowerCase() === productFilter.toLowerCase();

      return matchesSearch && matchesType && matchesProduct;
    });
  }, [transactions, searchQuery, typeFilter, productFilter]);

  const clearAllFilters = () => {
    setSearchQuery('');
    setTypeFilter('all');
    setProductFilter('all');
  };

  const hasActiveFilters = searchQuery !== '' || typeFilter !== 'all' || productFilter !== 'all';

  // Badge renderer per Requirement 4:
  // stock_in = Stock In, sale = Sale, damage = Damage, adjustment = Adjustment
  const renderBadge = (rawType: string) => {
    const norm = normalizeType(rawType);
    switch (norm) {
      case 'stock_in':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
            <ArrowDownToLine className="w-3 h-3" />
            <span>Stock In</span>
          </span>
        );
      case 'sale':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
            <ShoppingCart className="w-3 h-3" />
            <span>Sale</span>
          </span>
        );
      case 'damage':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
            <AlertTriangle className="w-3 h-3" />
            <span>Damage</span>
          </span>
        );
      case 'adjustment':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 whitespace-nowrap">
            <SlidersHorizontal className="w-3 h-3" />
            <span>Adjustment</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200 capitalize whitespace-nowrap">
            <span>{rawType.replace(/_/g, ' ')}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header with Operator Status and Refresh Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>Nowshera Shopping Mall</span>
            <span aria-hidden="true">·</span>
            <span>Audit Journal</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-slate-700">public.stock_transactions</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Stock Movement History
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable ledger of inventory transactions, warehouse receiving, and store dispatches.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Requirement 8: Refresh button re-fetching data from Supabase */}
          <button
            onClick={loadData}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-2xs transition-colors disabled:opacity-60"
            title="Re-fetch transaction history from Supabase"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-600' : 'text-slate-600'}`} />
            <span>{isLoading ? 'Syncing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Security Notice Banner */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-center gap-2.5">
          <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
          <div>
            <span className="font-semibold text-slate-800">Security & Immutability: </span>
            History is read-only. <code className="font-mono text-slate-700">cost_price</code> and profit metrics are strictly excluded.
          </div>
        </div>
        <div className="text-[11px] text-slate-400 font-mono tabular-nums shrink-0">
          Last Synced: {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      </div>

      {/* Requirement 10: Error State */}
      {error && (
        <div
          className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs text-xs"
          role="alert"
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-rose-900 block">Supabase Query Error</span>
              <span className="font-mono">{error}</span>
            </div>
          </div>
          <button
            onClick={loadData}
            className="px-3 py-1 font-semibold text-rose-700 bg-white border border-rose-300 rounded-md hover:bg-rose-50 shrink-0"
          >
            Retry Query
          </button>
        </div>
      )}

      {/* Requirement 7: Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Transactions */}
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Transactions</span>
            <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
              <History className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            {isLoading && transactions.length === 0 ? (
              <div className="h-8 w-20 bg-slate-100 rounded animate-pulse my-1" />
            ) : (
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
                {summaryMetrics.total.toLocaleString()}
              </div>
            )}
            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
              <span>Recorded in ledger</span>
              <span aria-hidden="true">·</span>
              <span>All movements</span>
            </div>
          </div>
        </div>

        {/* Stock In Transactions */}
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Stock In Transactions</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
              <ArrowDownToLine className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            {isLoading && transactions.length === 0 ? (
              <div className="h-8 w-20 bg-slate-100 rounded animate-pulse my-1" />
            ) : (
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-emerald-700 font-mono tabular-nums">
                {summaryMetrics.stockInCount.toLocaleString()}
              </div>
            )}
            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
              <span>Warehouse intake</span>
              <span aria-hidden="true">·</span>
              <span>Replenishment</span>
            </div>
          </div>
        </div>

        {/* Stock Out Transactions */}
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Stock Out Transactions</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-700">
              <ArrowUpFromLine className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            {isLoading && transactions.length === 0 ? (
              <div className="h-8 w-20 bg-slate-100 rounded animate-pulse my-1" />
            ) : (
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-blue-700 font-mono tabular-nums">
                {summaryMetrics.stockOutCount.toLocaleString()}
              </div>
            )}
            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
              <span>Sales & damage write-offs</span>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar: Search & Filters (Requirements 5 & 6) */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Requirement 6: Search by product name, SKU, or notes */}
          <div className="relative md:col-span-6">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by product name, SKU, or notes..."
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

          {/* Requirement 5: Product Filter (real products loaded from Supabase) */}
          <div className="md:col-span-3">
            <select
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              className="w-full py-2 pl-3 pr-8 text-xs sm:text-sm bg-slate-50/50 border border-slate-300 rounded-lg text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 transition-colors cursor-pointer"
            >
              <option value="all">All Products</option>
              {catalogProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
          </div>

          {/* Requirement 5: Transaction Type Dropdown Filter */}
          <div className="md:col-span-3">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full py-2 pl-3 pr-8 text-xs sm:text-sm bg-slate-50/50 border border-slate-300 rounded-lg text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 transition-colors cursor-pointer"
            >
              <option value="all">All Types</option>
              <option value="stock_in">Stock In</option>
              <option value="sale">Sale</option>
              <option value="damage">Damage</option>
              <option value="adjustment">Adjustment</option>
            </select>
          </div>
        </div>

        {/* Quick Filter Badges Row */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-500 font-medium mr-1">Type:</span>
            {[
              { id: 'all', label: 'All' },
              { id: 'stock_in', label: 'Stock In' },
              { id: 'sale', label: 'Sale' },
              { id: 'damage', label: 'Damage' },
              { id: 'adjustment', label: 'Adjustment' },
            ].map((t) => {
              const isActive = typeFilter.toLowerCase() === t.id.toLowerCase();
              return (
                <button
                  key={t.id}
                  onClick={() => setTypeFilter(t.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-2xs font-semibold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {t.label}
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

          <div className="text-slate-500 font-mono text-[11px] tabular-nums">
            Showing <strong className="text-slate-900">{filteredTransactions.length}</strong> of{' '}
            {transactions.length} records
          </div>
        </div>
      </div>

      {/* Requirement 10: Loading, Empty, and Responsive Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Loading State */}
        {isLoading && transactions.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-emerald-600 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-900">Loading Transaction Ledger...</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Connecting to Supabase <code className="font-mono">public.stock_transactions</code> and resolving profiles & products.
            </p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          /* Empty State */
          <div className="p-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
              <History className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">
              {hasActiveFilters ? 'No transactions match your filters' : 'No stock transactions recorded yet'}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {hasActiveFilters
                ? 'Try adjusting your search query, transaction type, or selected product.'
                : 'Stock movements logged via Stock In or Stock Out will appear here automatically.'}
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
                    <th className="py-3 px-4 font-semibold whitespace-nowrap">Date / Time</th>
                    <th className="py-3 px-4 font-semibold">Product</th>
                    <th className="py-3 px-4 font-semibold">SKU</th>
                    <th className="py-3 px-4 font-semibold">Transaction Type</th>
                    <th className="py-3 px-4 font-semibold text-right">Quantity</th>
                    <th className="py-3 px-4 font-semibold text-center whitespace-nowrap">Stock Change</th>
                    <th className="py-3 px-4 font-semibold">Supplier</th>
                    <th className="py-3 px-4 font-semibold">Performed By</th>
                    <th className="py-3 px-4 font-semibold">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredTransactions.map((tx) => {
                    const norm = normalizeType(tx.transaction_type);
                    const isPositive = norm === 'stock_in';

                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Date / Time */}
                        <td className="py-3 px-4 font-mono tabular-nums text-slate-500 whitespace-nowrap text-[11px]">
                          <div>
                            {new Date(tx.created_at).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(tx.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </td>

                        {/* Product (resolved from public.products) */}
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-900 block max-w-[160px] truncate" title={tx.product_name}>
                            {tx.product_name}
                          </span>
                        </td>

                        {/* SKU */}
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                          {tx.sku}
                        </td>

                        {/* Transaction Type Badge (Requirement 4) */}
                        <td className="py-3 px-4">
                          {renderBadge(tx.transaction_type)}
                        </td>

                        {/* Quantity */}
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-slate-900 whitespace-nowrap">
                          <span className={isPositive ? 'text-emerald-700' : 'text-rose-700'}>
                            {isPositive ? `+${tx.quantity}` : `-${tx.quantity}`}
                          </span>
                        </td>

                        {/* Stock Change (Requirement 4: 15 → 55 or 5 → 3) */}
                        <td className="py-3 px-4 text-center font-mono tabular-nums text-slate-700 whitespace-nowrap font-medium">
                          {tx.quantity_before !== null && tx.quantity_after !== null ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 text-[11px]">
                              <span>{tx.quantity_before}</span>
                              <span className="text-slate-400">&rarr;</span>
                              <span className="font-bold text-slate-900">{tx.quantity_after}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">—</span>
                          )}
                        </td>

                        {/* Supplier (resolved from public.suppliers) */}
                        <td className="py-3 px-4">
                          {tx.supplier_name ? (
                            <span className="inline-flex items-center gap-1 text-slate-700 max-w-[140px] truncate" title={tx.supplier_name}>
                              <Building className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{tx.supplier_name}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">N/A</span>
                          )}
                        </td>

                        {/* Performed By (Requirement 3: full_name and role from public.profiles) */}
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-800 truncate max-w-[130px]" title={tx.performer_name}>
                            {tx.performer_name}
                          </div>
                          <div className="text-[10px] text-slate-400 capitalize">
                            {tx.performer_role}
                          </div>
                        </td>

                        {/* Notes */}
                        <td className="py-3 px-4">
                          {tx.notes ? (
                            <span className="text-slate-600 text-[11px] italic max-w-[180px] block truncate" title={tx.notes}>
                              {tx.notes}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">—</span>
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
              {filteredTransactions.map((tx) => {
                const norm = normalizeType(tx.transaction_type);
                const isPositive = norm === 'stock_in';

                return (
                  <div key={tx.id} className="p-4 space-y-3 hover:bg-slate-50/50 transition-colors">
                    {/* Header: Product & Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-sm text-slate-900">{tx.product_name}</div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          SKU: {tx.sku}
                        </div>
                      </div>
                      <div className="shrink-0">{renderBadge(tx.transaction_type)}</div>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50/80 p-2.5 rounded-lg border border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-medium">Quantity</span>
                        <span className={`font-bold font-mono tabular-nums ${isPositive ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {isPositive ? `+${tx.quantity}` : `-${tx.quantity}`} units
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-medium">Stock Change</span>
                        {tx.quantity_before !== null && tx.quantity_after !== null ? (
                          <span className="font-mono tabular-nums text-slate-800 font-semibold">
                            {tx.quantity_before} &rarr; {tx.quantity_after}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-medium">Supplier</span>
                        <span className="text-slate-700 truncate block">
                          {tx.supplier_name || 'N/A'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-medium">Operator</span>
                        <span className="text-slate-700 truncate block">
                          {tx.performer_name} ({tx.performer_role})
                        </span>
                      </div>
                    </div>

                    {/* Footer: Date & Notes */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                      <div className="font-mono tabular-nums">
                        {new Date(tx.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} at{' '}
                        {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      {tx.notes && (
                        <div className="italic text-slate-600 truncate max-w-[160px]" title={tx.notes}>
                          "{tx.notes}"
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Table Footer */}
            <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500">
              <div className="flex items-center gap-2">
                <span>Nowshera Shopping Mall Audit Log</span>
                <span aria-hidden="true">·</span>
                <span>Source: public.stock_transactions</span>
              </div>
              <div>
                Displaying {filteredTransactions.length} of {transactions.length} records
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
