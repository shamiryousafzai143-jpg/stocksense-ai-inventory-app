import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowDownToLine,
  Package,
  Truck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Plus,
  Shield,
  Layers,
  ArrowRight,
  FileText,
  X,
  Building2,
  Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  fetchProductsForStockIn,
  fetchSuppliersForStockIn,
  fetchSingleProductForStockIn,
  executeStockInRpc,
} from '../lib/supabase';
import { StockInProductOption, SupplierItem } from '../types';

export const StockInPage: React.FC = () => {
  const { profile } = useAuth();

  // Data Sources
  const [products, setProducts] = useState<StockInProductOption[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [isLoadingInitial, setIsLoadingInitial] = useState<boolean>(true);
  const [initialError, setInitialError] = useState<string | null>(null);

  // Form State
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [quantityInput, setQuantityInput] = useState<string>('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Search & Filter in Product Selector
  const [productSearch, setProductSearch] = useState<string>('');

  // UI Flow States
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    productName: string;
    sku: string;
    previousStock: number;
    addedQuantity: number;
    newStock: number;
    supplierName: string;
    timestamp: Date;
  } | null>(null);

  // Load products and suppliers
  const loadInitialData = async () => {
    setIsLoadingInitial(true);
    setInitialError(null);
    try {
      const [fetchedProducts, fetchedSuppliers] = await Promise.all([
        fetchProductsForStockIn(),
        fetchSuppliersForStockIn(),
      ]);
      setProducts(fetchedProducts);
      setSuppliers(fetchedSuppliers);
    } catch (err: any) {
      console.error('Failed loading initial Stock In data from Supabase:', err);
      setInitialError(err?.message || 'Failed to load products or suppliers.');
    } finally {
      setIsLoadingInitial(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Currently selected product object
  const selectedProduct = useMemo(() => {
    return products.find((p) => p.id === selectedProductId) || null;
  }, [products, selectedProductId]);

  // Currently selected supplier object
  const selectedSupplier = useMemo(() => {
    return suppliers.find((s) => s.id === selectedSupplierId) || null;
  }, [suppliers, selectedSupplierId]);

  // Filtered products list for dropdown
  const filteredProductOptions = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
    );
  }, [products, productSearch]);

  // Parsed integer quantity
  const parsedQuantity = useMemo(() => {
    const num = parseInt(quantityInput, 10);
    return isNaN(num) ? 0 : num;
  }, [quantityInput]);

  const projectedNewStock = (selectedProduct?.quantity || 0) + (parsedQuantity > 0 ? parsedQuantity : 0);

  // Validate and open confirmation preview (NO DB CHANGE BEFORE CONFIRMATION)
  const handleProceedToConfirmation = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedProductId) {
      setFormError('Please select a product to receive stock.');
      return;
    }

    if (!selectedProduct) {
      setFormError('Invalid product selection.');
      return;
    }

    if (!quantityInput || parsedQuantity <= 0) {
      setFormError('Quantity to add must be a positive integer greater than 0.');
      return;
    }

    if (!selectedSupplierId) {
      setFormError('Please select the receiving supplier.');
      return;
    }

    // Open confirmation preview
    setShowConfirmation(true);
  };

  // Execute the RPC upon user confirmation
  const handleConfirmStockIn = async () => {
    if (!selectedProduct || !selectedSupplier || parsedQuantity <= 0 || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const prevStock = selectedProduct.quantity;
    const addedQty = parsedQuantity;
    const prodName = selectedProduct.name;
    const prodSku = selectedProduct.sku;
    const supName = selectedSupplier.name;
    const currentProdId = selectedProduct.id;

    try {
      // Execute the official Supabase RPC function (Requirement 8)
      await executeStockInRpc({
        productId: currentProdId,
        quantity: addedQty,
        supplierId: selectedSupplier.id,
        notes: notes.trim(),
      });

      // Requirement 9: Re-fetch the product from Supabase to confirm updated stock
      const updatedProduct = await fetchSingleProductForStockIn(currentProdId);
      const actualNewStock = updatedProduct ? updatedProduct.quantity : prevStock + addedQty;

      // Update product in local state list
      if (updatedProduct) {
        setProducts((prev) =>
          prev.map((item) => (item.id === currentProdId ? updatedProduct : item))
        );
      }

      // Show success message
      setSuccessInfo({
        productName: prodName,
        sku: prodSku,
        previousStock: prevStock,
        addedQuantity: addedQty,
        newStock: actualNewStock,
        supplierName: supName,
        timestamp: new Date(),
      });

      // Reset form
      setSelectedProductId('');
      setQuantityInput('');
      setSelectedSupplierId('');
      setNotes('');
      setShowConfirmation(false);
    } catch (err: any) {
      console.error('Stock In RPC execution failed:', err);
      setFormError(err?.message || 'Stock In transaction failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelConfirmation = () => {
    setShowConfirmation(false);
    setFormError(null);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>Nowshera Shopping Mall</span>
            <span aria-hidden="true">·</span>
            <span>Warehouse Intake</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-slate-700">RPC: public.stock_in()</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Stock In Operations
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Log purchase intake and shelf replenishment. Stock updates are executed strictly via Supabase RPC.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Shield className="w-4 h-4 text-emerald-600" />
          <span>Operator: <strong className="text-slate-800">{profile?.full_name}</strong> ({profile?.role})</span>
        </div>
      </div>

      {/* Initial Loading or Error Banner */}
      {isLoadingInitial ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-2xs space-y-2">
          <RefreshCw className="w-6 h-6 animate-spin text-emerald-600 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-900">Connecting to Supabase...</h3>
          <p className="text-xs text-slate-500">Loading catalog products and registered suppliers.</p>
        </div>
      ) : initialError ? (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-800 shadow-2xs flex items-start justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-rose-900">Failed to load data</span>
              <span>{initialError}</span>
            </div>
          </div>
          <button
            onClick={loadInitialData}
            className="px-3 py-1 font-semibold text-rose-700 bg-white border border-rose-300 rounded-md hover:bg-rose-50 shrink-0"
          >
            Retry
          </button>
        </div>
      ) : null}

      {/* Success Notification Banner (Requirement 9) */}
      {successInfo && (
        <div
          className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 shadow-2xs space-y-3 animate-in fade-in duration-200"
          role="status"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5 text-emerald-900 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Stock In Transaction Completed Successfully!</span>
            </div>
            <button
              onClick={() => setSuccessInfo(null)}
              className="text-slate-400 hover:text-slate-600"
              aria-label="Dismiss success message"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-white/80 rounded-lg p-3.5 border border-emerald-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-medium">Product</span>
              <span className="font-semibold text-slate-900 truncate block">{successInfo.productName}</span>
              <span className="text-[10px] font-mono text-slate-500">{successInfo.sku}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-medium">Supplier</span>
              <span className="font-medium text-slate-800 truncate block">{successInfo.supplierName}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-medium">Added Units</span>
              <span className="font-bold text-emerald-700 font-mono tabular-nums text-sm">
                +{successInfo.addedQuantity}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-medium">Updated Stock</span>
              <span className="font-bold text-slate-900 font-mono tabular-nums text-sm">
                {successInfo.newStock} units
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-emerald-800 pt-1">
            <span>Verified and recorded in <code className="font-mono">public.stock_transactions</code> via RPC</span>
            <span className="font-mono tabular-nums">
              {successInfo.timestamp.toLocaleTimeString()}
            </span>
          </div>
        </div>
      )}

      {/* Main Stock In Card */}
      {!isLoadingInitial && !initialError && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-100/70 text-emerald-800">
                <ArrowDownToLine className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Record Incoming Stock</h2>
                <p className="text-xs text-slate-500">Select product, specify intake units, and attribute supplier.</p>
              </div>
            </div>
            <span className="text-[11px] font-medium text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded-md">
              Step 1 of 2
            </span>
          </div>

          {/* Form Error Banner */}
          {formError && (
            <div className="m-5 p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-rose-900">Transaction Notice</span>
                <span>{formError}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleProceedToConfirmation} className="p-5 sm:p-6 space-y-6">
            {/* Field 1: Product Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="productSelect" className="block text-xs font-semibold text-slate-800">
                  Select Product <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-slate-400">
                  {products.length} products available
                </span>
              </div>

              {/* Product Selector Dropdown */}
              <select
                id="productSelect"
                value={selectedProductId}
                onChange={(e) => {
                  setSelectedProductId(e.target.value);
                  setFormError(null);
                }}
                required
                className="w-full py-2.5 px-3.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 transition-colors cursor-pointer"
              >
                <option value="">-- Choose a product from catalog --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku}) — Current Stock: {p.quantity} units
                  </option>
                ))}
              </select>

              {/* Requirement 5: When product is selected, show Product name, SKU, and Current stock */}
              {selectedProduct && (
                <div className="mt-3 p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-bold text-slate-900 block text-sm">{selectedProduct.name}</span>
                    <span className="text-[11px] font-mono text-slate-500">SKU: {selectedProduct.sku}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block uppercase font-medium">Current Stock</span>
                    <span className="font-mono tabular-nums font-bold text-slate-900 text-sm">
                      {selectedProduct.quantity.toLocaleString()} units
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Field 2 & 3: Quantity and Supplier in Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Requirement 4: Quantity to Add (positive integer > 0) */}
              <div className="space-y-1.5">
                <label htmlFor="quantityInput" className="block text-xs font-semibold text-slate-800">
                  Quantity to Add <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="quantityInput"
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={quantityInput}
                    onChange={(e) => {
                      setQuantityInput(e.target.value);
                      setFormError(null);
                    }}
                    placeholder="e.g. 25"
                    className="w-full py-2.5 px-3.5 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 transition-colors"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Must be an integer strictly greater than 0.
                </p>

                {/* Quick Presets for convenience */}
                <div className="pt-1 flex items-center gap-1.5 text-xs">
                  <span className="text-slate-400 text-[10px] mr-1">Quick Add:</span>
                  {[5, 10, 25, 50, 100].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setQuantityInput(String(preset))}
                      className="px-2 py-0.5 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors font-mono"
                    >
                      +{preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Requirement 2: Supplier selection */}
              <div className="space-y-1.5">
                <label htmlFor="supplierSelect" className="block text-xs font-semibold text-slate-800">
                  Receiving Supplier <span className="text-rose-500">*</span>
                </label>
                <select
                  id="supplierSelect"
                  value={selectedSupplierId}
                  onChange={(e) => {
                    setSelectedSupplierId(e.target.value);
                    setFormError(null);
                  }}
                  required
                  className="w-full py-2.5 px-3.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 transition-colors cursor-pointer"
                >
                  <option value="">-- Choose supplier --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400">
                  Source vendor or distributor delivering this shipment.
                </p>
              </div>
            </div>

            {/* Field 4: Notes (optional) */}
            <div className="space-y-1.5">
              <label htmlFor="notesInput" className="block text-xs font-semibold text-slate-800">
                Transaction Notes <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <textarea
                id="notesInput"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Delivery Invoice #4928, Batch expiration 2027, Received via cargo bay 2"
                className="w-full py-2 px-3.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 transition-colors resize-none"
              />
            </div>

            {/* Submit Button Triggering Confirmation Preview */}
            <div className="pt-2 flex items-center justify-end">
              <button
                type="submit"
                disabled={!selectedProductId || !quantityInput || parsedQuantity <= 0 || !selectedSupplierId}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Review & Confirm Stock In</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Requirement 6 & 7: Confirmation Preview Modal / Overlay */}
      {showConfirmation && selectedProduct && selectedSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800">
                  <ArrowDownToLine className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Confirm Stock In Transaction</h3>
                  <p className="text-xs text-slate-500">Please review inventory calculations before confirming</p>
                </div>
              </div>
              <button
                onClick={handleCancelConfirmation}
                disabled={isSubmitting}
                className="text-slate-400 hover:text-slate-600 p-1"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Requirement 6: Confirmation Preview Content */}
            <div className="p-6 space-y-5">
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3">
                <div className="border-b border-slate-200 pb-2">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Target Item</span>
                  <div className="text-sm font-bold text-slate-900">{selectedProduct.name}</div>
                  <div className="text-xs font-mono text-slate-500">SKU: {selectedProduct.sku}</div>
                </div>

                {/* Calculation Rows */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Current Stock:</span>
                    <span className="font-mono tabular-nums font-semibold text-slate-800">
                      {selectedProduct.quantity.toLocaleString()} units
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-emerald-700 font-medium">Adding:</span>
                    <span className="font-mono tabular-nums font-bold text-emerald-700 text-sm">
                      +{parsedQuantity.toLocaleString()} units
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-sm">
                    <span className="font-bold text-slate-900">New Stock:</span>
                    <span className="font-mono tabular-nums font-extrabold text-slate-900">
                      {projectedNewStock.toLocaleString()} units
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
                    <span className="text-slate-500">Supplier:</span>
                    <span className="font-semibold text-slate-800">{selectedSupplier.name}</span>
                  </div>

                  {notes && (
                    <div className="pt-1 text-xs text-slate-500 italic">
                      Notes: "{notes}"
                    </div>
                  )}
                </div>
              </div>

              {/* Security & RPC statement */}
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Execution calls <code className="font-mono text-slate-700 font-semibold">public.stock_in</code> RPC. Direct updates are prohibited.</span>
              </div>

              {/* Requirement 7: Buttons Cancel and Confirm Stock In */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCancelConfirmation}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>

                {/* Requirement 8: Only after Confirm, call supabase.rpc('stock_in') */}
                <button
                  type="button"
                  onClick={handleConfirmStockIn}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Executing Stock In...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirm Stock In</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
