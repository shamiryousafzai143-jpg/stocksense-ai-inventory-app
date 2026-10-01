import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowUpFromLine,
  Package,
  ShoppingCart,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Shield,
  ArrowRight,
  X,
  Check,
  Flame,
  Minus,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  fetchProductsForStockOut,
  fetchSingleProductForStockOut,
  executeStockOutRpc,
} from '../lib/supabase';
import { StockInProductOption, StockOutType } from '../types';

export const StockOutPage: React.FC = () => {
  const { profile } = useAuth();

  // Data Sources
  const [products, setProducts] = useState<StockInProductOption[]>([]);
  const [isLoadingInitial, setIsLoadingInitial] = useState<boolean>(true);
  const [initialError, setInitialError] = useState<string | null>(null);

  // Form State
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [quantityInput, setQuantityInput] = useState<string>('');
  const [selectedType, setSelectedType] = useState<StockOutType>('sale');
  const [notes, setNotes] = useState<string>('');

  // UI Flow States
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    productName: string;
    sku: string;
    previousStock: number;
    removedQuantity: number;
    newStock: number;
    type: StockOutType;
    timestamp: Date;
  } | null>(null);

  // Load products (Selecting ONLY: id, name, sku, quantity)
  const loadProducts = async () => {
    setIsLoadingInitial(true);
    setInitialError(null);
    try {
      const fetchedProducts = await fetchProductsForStockOut();
      setProducts(fetchedProducts);
    } catch (err: any) {
      console.error('Failed loading products for Stock Out from Supabase:', err);
      setInitialError(err?.message || 'Failed to load products from database.');
    } finally {
      setIsLoadingInitial(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // Currently selected product object
  const selectedProduct = useMemo(() => {
    return products.find((p) => p.id === selectedProductId) || null;
  }, [products, selectedProductId]);

  // Parsed integer quantity
  const parsedQuantity = useMemo(() => {
    const num = parseInt(quantityInput, 10);
    return isNaN(num) ? 0 : num;
  }, [quantityInput]);

  // Requirement 6: Negative Stock Validation
  const currentAvailableStock = selectedProduct?.quantity ?? 0;
  const isInsufficientStock = selectedProduct !== null && parsedQuantity > currentAvailableStock;
  const projectedNewStock = currentAvailableStock - (parsedQuantity > 0 ? parsedQuantity : 0);

  // Validate and open confirmation preview (NO DB CHANGE BEFORE CONFIRMATION)
  const handleProceedToConfirmation = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedProductId || !selectedProduct) {
      setFormError('Please select a product to dispatch or remove stock.');
      return;
    }

    if (!quantityInput || parsedQuantity <= 0) {
      setFormError('Quantity to remove must be a positive integer greater than 0.');
      return;
    }

    // Strict Negative Stock Check
    if (parsedQuantity > currentAvailableStock) {
      setFormError(
        `Insufficient stock. Available: ${currentAvailableStock}, Requested: ${parsedQuantity}`
      );
      return;
    }

    if (selectedType !== 'sale' && selectedType !== 'damage') {
      setFormError('Transaction type must be either sale or damage.');
      return;
    }

    // Open confirmation preview
    setShowConfirmation(true);
  };

  // Requirement 7: Only after valid confirmation call supabase.rpc('stock_out')
  const handleConfirmStockOut = async () => {
    if (!selectedProduct || parsedQuantity <= 0 || isInsufficientStock || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const prevStock = selectedProduct.quantity;
    const removedQty = parsedQuantity;
    const prodName = selectedProduct.name;
    const prodSku = selectedProduct.sku;
    const currentProdId = selectedProduct.id;
    const currentType = selectedType;

    try {
      // Execute the official Supabase stock_out RPC function
      await executeStockOutRpc({
        productId: currentProdId,
        quantity: removedQty,
        type: currentType,
        notes: notes.trim(),
      });

      // Requirement 8: Re-fetch the product stock from Supabase
      const updatedProduct = await fetchSingleProductForStockOut(currentProdId);
      const actualNewStock = updatedProduct ? updatedProduct.quantity : prevStock - removedQty;

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
        removedQuantity: removedQty,
        newStock: actualNewStock,
        type: currentType,
        timestamp: new Date(),
      });

      // Reset form
      setSelectedProductId('');
      setQuantityInput('');
      setSelectedType('sale');
      setNotes('');
      setShowConfirmation(false);
    } catch (err: any) {
      console.error('Stock Out RPC execution error:', err);
      setFormError(err?.message || 'Stock Out transaction failed.');
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
            <span>Warehouse Dispatch</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-slate-700">RPC: public.stock_out()</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Stock Out Operations
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Record customer sales, counter dispatch, or damaged stock write-offs via Supabase RPC.
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
          <p className="text-xs text-slate-500">Loading catalog items and checking stock availability.</p>
        </div>
      ) : initialError ? (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-800 shadow-2xs flex items-start justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-rose-900">Failed to load inventory</span>
              <span>{initialError}</span>
            </div>
          </div>
          <button
            onClick={loadProducts}
            className="px-3 py-1 font-semibold text-rose-700 bg-white border border-rose-300 rounded-md hover:bg-rose-50 shrink-0"
          >
            Retry
          </button>
        </div>
      ) : null}

      {/* Success Notification Banner (Requirement 8) */}
      {successInfo && (
        <div
          className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 shadow-2xs space-y-3 animate-in fade-in duration-200"
          role="status"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5 text-emerald-900 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Stock Out Deduction Completed Successfully!</span>
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
              <span className="text-[10px] text-slate-500 block uppercase font-medium">Transaction Type</span>
              <span className="font-semibold text-slate-800 uppercase tracking-wider block">
                {successInfo.type}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-medium">Removed Units</span>
              <span className="font-bold text-rose-700 font-mono tabular-nums text-sm">
                -{successInfo.removedQuantity}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-medium">Remaining Stock</span>
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

      {/* Main Stock Out Form Card */}
      {!isLoadingInitial && !initialError && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-blue-100/70 text-blue-800">
                <ArrowUpFromLine className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Record Outgoing Stock</h2>
                <p className="text-xs text-slate-500">Dispatch items for POS customer sale or write off damaged items.</p>
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
                  {products.length} products in catalog
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
                <option value="">-- Choose a product to dispatch --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku}) — Available Stock: {p.quantity} units
                  </option>
                ))}
              </select>

              {/* Requirement 4: When product is selected, show Product name, SKU, and Current available stock */}
              {selectedProduct && (
                <div className="mt-3 p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-bold text-slate-900 block text-sm">{selectedProduct.name}</span>
                    <span className="text-[11px] font-mono text-slate-500">SKU: {selectedProduct.sku}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block uppercase font-medium">Available Stock</span>
                    <span
                      className={`font-mono tabular-nums font-bold text-sm ${
                        selectedProduct.quantity === 0
                          ? 'text-rose-600'
                          : selectedProduct.quantity <= 10
                          ? 'text-amber-600'
                          : 'text-slate-900'
                      }`}
                    >
                      {selectedProduct.quantity.toLocaleString()} units
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Field 2 & 3: Quantity to Remove & Reason / Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Requirement 2 & 3: Quantity to Remove (positive integer) */}
              <div className="space-y-1.5">
                <label htmlFor="quantityRemoveInput" className="block text-xs font-semibold text-slate-800">
                  Quantity to Remove <span className="text-rose-500">*</span>
                </label>
                <input
                  id="quantityRemoveInput"
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={quantityInput}
                  onChange={(e) => {
                    setQuantityInput(e.target.value);
                    setFormError(null);
                  }}
                  placeholder="e.g. 3"
                  className={`w-full py-2.5 px-3.5 text-sm font-mono tabular-nums bg-white border rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-slate-900/10 transition-colors ${
                    isInsufficientStock
                      ? 'border-rose-300 focus:border-rose-500'
                      : 'border-slate-300 focus:border-slate-800'
                  }`}
                />

                {/* Requirement 6: Negative Stock Validation Warning */}
                {isInsufficientStock ? (
                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 mt-1">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>
                      <strong>Insufficient stock.</strong> Available: {currentAvailableStock}, Requested: {parsedQuantity}
                    </span>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400">
                    Must be a positive integer &le; available stock ({currentAvailableStock}).
                  </p>
                )}

                {/* Quick Presets for convenience */}
                {selectedProduct && selectedProduct.quantity > 0 && (
                  <div className="pt-1 flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-slate-400 text-[10px] mr-1">Quick Select:</span>
                    {[1, 2, 5, 10].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setQuantityInput(String(preset))}
                        disabled={preset > currentAvailableStock}
                        className="px-2 py-0.5 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors font-mono disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {preset}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setQuantityInput(String(currentAvailableStock))}
                      className="px-2 py-0.5 text-[11px] font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md transition-colors"
                    >
                      All ({currentAvailableStock})
                    </button>
                  </div>
                )}
              </div>

              {/* Requirement 2: Allowed Transaction Types: sale, damage */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-800">
                  Reason / Transaction Type <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2.5 pt-0.5">
                  {/* Option: sale */}
                  <label
                    className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedType === 'sale'
                        ? 'bg-blue-50/70 border-blue-300 ring-1 ring-blue-500/20'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="stockOutType"
                      value="sale"
                      checked={selectedType === 'sale'}
                      onChange={() => setSelectedType('sale')}
                      className="mt-0.5 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                        <ShoppingCart className="w-3.5 h-3.5 text-blue-600" />
                        <span>Sale</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Customer POS checkout or store dispatch
                      </p>
                    </div>
                  </label>

                  {/* Option: damage */}
                  <label
                    className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedType === 'damage'
                        ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-500/20'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="stockOutType"
                      value="damage"
                      checked={selectedType === 'damage'}
                      onChange={() => setSelectedType('damage')}
                      className="mt-0.5 text-amber-600 focus:ring-amber-500"
                    />
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Damage</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Damaged, expired, or write-off deduction
                      </p>
                    </div>
                  </label>
                </div>
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
                placeholder="e.g. POS receipt #9182, Floor customer order, or Broken packaging code DMG-04"
                className="w-full py-2 px-3.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 transition-colors resize-none"
              />
            </div>

            {/* Submit Button Triggering Confirmation Preview */}
            <div className="pt-2 flex items-center justify-end">
              <button
                type="submit"
                disabled={
                  !selectedProductId ||
                  !quantityInput ||
                  parsedQuantity <= 0 ||
                  isInsufficientStock ||
                  currentAvailableStock === 0
                }
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Review & Confirm Stock Out</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Requirement 5: Confirmation Preview Modal */}
      {showConfirmation && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-800">
                  <ArrowUpFromLine className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Confirm Stock Out Deduction</h3>
                  <p className="text-xs text-slate-500">Please review deduction values before confirming</p>
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

            {/* Requirement 5: Confirmation Preview Exact Rows */}
            <div className="p-6 space-y-5">
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3">
                <div className="border-b border-slate-200 pb-2">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Target Item</span>
                  <div className="text-sm font-bold text-slate-900">{selectedProduct.name}</div>
                  <div className="text-xs font-mono text-slate-500">SKU: {selectedProduct.sku}</div>
                </div>

                {/* Calculation Rows matching Requirement 5:
                    Current Stock: 5
                    Removing: -3
                    New Stock: 2
                    Type: sale
                */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Current Stock:</span>
                    <span className="font-mono tabular-nums font-semibold text-slate-800">
                      {currentAvailableStock}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-rose-700 font-medium">Removing:</span>
                    <span className="font-mono tabular-nums font-bold text-rose-700 text-sm">
                      -{parsedQuantity}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-sm">
                    <span className="font-bold text-slate-900">New Stock:</span>
                    <span className="font-mono tabular-nums font-extrabold text-slate-900">
                      {projectedNewStock}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
                    <span className="text-slate-500 font-medium">Type:</span>
                    <span className="font-semibold text-slate-800 uppercase tracking-wider">
                      {selectedType}
                    </span>
                  </div>

                  {notes && (
                    <div className="pt-1 text-xs text-slate-500 italic">
                      Notes: "{notes}"
                    </div>
                  )}
                </div>
              </div>

              {/* Negative Stock Warning Safety Guard inside Modal */}
              {isInsufficientStock && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>
                    Insufficient stock. Available: {currentAvailableStock}, Requested: {parsedQuantity}
                  </span>
                </div>
              )}

              {/* Security & RPC statement */}
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Execution calls <code className="font-mono text-slate-700 font-semibold">public.stock_out</code> RPC. Direct updates are prohibited.</span>
              </div>

              {/* Buttons: Cancel and Confirm Stock Out (Requirement 5 & 7) */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCancelConfirmation}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleConfirmStockOut}
                  disabled={isSubmitting || isInsufficientStock}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-rose-700 hover:bg-rose-800 rounded-lg shadow-xs transition-colors disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Executing Stock Out...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirm Stock Out</span>
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
