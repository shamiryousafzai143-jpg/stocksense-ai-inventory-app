import React, { useState, useEffect } from 'react';
import {
  Package,
  AlertTriangle,
  Boxes,
  ArrowDownToLine,
  ArrowUpFromLine,
  RefreshCw,
  Clock,
  ArrowRight,
  Shield,
  ChevronRight,
  AlertCircle,
  Activity,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchDashboardMetrics } from '../lib/supabase';
import { DashboardMetrics, ActiveNavTab } from '../types';

interface DashboardPageProps {
  onNavigate: (tab: ActiveNavTab) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { profile, user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const displayName = profile?.full_name || (user?.email ? user.email.split('@')[0] : 'User');
  const role = profile?.role || 'User';

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchDashboardMetrics();
      setMetrics(data);
      setLastRefreshed(new Date());
    } catch (err: any) {
      console.error('Failed loading dashboard metrics from Supabase:', err);
      setError(err?.message || 'Failed to fetch inventory data from Supabase.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const activities = metrics?.recentActivities || [];

  // Collect distinct transaction types for filter buttons
  const distinctTypes = Array.from(new Set(activities.map((a) => a.transaction_type))).filter(Boolean);

  const filteredActivities = activities.filter((act) => {
    if (filterType === 'all') return true;
    return act.transaction_type.toLowerCase() === filterType.toLowerCase();
  });

  return (
    <div className="space-y-6">
      {/* Header with Greeting & Role Status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>Nowshera Shopping Mall</span>
            <span aria-hidden="true">·</span>
            <span>Real-time Inventory Data</span>
            <span aria-hidden="true">·</span>
            <span className="font-medium text-slate-700">Role: {role}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Welcome back, {displayName}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real inventory metrics queried directly from Supabase tables: <code className="text-slate-700 font-mono">public.products</code> and <code className="text-slate-700 font-mono">public.stock_transactions</code>.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Requirement 5: Refresh button re-fetches all dashboard data from Supabase */}
          <button
            onClick={loadData}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-2xs transition-colors disabled:opacity-60"
            title="Re-fetch all dashboard data from Supabase"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-600' : 'text-slate-600'}`} />
            <span>{isLoading ? 'Fetching...' : 'Refresh'}</span>
          </button>

          <button
            onClick={() => onNavigate('inventory')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 shadow-2xs transition-colors"
          >
            <span>View Catalog</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Requirement 6: Useful error state if Supabase returns an error */}
      {error && (
        <div
          className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs"
          role="alert"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-rose-900">Supabase Query Error</div>
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

      {/* Security & RLS Compliance Notice */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
          <div className="text-xs text-slate-600">
            <span className="font-semibold text-slate-800">Operational Access: </span>
            Authenticated as <strong className="text-slate-900">{role}</strong>. Secure column filtering enforced (<code className="text-slate-700 font-mono">cost_price</code> and profit margins are never queried).
          </div>
        </div>
        <div className="text-[11px] text-slate-400 font-mono tabular-nums shrink-0">
          Last Synced: {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      </div>

      {/* Requirement 1, 2, 3: Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Total Products */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">1. Total Products</span>
            <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            {isLoading && !metrics ? (
              <div className="h-8 w-24 bg-slate-100 rounded-md animate-pulse my-1" />
            ) : (
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
                {metrics ? metrics.totalProducts.toLocaleString() : '—'}
              </div>
            )}
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
              <span>Queried from public.products</span>
              <span aria-hidden="true">·</span>
              <span>Live count</span>
            </div>
          </div>
        </div>

        {/* Card 2: Low Stock Items (quantity <= low_stock_threshold) */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">3. Low Stock Items</span>
            <div
              className={`p-2 rounded-lg ${
                metrics && metrics.lowStockCount > 0
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-emerald-50 text-emerald-700'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            {isLoading && !metrics ? (
              <div className="h-8 w-24 bg-slate-100 rounded-md animate-pulse my-1" />
            ) : (
              <div
                className={`text-2xl sm:text-3xl font-bold tracking-tight font-mono tabular-nums ${
                  metrics && metrics.lowStockCount > 0 ? 'text-amber-600' : 'text-slate-900'
                }`}
              >
                {metrics ? metrics.lowStockCount.toLocaleString() : '—'}
              </div>
            )}
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
              <span className="font-mono text-[11px]">quantity &le; low_stock_threshold</span>
              <span aria-hidden="true">·</span>
              <span>{metrics && metrics.lowStockCount > 0 ? 'Needs reorder' : 'Healthy inventory'}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Total Stock Units (Sum of quantity across all products) */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">2. Total Stock Units</span>
            <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            {isLoading && !metrics ? (
              <div className="h-8 w-24 bg-slate-100 rounded-md animate-pulse my-1" />
            ) : (
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
                {metrics ? metrics.totalStockUnits.toLocaleString() : '—'}
              </div>
            )}
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
              <span>Sum across all products</span>
              <span aria-hidden="true">·</span>
              <span>On-hand inventory</span>
            </div>
          </div>
        </div>
      </div>

      {/* Operational Module Shortcuts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <button
          onClick={() => onNavigate('inventory')}
          className="text-left p-4 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-2xs transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 group-hover:bg-slate-900 group-hover:text-white transition-colors">
              <Package className="w-4 h-4" />
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
          </div>
          <div className="text-sm font-semibold text-slate-900">Inventory Catalog</div>
          <p className="text-xs text-slate-500 mt-0.5">Browse live product list with SKU and stock levels</p>
        </button>

        <button
          onClick={() => onNavigate('stock-in')}
          className="text-left p-4 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-2xs transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <ArrowDownToLine className="w-4 h-4" />
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
          </div>
          <div className="text-sm font-semibold text-slate-900">Stock In Operations</div>
          <p className="text-xs text-slate-500 mt-0.5">Warehouse receiving dock & replenishment intake</p>
        </button>

        <button
          onClick={() => onNavigate('stock-out')}
          className="text-left p-4 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-2xs transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-700 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <ArrowUpFromLine className="w-4 h-4" />
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
          </div>
          <div className="text-sm font-semibold text-slate-900">Stock Out Operations</div>
          <p className="text-xs text-slate-500 mt-0.5">Store checkout dispatch & aisle allocations</p>
        </button>
      </div>

      {/* Requirement 4: Recent Stock Activity */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Section Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600" />
              <h2 className="text-base font-semibold text-slate-900">Recent Stock Activity</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Read from <code className="text-slate-700 font-mono">public.stock_transactions</code> ordered by created_at descending (latest 10).
            </p>
          </div>

          {/* Interactive filter tabs */}
          {distinctTypes.length > 0 && (
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start sm:self-auto overflow-x-auto max-w-full">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  filterType === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({activities.length})
              </button>
              {distinctTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap capitalize ${
                    filterType.toLowerCase() === type.toLowerCase()
                      ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {type.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Loading Indicator */}
        {isLoading && !metrics ? (
          <div className="p-12 text-center space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-600 mx-auto" />
            <p className="text-xs text-slate-500 font-medium">Fetching transactions from Supabase...</p>
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="p-10 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">
              {error ? 'Could not load transactions' : 'No recent stock transactions found'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {error
                ? 'Check database connection and table permissions in Supabase.'
                : 'Transactions recorded in public.stock_transactions will automatically appear here with product details.'}
            </p>
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
              <span>Table: public.stock_transactions</span>
              <span aria-hidden="true">·</span>
              <span>0 records matching view</span>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-medium">
                  <th className="py-3 px-4 font-semibold">Product Name</th>
                  <th className="py-3 px-4 font-semibold">Transaction Type</th>
                  <th className="py-3 px-4 font-semibold text-right">Quantity</th>
                  <th className="py-3 px-4 font-semibold text-right">Qty Before</th>
                  <th className="py-3 px-4 font-semibold text-right">Qty After</th>
                  <th className="py-3 px-4 font-semibold text-right">Date / Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredActivities.map((act) => {
                  const typeUpper = act.transaction_type.toUpperCase();
                  const isStockIn = typeUpper.includes('IN') || typeUpper.includes('ADD') || typeUpper.includes('RECEIVE');
                  const isStockOut = typeUpper.includes('OUT') || typeUpper.includes('SALE') || typeUpper.includes('DISPATCH') || typeUpper.includes('REDUCE');

                  return (
                    <tr key={act.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Product Name (resolved from product_id) */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{act.product_name}</div>
                        {act.sku && <div className="text-[11px] text-slate-400 font-mono">{act.sku}</div>}
                        {act.notes && <div className="text-[11px] text-slate-500 italic mt-0.5">{act.notes}</div>}
                      </td>

                      {/* Transaction Type */}
                      <td className="py-3 px-4">
                        <span
                          className={`font-semibold uppercase tracking-wider text-[10px] ${
                            isStockIn
                              ? 'text-emerald-700'
                              : isStockOut
                              ? 'text-rose-700'
                              : 'text-slate-700'
                          }`}
                        >
                          {act.transaction_type.replace(/_/g, ' ')}
                        </span>
                      </td>

                      {/* Quantity */}
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-slate-900">
                        {act.quantity > 0 && isStockIn ? `+${act.quantity}` : act.quantity}
                      </td>

                      {/* Quantity Before */}
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                        {act.quantity_before !== null ? act.quantity_before.toLocaleString() : '—'}
                      </td>

                      {/* Quantity After */}
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                        {act.quantity_after !== null ? act.quantity_after.toLocaleString() : '—'}
                      </td>

                      {/* Date / Time */}
                      <td className="py-3 px-4 text-right text-slate-500 font-mono tabular-nums whitespace-nowrap">
                        {new Date(act.created_at).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Footer */}
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <span>Nowshera Shopping Mall Inventory Ledger</span>
            <span aria-hidden="true">·</span>
            <span>Real Supabase Data</span>
          </div>
          <div>
            Showing {filteredActivities.length} of {activities.length} transactions
          </div>
        </div>
      </div>
    </div>
  );
};
