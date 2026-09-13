import React, { useState } from 'react';
import { 
  Tag, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  Calendar, 
  Copy, 
  Save, 
  Truck,
  Layers,
  ShoppingBag,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useAdminStore } from '../../store/useAdminStore';
import { Coupon, CouponApplicableType } from '../../types';

export const CouponsModule: React.FC = () => {
  const { 
    coupons, 
    addCoupon, 
    updateCoupon, 
    deleteCoupon,
    products,
    categories
  } = useAdminStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingCoupon, setIsAddingCoupon] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    code: string;
    title: string;
    description: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    maxDiscountAmount: number;
    applicableType: CouponApplicableType;
    applicableProductIds: string[];
    applicableCategoryIds: string[];
    minOrderAmount: number;
    minQuantity: number;
    isFreeShipping: boolean;
    globalUsageLimit: number;
    perUserLimit: number;
    startDate: string;
    endDate: string;
    isActive: boolean;
  }>({
    code: '',
    title: '',
    description: '',
    discountType: 'percentage',
    discountValue: 10,
    maxDiscountAmount: 500,
    applicableType: 'all',
    applicableProductIds: [],
    applicableCategoryIds: [],
    minOrderAmount: 1500,
    minQuantity: 0,
    isFreeShipping: false,
    globalUsageLimit: 100,
    perUserLimit: 1,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '2026-12-31',
    isActive: true
  });

  const filteredCoupons = coupons.filter(c => 
    c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (c.title && c.title.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleOpenAddForm = () => {
    setFormError(null);
    setProductSearchTerm('');
    setFormData({
      code: `MAHI${Math.floor(10 + Math.random() * 90)}`,
      title: 'Promotional Offer',
      description: 'Exclusive seasonal discount coupon',
      discountType: 'percentage',
      discountValue: 15,
      maxDiscountAmount: 1000,
      applicableType: 'all',
      applicableProductIds: [],
      applicableCategoryIds: [],
      minOrderAmount: 2000,
      minQuantity: 0,
      isFreeShipping: false,
      globalUsageLimit: 100,
      perUserLimit: 1,
      startDate: new Date().toISOString().split('T')[0],
      endDate: '2026-12-31',
      isActive: true
    });
    setIsAddingCoupon(true);
    setEditingCoupon(null);
  };

  const handleOpenEditForm = (coupon: Coupon) => {
    setFormError(null);
    setProductSearchTerm('');
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code || '',
      title: coupon.title || '',
      description: coupon.description || '',
      discountType: coupon.discountType || 'percentage',
      discountValue: coupon.discountValue ?? coupon.discountAmount ?? 0,
      maxDiscountAmount: coupon.maxDiscountAmount ?? coupon.maxDiscount ?? 0,
      applicableType: coupon.applicableType || 'all',
      applicableProductIds: coupon.applicableProductIds || [],
      applicableCategoryIds: coupon.applicableCategoryIds || [],
      minOrderAmount: coupon.minOrderAmount ?? coupon.minSpend ?? 0,
      minQuantity: coupon.minQuantity ?? 0,
      isFreeShipping: Boolean(coupon.isFreeShipping),
      globalUsageLimit: coupon.globalUsageLimit ?? coupon.usageLimit ?? 0,
      perUserLimit: coupon.perUserLimit ?? 1,
      startDate: coupon.startDate || new Date().toISOString().split('T')[0],
      endDate: coupon.endDate || coupon.expiryDate || '2026-12-31',
      isActive: coupon.isActive !== undefined ? coupon.isActive : true
    });
    setIsAddingCoupon(false);
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const formattedCode = formData.code.trim().toUpperCase();
    if (!formattedCode) {
      setFormError('Coupon code is required.');
      return;
    }

    if (formData.discountValue <= 0 && !formData.isFreeShipping) {
      setFormError('Please enter a valid discount value or enable free delivery.');
      return;
    }

    // Check duplicate code if creating new or changing code in edit
    const isDuplicate = coupons.some(c => 
      c.code.trim().toUpperCase() === formattedCode && 
      (!editingCoupon || c.id !== editingCoupon.id)
    );

    if (isDuplicate) {
      setFormError(`Coupon code "${formattedCode}" already exists. Please choose a unique code.`);
      return;
    }

    // Validate target configuration
    if (formData.applicableType === 'single_product' && formData.applicableProductIds.length === 0) {
      setFormError('Please select a specific product for Single Product offer.');
      return;
    }

    if (formData.applicableType === 'multiple_products' && formData.applicableProductIds.length < 2) {
      setFormError('Please select at least 2 products for Multiple Products bundle offer.');
      return;
    }

    if (formData.applicableType === 'categories' && formData.applicableCategoryIds.length === 0) {
      setFormError('Please select at least one category.');
      return;
    }

    if (editingCoupon) {
      // Preserve existing usage data
      await updateCoupon(editingCoupon.id, {
        code: formattedCode,
        title: formData.title,
        description: formData.description,
        discountType: formData.discountType,
        discountValue: Number(formData.discountValue),
        discountAmount: Number(formData.discountValue), // backward compatibility
        maxDiscountAmount: Number(formData.maxDiscountAmount) || undefined,
        maxDiscount: Number(formData.maxDiscountAmount) || undefined,
        applicableType: formData.applicableType,
        applicableProductIds: formData.applicableProductIds,
        applicableCategoryIds: formData.applicableCategoryIds,
        minOrderAmount: Number(formData.minOrderAmount) || 0,
        minSpend: Number(formData.minOrderAmount) || 0,
        minQuantity: Number(formData.minQuantity) || 0,
        isFreeShipping: formData.isFreeShipping,
        globalUsageLimit: Number(formData.globalUsageLimit) || 0,
        usageLimit: Number(formData.globalUsageLimit) || 0,
        perUserLimit: Number(formData.perUserLimit) || 1,
        startDate: formData.startDate,
        endDate: formData.endDate,
        expiryDate: formData.endDate,
        isActive: formData.isActive,
        // Preserve counters
        totalUsedCount: editingCoupon.totalUsedCount ?? editingCoupon.usageCount ?? 0,
        usageCount: editingCoupon.totalUsedCount ?? editingCoupon.usageCount ?? 0,
        usedByUsers: editingCoupon.usedByUsers || [],
        createdAt: editingCoupon.createdAt
      });
      setEditingCoupon(null);
    } else {
      await addCoupon({
        code: formattedCode,
        title: formData.title,
        description: formData.description,
        discountType: formData.discountType,
        discountValue: Number(formData.discountValue),
        discountAmount: Number(formData.discountValue),
        maxDiscountAmount: Number(formData.maxDiscountAmount) || undefined,
        maxDiscount: Number(formData.maxDiscountAmount) || undefined,
        applicableType: formData.applicableType,
        applicableProductIds: formData.applicableProductIds,
        applicableCategoryIds: formData.applicableCategoryIds,
        minOrderAmount: Number(formData.minOrderAmount) || 0,
        minSpend: Number(formData.minOrderAmount) || 0,
        minQuantity: Number(formData.minQuantity) || 0,
        isFreeShipping: formData.isFreeShipping,
        globalUsageLimit: Number(formData.globalUsageLimit) || 0,
        usageLimit: Number(formData.globalUsageLimit) || 0,
        perUserLimit: Number(formData.perUserLimit) || 1,
        startDate: formData.startDate,
        endDate: formData.endDate,
        expiryDate: formData.endDate,
        isActive: formData.isActive,
        totalUsedCount: 0,
        usageCount: 0,
        usedByUsers: []
      });
      setIsAddingCoupon(false);
    }
  };

  const handleToggleStatus = async (coupon: Coupon) => {
    await updateCoupon(coupon.id, { isActive: !coupon.isActive });
  };

  const handleDeleteCoupon = async (id: string, code: string) => {
    if (window.confirm(`Are you sure you want to delete coupon "${code}"? This will permanently remove it from Firestore.`)) {
      await deleteCoupon(id);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Helper to toggle product selection
  const toggleProductSelection = (productId: string) => {
    if (formData.applicableType === 'single_product') {
      setFormData(prev => ({ ...prev, applicableProductIds: [productId] }));
    } else {
      setFormData(prev => {
        const exists = prev.applicableProductIds.includes(productId);
        return {
          ...prev,
          applicableProductIds: exists 
            ? prev.applicableProductIds.filter(id => id !== productId)
            : [...prev.applicableProductIds, productId]
        };
      });
    }
  };

  // Helper to toggle category selection
  const toggleCategorySelection = (categoryName: string) => {
    setFormData(prev => {
      const exists = prev.applicableCategoryIds.includes(categoryName);
      return {
        ...prev,
        applicableCategoryIds: exists
          ? prev.applicableCategoryIds.filter(c => c !== categoryName)
          : [...prev.applicableCategoryIds, categoryName]
      };
    });
  };

  const getCouponStatusBadge = (coupon: Coupon) => {
    const now = new Date();
    const isExpired = coupon.endDate && new Date(coupon.endDate) < now;
    const isUpcoming = coupon.startDate && new Date(coupon.startDate) > now;
    const usageCount = coupon.totalUsedCount ?? coupon.usageCount ?? 0;
    const usageLimit = coupon.globalUsageLimit ?? coupon.usageLimit ?? 0;
    const isLimitReached = usageLimit > 0 && usageCount >= usageLimit;

    if (!coupon.isActive) {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-600 border border-neutral-300">Disabled</span>;
    }
    if (isLimitReached) {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">Limit Reached</span>;
    }
    if (isExpired) {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">Expired</span>;
    }
    if (isUpcoming) {
      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">Upcoming</span>;
    }
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">Active</span>;
  };

  const filteredProductsForSelector = products.filter(p => 
    p.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
    (p.category && p.category.toLowerCase().includes(productSearchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-4">
        <div>
          <h2 className="text-xl font-serif font-bold text-neutral-900">Discount Coupons & Deals Management</h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Configure single product discounts, bundle deals, category promos, free shipping offers, and atomic 1-user-1-time rules.
          </p>
        </div>

        <button
          onClick={handleOpenAddForm}
          className="px-4 py-2 bg-[#4A1525] text-amber-200 rounded-lg text-xs font-bold hover:bg-[#6B1228] transition flex items-center space-x-2 shadow-sm shrink-0"
        >
          <Plus size={16} />
          <span>Create New Coupon</span>
        </button>
      </div>

      {/* Add / Edit Form Modal */}
      {(isAddingCoupon || editingCoupon) && (
        <div className="bg-amber-50/50 rounded-xl border border-amber-200 p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-amber-200/80 mb-4">
            <h3 className="font-serif font-bold text-base text-[#4A1525] flex items-center space-x-2">
              <Tag size={18} />
              <span>{editingCoupon ? `Edit Coupon: ${editingCoupon.code}` : 'Create Discount & Offer Voucher'}</span>
            </h3>
            <button
              onClick={() => {
                setIsAddingCoupon(false);
                setEditingCoupon(null);
                setFormError(null);
              }}
              className="p-1 text-neutral-500 hover:text-neutral-800"
            >
              <X size={18} />
            </button>
          </div>

          {formError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center space-x-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSaveCoupon} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Coupon Code */}
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Coupon Code (Uppercase) *</label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="e.g. BOOK850, SAVE50, EID2026"
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white font-mono font-bold tracking-wider"
              />
            </div>

            {/* Campaign Title */}
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Offer Title / Headline</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Eid Festive Special 15% OFF"
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white font-medium"
              />
            </div>

            {/* Applicable Offer Target */}
            <div className="md:col-span-2 bg-white p-3.5 rounded-lg border border-neutral-200">
              <label className="block font-semibold text-neutral-800 mb-2">Offer Target / Applicability *</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, applicableType: 'all', applicableProductIds: [], applicableCategoryIds: [] })}
                  className={`p-2.5 rounded-lg border text-left flex flex-col justify-between transition ${
                    formData.applicableType === 'all'
                      ? 'border-[#4A1525] bg-amber-50/60 text-[#4A1525] font-bold'
                      : 'border-neutral-200 hover:bg-neutral-50 text-neutral-600'
                  }`}
                >
                  <span className="flex items-center space-x-1.5"><ShoppingBag size={14} /> <span>Entire Store</span></span>
                  <span className="text-[10px] text-neutral-500 font-normal mt-1">All catalog products</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, applicableType: 'single_product' })}
                  className={`p-2.5 rounded-lg border text-left flex flex-col justify-between transition ${
                    formData.applicableType === 'single_product'
                      ? 'border-[#4A1525] bg-amber-50/60 text-[#4A1525] font-bold'
                      : 'border-neutral-200 hover:bg-neutral-50 text-neutral-600'
                  }`}
                >
                  <span className="flex items-center space-x-1.5"><Tag size={14} /> <span>Single Product</span></span>
                  <span className="text-[10px] text-neutral-500 font-normal mt-1">Discount 1 specific item</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, applicableType: 'multiple_products' })}
                  className={`p-2.5 rounded-lg border text-left flex flex-col justify-between transition ${
                    formData.applicableType === 'multiple_products'
                      ? 'border-[#4A1525] bg-amber-50/60 text-[#4A1525] font-bold'
                      : 'border-neutral-200 hover:bg-neutral-50 text-neutral-600'
                  }`}
                >
                  <span className="flex items-center space-x-1.5"><Layers size={14} /> <span>Multiple Products</span></span>
                  <span className="text-[10px] text-neutral-500 font-normal mt-1">Bundle package promo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, applicableType: 'categories' })}
                  className={`p-2.5 rounded-lg border text-left flex flex-col justify-between transition ${
                    formData.applicableType === 'categories'
                      ? 'border-[#4A1525] bg-amber-50/60 text-[#4A1525] font-bold'
                      : 'border-neutral-200 hover:bg-neutral-50 text-neutral-600'
                  }`}
                >
                  <span className="flex items-center space-x-1.5"><CheckCircle2 size={14} /> <span>Categories</span></span>
                  <span className="text-[10px] text-neutral-500 font-normal mt-1">Specific product categories</span>
                </button>
              </div>

              {/* Product Selector for Single / Multiple Products */}
              {(formData.applicableType === 'single_product' || formData.applicableType === 'multiple_products') && (
                <div className="mt-3 pt-3 border-t border-neutral-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-neutral-700 text-xs">
                      {formData.applicableType === 'single_product' ? 'Select Target Product:' : 'Select Bundle Products:'}
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      Selected: <strong>{formData.applicableProductIds.length}</strong> product(s)
                    </span>
                  </div>

                  {/* Search Product Input */}
                  <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-2 text-neutral-400" />
                    <input
                      type="text"
                      value={productSearchTerm}
                      onChange={(e) => setProductSearchTerm(e.target.value)}
                      placeholder="Search product by name or category..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs border border-neutral-300 rounded bg-white"
                    />
                  </div>

                  {/* Product selection list */}
                  <div className="max-h-36 overflow-y-auto border border-neutral-200 rounded p-2 bg-neutral-50 divide-y divide-neutral-200/60 space-y-1">
                    {filteredProductsForSelector.length === 0 ? (
                      <div className="text-center py-2 text-neutral-400 text-xs">No matching products found.</div>
                    ) : (
                      filteredProductsForSelector.map(product => {
                        const isSelected = formData.applicableProductIds.includes(product.id);
                        return (
                          <div 
                            key={product.id} 
                            onClick={() => toggleProductSelection(product.id)}
                            className={`flex items-center justify-between p-1.5 rounded cursor-pointer transition ${
                              isSelected ? 'bg-amber-100 text-[#4A1525] font-semibold' : 'hover:bg-neutral-100 text-neutral-700'
                            }`}
                          >
                            <div className="flex items-center space-x-2 truncate">
                              <input
                                type={formData.applicableType === 'single_product' ? 'radio' : 'checkbox'}
                                checked={isSelected}
                                onChange={() => {}}
                                className="rounded text-[#4A1525]"
                              />
                              <span className="truncate text-xs">{product.name}</span>
                              <span className="text-[10px] text-neutral-400 bg-neutral-200/60 px-1.5 py-0.5 rounded">৳{product.price}</span>
                            </div>
                            <span className="text-[10px] text-neutral-400 capitalize">{product.category}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Category Selector */}
              {formData.applicableType === 'categories' && (
                <div className="mt-3 pt-3 border-t border-neutral-100 space-y-2">
                  <span className="font-semibold text-neutral-700 text-xs block">Select Eligible Categories:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {categories.map(cat => {
                      const isSelected = formData.applicableCategoryIds.includes(cat.name);
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => toggleCategorySelection(cat.name)}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium border transition ${
                            isSelected 
                              ? 'bg-[#4A1525] text-amber-200 border-[#4A1525]' 
                              : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-100'
                          }`}
                        >
                          {cat.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Discount Type & Value */}
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Discount Type *</label>
              <select
                value={formData.discountType}
                onChange={(e) => setFormData({ ...formData, discountType: e.target.value as 'percentage' | 'fixed' })}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white"
              >
                <option value="percentage">Percentage Discount (%)</option>
                <option value="fixed">Fixed Amount Off (৳ BDT)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">
                {formData.discountType === 'percentage' ? 'Percentage Off (%) *' : 'Amount Off (৳ BDT) *'}
              </label>
              <input
                type="number"
                required
                min="0"
                max={formData.discountType === 'percentage' ? 100 : 100000}
                value={formData.discountValue}
                onChange={(e) => setFormData({ ...formData, discountValue: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white font-mono font-bold text-[#4A1525]"
              />
            </div>

            {/* Maximum Discount Cap (Percentage only) */}
            {formData.discountType === 'percentage' && (
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Maximum Discount Cap (৳ BDT)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.maxDiscountAmount}
                  onChange={(e) => setFormData({ ...formData, maxDiscountAmount: Number(e.target.value) })}
                  placeholder="e.g. 500 (0 for unlimited)"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white font-mono"
                />
              </div>
            )}

            {/* Minimum Cart Subtotal Spend */}
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Minimum Cart Spend (৳ BDT)</label>
              <input
                type="number"
                min="0"
                value={formData.minOrderAmount}
                onChange={(e) => setFormData({ ...formData, minOrderAmount: Number(e.target.value) })}
                placeholder="e.g. 2000 (0 for no minimum)"
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white font-mono"
              />
            </div>

            {/* Minimum Item Quantity in Cart */}
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Minimum Items Quantity</label>
              <input
                type="number"
                min="0"
                value={formData.minQuantity}
                onChange={(e) => setFormData({ ...formData, minQuantity: Number(e.target.value) })}
                placeholder="e.g. 3 (0 for any quantity)"
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white font-mono"
              />
            </div>

            {/* Global Usage Limit */}
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Global Usage Limit (Total Orders)</label>
              <input
                type="number"
                min="0"
                value={formData.globalUsageLimit}
                onChange={(e) => setFormData({ ...formData, globalUsageLimit: Number(e.target.value) })}
                placeholder="e.g. 100 (0 for unlimited)"
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white font-mono"
              />
            </div>

            {/* Start & End Dates */}
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Offer Start Date *</label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Offer Expiry Date *</label>
              <input
                type="date"
                required
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white font-mono"
              />
            </div>

            {/* Free Shipping & Active Toggles */}
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 bg-white p-3 rounded-lg border border-neutral-200">
              <label className="flex items-center space-x-2.5 cursor-pointer font-medium text-neutral-800">
                <input
                  type="checkbox"
                  checked={formData.isFreeShipping}
                  onChange={(e) => setFormData({ ...formData, isFreeShipping: e.target.checked })}
                  className="rounded text-[#4A1525] focus:ring-[#4A1525] h-4 w-4"
                />
                <span className="flex items-center space-x-1 text-xs">
                  <Truck size={14} className="text-emerald-600" />
                  <span>Free Delivery Reward (৳0 Shipping Charge)</span>
                </span>
              </label>

              <label className="flex items-center space-x-2.5 cursor-pointer font-medium text-neutral-800">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded text-[#4A1525] focus:ring-[#4A1525] h-4 w-4"
                />
                <span className="text-xs font-semibold text-neutral-900">Active (Enable customer checkout redemption)</span>
              </label>
            </div>

            {/* Description / Campaign Purpose */}
            <div className="md:col-span-2">
              <label className="block font-semibold text-neutral-700 mb-1">Customer Note / Description</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g. Special Eid Festive discount across handcrafted jewelry"
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white"
              />
            </div>

            {/* Action Buttons */}
            <div className="md:col-span-2 flex justify-end space-x-3 pt-3 border-t border-amber-200">
              <button
                type="button"
                onClick={() => {
                  setIsAddingCoupon(false);
                  setEditingCoupon(null);
                  setFormError(null);
                }}
                className="px-4 py-2 border border-neutral-300 rounded-lg font-semibold text-neutral-700 hover:bg-neutral-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#4A1525] text-amber-200 rounded-lg font-bold hover:bg-[#6B1228] transition flex items-center space-x-1.5 shadow-sm"
              >
                <Save size={15} />
                <span>{editingCoupon ? 'Update Coupon' : 'Save & Publish Coupon'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search and Counter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-neutral-50 p-3 rounded-xl border border-neutral-200">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3 top-2.5 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search coupon code, title or note..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#4A1525]"
          />
        </div>

        <div className="text-xs text-neutral-500 font-mono flex items-center space-x-3">
          <span>Total: <strong className="text-neutral-800">{coupons.length}</strong></span>
          <span>•</span>
          <span>Active: <strong className="text-emerald-700">{coupons.filter(c => c.isActive).length}</strong></span>
        </div>
      </div>

      {/* Coupons List Table */}
      <div className="overflow-x-auto border border-neutral-200 rounded-xl bg-white shadow-sm">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-500 uppercase font-mono text-[10px]">
              <th className="py-3 px-3">Coupon Code & Target</th>
              <th className="py-3 px-3">Discount & Reward</th>
              <th className="py-3 px-3">Conditions</th>
              <th className="py-3 px-3">Usage Statistics</th>
              <th className="py-3 px-3">Validity</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filteredCoupons.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-neutral-400">
                  <Tag size={28} className="mx-auto mb-2 opacity-30" />
                  <span>No coupons created yet in Firestore. Click "Create New Coupon" to start.</span>
                </td>
              </tr>
            ) : (
              filteredCoupons.map((coupon) => {
                const usedCount = coupon.totalUsedCount ?? coupon.usageCount ?? 0;
                const usageLimit = coupon.globalUsageLimit ?? coupon.usageLimit ?? 0;
                const isFreeShipping = Boolean(coupon.isFreeShipping);

                return (
                  <tr key={coupon.id} className="hover:bg-neutral-50/80 transition">
                    {/* Code & Target */}
                    <td className="py-3 px-3">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-sm text-[#4A1525] bg-amber-50 px-2 py-0.5 rounded border border-amber-200/80">
                          {coupon.code}
                        </span>
                        <button
                          onClick={() => handleCopyCode(coupon.code)}
                          className="text-neutral-400 hover:text-neutral-700 transition"
                          title="Copy code"
                        >
                          {copiedCode === coupon.code ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                        </button>
                      </div>

                      <div className="mt-1 flex items-center space-x-1.5 text-[11px]">
                        <span className="text-neutral-500 font-medium capitalize">
                          {coupon.applicableType === 'single_product' && '🎯 Single Product'}
                          {coupon.applicableType === 'multiple_products' && `📦 Bundle (${coupon.applicableProductIds?.length || 0} Products)`}
                          {coupon.applicableType === 'categories' && `🏷️ Categories (${coupon.applicableCategoryIds?.length || 0})`}
                          {(!coupon.applicableType || coupon.applicableType === 'all') && '🌐 Entire Store'}
                        </span>
                      </div>

                      {coupon.description && (
                        <div className="text-[10px] text-neutral-400 mt-0.5 line-clamp-1">{coupon.description}</div>
                      )}
                    </td>

                    {/* Discount & Free Shipping */}
                    <td className="py-3 px-3 font-mono">
                      <div className="font-bold text-neutral-900">
                        {coupon.discountType === 'percentage' ? (
                          <span className="text-emerald-700 font-bold">{coupon.discountValue ?? coupon.discountAmount}% OFF</span>
                        ) : (
                          <span className="text-emerald-700 font-bold">৳{(coupon.discountValue ?? coupon.discountAmount ?? 0).toLocaleString()} OFF</span>
                        )}
                      </div>

                      {isFreeShipping && (
                        <div className="flex items-center space-x-1 text-[11px] text-emerald-600 font-sans font-semibold mt-0.5">
                          <Truck size={12} />
                          <span>+ Free Delivery</span>
                        </div>
                      )}

                      {coupon.maxDiscountAmount && coupon.maxDiscountAmount > 0 ? (
                        <div className="text-[10px] text-neutral-400 font-sans mt-0.5">
                          Max Cap: ৳{coupon.maxDiscountAmount.toLocaleString()}
                        </div>
                      ) : null}
                    </td>

                    {/* Conditions */}
                    <td className="py-3 px-3 text-[11px] text-neutral-600 space-y-0.5">
                      <div>Min Spend: <strong className="font-mono">{(coupon.minOrderAmount || coupon.minSpend) ? `৳${(coupon.minOrderAmount || coupon.minSpend)?.toLocaleString()}` : 'None'}</strong></div>
                      {coupon.minQuantity && coupon.minQuantity > 0 ? (
                        <div>Min Quantity: <strong className="font-mono">{coupon.minQuantity} items</strong></div>
                      ) : null}
                      <div className="text-[10px] text-neutral-400">Rule: 1 use per customer</div>
                    </td>

                    {/* Usage statistics */}
                    <td className="py-3 px-3 font-mono">
                      <div className="font-bold text-neutral-800 flex items-center space-x-1">
                        <span>{usedCount}</span>
                        <span className="text-neutral-400 font-normal">/ {usageLimit > 0 ? usageLimit : '∞'} used</span>
                      </div>
                      <div className="text-[10px] text-neutral-400">
                        {coupon.usedByUsers?.length || 0} unique users
                      </div>
                    </td>

                    {/* Validity */}
                    <td className="py-3 px-3 font-mono text-[11px] text-neutral-600">
                      <div>{coupon.startDate || 'Immediate'}</div>
                      <div className="text-[10px] text-neutral-400">to {coupon.endDate || coupon.expiryDate || 'Unlimited'}</div>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3">
                      <div className="space-y-1">
                        <div>{getCouponStatusBadge(coupon)}</div>
                        <button
                          onClick={() => handleToggleStatus(coupon)}
                          className="text-[10px] text-neutral-500 hover:text-neutral-800 underline block"
                        >
                          {coupon.isActive ? 'Disable' : 'Enable'}
                        </button>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleOpenEditForm(coupon)}
                          className="p-1.5 text-neutral-600 hover:text-[#4A1525] hover:bg-amber-50 rounded transition"
                          title="Edit Coupon"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() => handleDeleteCoupon(coupon.id, coupon.code)}
                          className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                          title="Delete Coupon"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
