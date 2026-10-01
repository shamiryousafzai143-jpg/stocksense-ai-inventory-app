import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  BarChart3,
  Search,
  RefreshCw,
  AlertCircle,
  ShieldAlert,
  ShieldCheck,
  Package,
  Layers,
  X,
  Lock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchManagerProductsFinancials } from '../lib/supabase';
import { ManagerProductFinancialItem } from '../types';

export const FinancialOverviewPage: React.FC = () => {
  const { profile } = useAuth();
  const isManager = profile?.role?.toLowerCase() === 'manager';

  // State
  const [products, setProducts] = useState<ManagerProductFinancialItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const loadFinancialData = async () => {
    // SECURITY: Do not call get_manager_products for staff from normal UI flow
    if (!isManager) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchManagerProductsFinancials();
      setProducts(data);
      setLastRefreshed(new Date());
    } catch (err: any) {
      console.error('Failed to load manager financial products:', err);
      setError(err?.message || 'Failed to retrieve manager financial data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFinancialData();
  }, [isManager]);

  // Search filter by product name or SKU
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
    );
  }, [products, searchQuery]);

  // Summary card calculations derived strictly from the manager-authorized RPC result
  const financialSummaries = useMemo(() => {
    let totalCostValue = 0;
    let totalRetailValue = 0;
    let totalMarginValue = 0;

    for (const p of products) {
      const qty = Number(p.quantity ?? 0);
      const cost = p.cost_price !== null && p.cost_price !== undefined ? Number(p.cost_price) : 0;
      const selling = p.selling_price !== null && p.selling_price !== undefined ? Number(p.selling_price) : 0;

      const itemCostVal = p.stock_cost_value !== null && p.stock_cost_value !== undefined
        ? Number(p.stock_cost_value)
        : qty * cost;

      const itemRetailVal = qty * selling;
      const itemMarginVal = itemRetailVal - itemCostVal;

      totalCostValue += itemCostVal;
      totalRetailValue += itemRetailVal;
      totalMarginValue += itemMarginVal;
    }

    const marginPercentage =
      totalRetailValue > 0 ? (totalMarginValue / totalRetailValue) * 100 : 0;

    return {
      totalCostValue,
      totalRetailValue,
      totalMarginValue,
      marginPercentage,
    };
  }, [products]);

  // ROLE ACCESS RESTRICTION:
  // If role !== 'manager', display "Access denied. Manager access required."
  if (!isManager) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto py-8">
        <div className="bg-white rounded-2xl border border-rose-200 p-8 sm:p-12 text-center shadow-xs space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-2xs">
            <ShieldAlert className="w-7 h-7" />
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600">Restricted Route</span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mt-1">
              Access denied. Manager access required.
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-md mx-auto">
              Inventory valuation, cost prices, and gross profit metrics are confidential and accessible only by authorized Manager profiles.
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 max-w-sm mx-auto flex items-center justify-between">
            <span>Your Profile: <strong className="text-slate-800">{profile?.full_name}</strong></span>
            <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold text-[11px]">
              Role: {profile?.role || 'Staff'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>Nowshera Shopping Mall</span>
            <span aria-hidden="true">·</span>
            <span>Executive Suite</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-emerald-700 font-semibold">RPC: public.get_manager_products()</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Financial & Valuation Overview
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Confidential manager-only inventory valuation, cost prices, unit margins, and total retail potential.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadFinancialData}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-2xs transition-colors disabled:opacity-60"
            title="Re-query financial products from Supabase RPC"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-600' : 'text-slate-600'}`} />
            <span>{isLoading ? 'Fetching...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Security & Role Verification Banner */}
      <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-900">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <div>
            <span className="font-bold">Manager Authorized Session: </span>
            Authenticated as <strong className="font-semibold">{profile?.full_name}</strong> (<code className="font-mono">Manager</code>). Financial metrics unlocked strictly via RPC authority.
          </div>
        </div>
        <div className="text-[11px] text-emerald-700 font-mono tabular-nums shrink-0">
          Last Synced: {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div
          className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs text-xs"
          role="alert"
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-rose-900 block">Manager RPC Error</span>
              <span className="font-mono">{error}</span>
            </div>
          </div>
          <button
            onClick={loadFinancialData}
            className="px-3 py-1 font-semibold text-rose-700 bg-white border border-rose-300 rounded-md hover:bg-rose-50 shrink-0"
          >
            Retry Query
          </button>
        </div>
      )}

      {/* Summary Cards:
          - Total Inventory Cost Value
          - Estimated Inventory Retail Value
          - Estimated Gross Margin Value
      */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Total Inventory Cost Value */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Inventory Cost Value
            </span>
            <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
              <Lock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            {isLoading && products.length === 0 ? (
              <div className="h-8 w-28 bg-slate-100 rounded animate-pulse my-1" />
            ) : (
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-mono tabular-nums">
                PKR {Math.round(financialSummaries.totalCostValue).toLocaleString()}
              </div>
            )}
            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
              <span>Capital tied in stock</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-[11px]">&sum;(qty &times; cost)</span>
            </div>
          </div>
        </div>

        {/* Card 2: Estimated Inventory Retail Value */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Estimated Inventory Retail Value
            </span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-700">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            {isLoading && products.length === 0 ? (
              <div className="h-8 w-28 bg-slate-100 rounded animate-pulse my-1" />
            ) : (
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-blue-700 font-mono tabular-nums">
                PKR {Math.round(financialSummaries.totalRetailValue).toLocaleString()}
              </div>
            )}
            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
              <span>Projected gross sales</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-[11px]">&sum;(qty &times; price)</span>
            </div>
          </div>
        </div>

        {/* Card 3: Estimated Gross Margin Value */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Estimated Gross Margin Value
            </span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            {isLoading && products.length === 0 ? (
              <div className="h-8 w-28 bg-slate-100 rounded animate-pulse my-1" />
            ) : (
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-emerald-700 font-mono tabular-nums">
                PKR {Math.round(financialSummaries.totalMarginValue).toLocaleString()}
              </div>
            )}
            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
              <span className="font-bold text-emerald-800 font-mono">
                {financialSummaries.marginPercentage.toFixed(1)}% margin
              </span>
              <span aria-hidden="true">·</span>
              <span>Potential gross profit</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by product name or SKU..."
            className="w-full pl-10 pr-9 py-2 text-xs sm:text-sm bg-slate-50/50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="text-slate-500 font-mono text-[11px] tabular-nums self-end sm:self-auto">
          Showing <strong className="text-slate-900">{filteredProducts.length}</strong> of{' '}
          {products.length} products
        </div>
      </div>

      {/* Financial Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {isLoading && products.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-emerald-600 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-900">Querying Manager Financials...</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Executing <code className="font-mono">get_manager_products()</code> under authenticated manager credentials.
            </p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
              <Package className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">
              {searchQuery ? 'No products match your search' : 'No financial records available'}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {searchQuery
                ? 'Try adjusting your search query.'
                : 'Products returned from get_manager_products() will appear in this ledger.'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-medium select-none">
                    <th className="py-3 px-4 font-semibold">Product Name</th>
                    <th className="py-3 px-4 font-semibold">SKU</th>
                    <th className="py-3 px-4 font-semibold text-right">Quantity</th>
                    <th className="py-3 px-4 font-semibold text-right">Selling Price</th>
                    <th className="py-3 px-4 font-semibold text-right">Cost Price</th>
                    <th className="py-3 px-4 font-semibold text-right">Profit / Unit</th>
                    <th className="py-3 px-4 font-semibold text-right">Stock Cost Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredProducts.map((p) => {
                    const profit = p.profit_per_unit;
                    const isProfitable = profit !== null && profit > 0;
                    const isLoss = profit !== null && profit < 0;

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Product Name */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{p.name}</div>
                        </td>

                        {/* SKU */}
                        <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">
                          {p.sku}
                        </td>

                        {/* Quantity */}
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-slate-900">
                          {p.quantity.toLocaleString()}
                        </td>

                        {/* Selling Price */}
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800">
                          {p.selling_price !== null
                            ? `PKR ${Number(p.selling_price).toLocaleString()}`
                            : '—'}
                        </td>

                        {/* Cost Price */}
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-600 bg-slate-50/50">
                          {p.cost_price !== null
                            ? `PKR ${Number(p.cost_price).toLocaleString()}`
                            : '—'}
                        </td>

                        {/* Profit Per Unit */}
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-bold">
                          {profit !== null ? (
                            <span
                              className={
                                isProfitable
                                  ? 'text-emerald-700'
                                  : isLoss
                                  ? 'text-rose-700'
                                  : 'text-slate-700'
                              }
                            >
                              PKR {profit.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal">—</span>
                          )}
                        </td>

                        {/* Stock Cost Value */}
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-slate-900">
                          {p.stock_cost_value !== null
                            ? `PKR ${Number(p.stock_cost_value).toLocaleString()}`
                            : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile / Tablet Cards */}
            <div className="lg:hidden divide-y divide-slate-100">
              {filteredProducts.map((p) => {
                const profit = p.profit_per_unit;
                return (
                  <div key={p.id} className="p-4 space-y-3 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-sm text-slate-900">{p.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          SKU: {p.sku} · Stock: {p.quantity} units
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block uppercase font-medium">Stock Value</span>
                        <span className="font-bold text-slate-900 font-mono tabular-nums text-xs">
                          {p.stock_cost_value !== null ? `PKR ${p.stock_cost_value.toLocaleString()}` : '—'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs bg-slate-50/80 p-2.5 rounded-lg border border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-medium">Selling Price</span>
                        <span className="font-semibold text-slate-800 font-mono">
                          {p.selling_price !== null ? `PKR ${p.selling_price}` : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-medium">Cost Price</span>
                        <span className="font-semibold text-slate-600 font-mono">
                          {p.cost_price !== null ? `PKR ${p.cost_price}` : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-medium">Profit / Unit</span>
                        <span className="font-bold text-emerald-700 font-mono">
                          {profit !== null ? `PKR ${profit}` : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Table Footer */}
            <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500">
              <div className="flex items-center gap-2">
                <span>Manager Financials</span>
                <span aria-hidden="true">·</span>
                <span>Authorized via get_manager_products() RPC</span>
              </div>
              <div>
                Displaying {filteredProducts.length} of {products.length} catalog items
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
