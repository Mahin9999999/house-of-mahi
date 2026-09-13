import React, { useState, useEffect } from 'react';
import { ShoppingBag, Plus, Minus, Trash2, ArrowRight, Tag, CheckCircle2, X, Truck, Sparkles } from 'lucide-react';
import { CartItem } from '../types';
import { useAdminStore } from '../store/useAdminStore';
import { useAuth } from '../context/AuthContext';
import { validateAndCalculateCoupon } from '../services/couponService';

interface CartPageProps {
  cart: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
  orderNote: string;
  setOrderNote: (note: string) => void;
  appliedCoupon: string;
  setAppliedCoupon: (c: string) => void;
  couponDiscount: number;
  isFreeShipping?: boolean;
  onApplyCoupon: (code?: string) => void;
  onRemoveCoupon?: () => void;
  onProceedToCheckout: () => void;
  onContinueShopping: () => void;
}

export const CartPage: React.FC<CartPageProps> = ({
  cart,
  onUpdateQuantity,
  onRemoveItem,
  orderNote,
  setOrderNote,
  appliedCoupon,
  setAppliedCoupon,
  couponDiscount: parentCouponDiscount,
  isFreeShipping: parentIsFreeShipping = false,
  onApplyCoupon,
  onRemoveCoupon,
  onProceedToCheckout,
  onContinueShopping
}) => {
  const { coupons, storeSettings } = useAdminStore();
  const { currentUser } = useAuth();
  const [couponInput, setCouponInput] = useState(appliedCoupon || '');
  const [inputError, setInputError] = useState<string | null>(null);

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  // Authoritative Validation Result from couponService
  const validationResult = React.useMemo(() => {
    if (!appliedCoupon || cart.length === 0) {
      return null;
    }

    const matched = coupons.find(
      c => c.code.trim().toUpperCase() === appliedCoupon.trim().toUpperCase()
    );

    if (!matched) {
      return null;
    }

    return validateAndCalculateCoupon({
      coupon: matched,
      cartItems: cart,
      cartSubtotal: subtotal,
      userId: currentUser?.uid,
      customerPhone: null
    });
  }, [appliedCoupon, coupons, cart, subtotal, currentUser]);

  // If applied coupon becomes invalid after cart changes (e.g. target item removed, quantity dropped below minimum)
  useEffect(() => {
    if (appliedCoupon && cart.length > 0) {
      if (validationResult && !validationResult.isValid) {
        setInputError(validationResult.errorMessage || 'Coupon is no longer applicable to your cart.');
        setAppliedCoupon('');
        if (onRemoveCoupon) {
          onRemoveCoupon();
        } else {
          onApplyCoupon('');
        }
      }
    }
  }, [appliedCoupon, cart, validationResult, setAppliedCoupon, onRemoveCoupon, onApplyCoupon]);

  // Synchronize local input field when applied coupon is cleared externally
  useEffect(() => {
    if (!appliedCoupon) {
      setCouponInput('');
    }
  }, [appliedCoupon]);

  // Authoritative Coupon State
  const isCouponValid = Boolean(validationResult && validationResult.isValid);
  const effectiveDiscount = isCouponValid ? (validationResult?.discountAmount ?? 0) : 0;
  const isCouponFreeShipping = isCouponValid && validationResult?.isFreeShipping === true;

  // Dynamic standard delivery rate from Admin Firestore StoreSettings (Defaulting to inside Dhaka rate for cart estimate)
  const defaultEstimatedShipping = typeof storeSettings?.shippingInsideDhaka === 'number' ? storeSettings.shippingInsideDhaka : 80;

  // Combined Shipping Rule: Coupon Free Delivery OR default delivery rate
  const isFreeDeliveryApplied = isCouponFreeShipping || parentIsFreeShipping;
  
  // Shipping Charge (Empty cart does not artificially activate free delivery)
  const shipping = isFreeDeliveryApplied ? 0 : defaultEstimatedShipping;
  const grandTotal = Math.max(0, subtotal - effectiveDiscount + shipping);

  const handleCouponSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setInputError(null);
    const cleaned = couponInput.trim().toUpperCase();
    if (!cleaned) {
      setInputError('Please enter a coupon code.');
      return;
    }

    const targetCoupon = coupons.find(
      c => c.code.trim().toUpperCase() === cleaned
    );

    if (!targetCoupon) {
      setInputError(`Coupon code "${cleaned}" is not valid.`);
      setAppliedCoupon('');
      if (onRemoveCoupon) {
        onRemoveCoupon();
      } else {
        onApplyCoupon('');
      }
      return;
    }

    const testValidation = validateAndCalculateCoupon({
      coupon: targetCoupon,
      cartItems: cart,
      cartSubtotal: subtotal,
      userId: currentUser?.uid,
      customerPhone: null
    });

    if (!testValidation.isValid) {
      setInputError(testValidation.errorMessage || 'This coupon is not valid for your current cart.');
      setAppliedCoupon('');
      if (onRemoveCoupon) {
        onRemoveCoupon();
      } else {
        onApplyCoupon('');
      }
      return;
    }

    // Only apply when validation strictly passes
    setAppliedCoupon(cleaned);
    onApplyCoupon(cleaned);
  };

  const handleRemoveAppliedCoupon = () => {
    setCouponInput('');
    setInputError(null);
    setAppliedCoupon('');
    if (onRemoveCoupon) {
      onRemoveCoupon();
    } else {
      onApplyCoupon('');
    }
  };

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#EFE8DE] mb-6">
        <div>
          <h2 className="text-2xl font-serif font-bold text-[#4A1525]">Your Cart</h2>
          <p className="text-xs text-slate-500 mt-0.5">({cart.reduce((a, b) => a + b.quantity, 0)} items in cart)</p>
        </div>
      </div>

      {cart.length > 0 ? (
        <div className="grid md:grid-cols-3 gap-6">
          
          {/* Cart Items List */}
          <div className="md:col-span-2 space-y-3">
            {cart.map((item, index) => (
              <div 
                key={`cart-page-item-${item.product.id}-${item.selectedFinish || ''}-${item.selectedSize || ''}-${index}`}
                className="bg-white rounded-xl border border-[#E8DFC2]/80 p-3.5 flex items-center justify-between gap-3 shadow-xs"
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <img 
                    src={item.product.image} 
                    alt={item.product.name} 
                    className="w-16 h-16 object-cover rounded-lg border border-slate-100 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-xs sm:text-sm text-slate-900 line-clamp-1">
                      {item.product.name}
                    </h3>
                    <p className="font-bold text-xs text-[#4A1525] mt-1">
                      ৳ {item.product.price.toLocaleString()}
                    </p>

                    {/* Quantity Selector */}
                    <div className="flex items-center space-x-2 mt-2">
                      <div className="flex items-center border border-slate-200 rounded-lg bg-[#FAF7F2]">
                        <button 
                          onClick={() => onUpdateQuantity(item.product.id, -1)}
                          className="px-2 py-0.5 text-slate-600 hover:text-[#4A1525] transition"
                          title="Decrease quantity"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="px-2 text-xs font-bold">{item.quantity}</span>
                        <button 
                          onClick={() => onUpdateQuantity(item.product.id, 1)}
                          className="px-2 py-0.5 text-slate-600 hover:text-[#4A1525] transition"
                          title="Increase quantity"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-right flex flex-col items-end justify-between self-stretch">
                  <button 
                    onClick={() => onRemoveItem(item.product.id)}
                    className="text-slate-400 hover:text-red-600 p-1 transition"
                    title="Remove item"
                  >
                    <Trash2 size={16} />
                  </button>
                  <p className="font-bold text-xs sm:text-sm text-[#4A1525]">
                    ৳ {(item.product.price * item.quantity).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}

            {/* Order Note Field */}
            <div className="bg-white rounded-xl border border-[#E8DFC2]/80 p-4">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                📝 Add order note
              </label>
              <textarea 
                value={orderNote}
                onChange={(e) => setOrderNote(e.target.value)}
                placeholder="Special instructions for delivery, gift wrapping, or ring sizing..."
                className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-hidden focus:border-[#4A1525] h-20 resize-none bg-[#FAF7F2]"
              />
            </div>
          </div>

          {/* Cart Order Summary Sidebar */}
          <div className="bg-white rounded-2xl border border-[#E8DFC2] p-5 h-fit space-y-4 shadow-xs">
            <h3 className="font-serif font-bold text-base text-[#4A1525] border-b border-slate-100 pb-2">
              Order Summary
            </h3>

            {/* Coupon Code Entry & Display Section */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-600 flex items-center space-x-1">
                <Tag size={12} className="text-[#4A1525]" />
                <span>Have a Coupon Code?</span>
              </label>

              {appliedCoupon && isCouponValid ? (
                /* Applied Coupon State Badge */
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                      <span className="font-mono font-bold text-xs text-emerald-900 tracking-wide">
                        {appliedCoupon.toUpperCase()}
                      </span>
                      <span className="text-[10px] bg-emerald-200/80 text-emerald-800 font-semibold px-1.5 py-0.2 rounded">
                        Applied
                      </span>
                    </div>
                    <button
                      onClick={handleRemoveAppliedCoupon}
                      className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center space-x-0.5 p-1 transition"
                      title="Remove coupon"
                    >
                      <X size={13} />
                      <span>Remove</span>
                    </button>
                  </div>

                  <div className="text-[11px] text-emerald-700 font-medium space-y-0.5">
                    {effectiveDiscount > 0 && (
                      <p>✓ Savings: <strong>৳ {effectiveDiscount.toLocaleString()} OFF</strong></p>
                    )}
                    {isCouponFreeShipping && (
                      <p className="flex items-center space-x-1 text-emerald-800">
                        <Truck size={12} />
                        <span>✓ Free Delivery applied from coupon</span>
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                /* Coupon Input Form */
                <form onSubmit={handleCouponSubmit} className="space-y-1.5">
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={couponInput}
                      onChange={(e) => {
                        setCouponInput(e.target.value.toUpperCase());
                        setInputError(null);
                      }}
                      placeholder="Enter Coupon Code" 
                      className="flex-1 text-xs border border-slate-200 rounded-lg px-2.5 py-2 uppercase font-mono font-semibold bg-[#FAF7F2] focus:outline-hidden focus:border-[#4A1525]"
                    />
                    <button 
                      type="submit"
                      className="bg-[#4A1525] text-amber-200 text-xs font-bold px-3.5 py-2 rounded-lg hover:bg-[#360F1B] transition shadow-xs shrink-0"
                    >
                      Apply
                    </button>
                  </div>

                  {inputError && (
                    <p className="text-[11px] text-red-600 font-medium">{inputError}</p>
                  )}
                </form>
              )}
            </div>

            {/* Free Delivery Banner (When Coupon provides Free Shipping) */}
            {isCouponFreeShipping && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-2 text-emerald-800 text-xs font-semibold">
                <Truck size={16} className="text-emerald-600 shrink-0" />
                <span>🎉 Free Delivery unlocked with your coupon "{appliedCoupon}"!</span>
              </div>
            )}

            {/* Price Breakdown */}
            <div className="space-y-2 text-xs border-t border-b border-slate-100 py-3">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-bold text-slate-900">৳ {subtotal.toLocaleString()}</span>
              </div>
              
              {effectiveDiscount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span className="flex items-center space-x-1">
                    <Tag size={12} />
                    <span>Coupon Discount ({appliedCoupon})</span>
                  </span>
                  <span className="font-bold">- ৳ {effectiveDiscount.toLocaleString()}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-600">
                <span>Shipping Fee</span>
                <span className="font-bold text-slate-900">
                  {shipping === 0 ? (
                    <span className="text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      FREE (৳0)
                    </span>
                  ) : (
                    `৳ ${shipping.toLocaleString()}`
                  )}
                </span>
              </div>
            </div>

            {/* Grand Total */}
            <div className="flex justify-between items-baseline text-sm font-bold text-[#4A1525]">
              <span>Total Payable</span>
              <span className="text-lg font-mono">৳ {grandTotal.toLocaleString()}</span>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <button 
                onClick={onProceedToCheckout}
                className="w-full bg-[#4A1525] hover:bg-[#360F1B] text-amber-200 text-xs font-bold py-3 rounded-xl shadow-md transition-colors flex items-center justify-center space-x-2"
              >
                <span>PROCEED TO CHECKOUT</span>
                <ArrowRight size={14} />
              </button>

              <button 
                onClick={onContinueShopping}
                className="w-full border border-slate-300 text-slate-700 text-xs font-bold py-2.5 rounded-xl hover:bg-[#FAF7F2] transition-colors"
              >
                CONTINUE SHOPPING
              </button>
            </div>
          </div>

        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-2xl border border-[#EFE8DE] p-8">
          <div className="w-16 h-16 bg-[#FAF7F2] text-[#4A1525] rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingBag size={32} />
          </div>
          <h3 className="font-serif font-bold text-lg text-slate-900">Your Cart is Empty</h3>
          <p className="text-xs text-slate-500 mt-1 mb-6">
            Looks like you haven't added any jewelry to your cart yet.
          </p>
          <button 
            onClick={onContinueShopping}
            className="bg-[#4A1525] text-amber-200 text-xs font-bold px-6 py-3 rounded-full flex items-center space-x-2 mx-auto hover:bg-[#360F1B] transition-colors shadow-sm"
          >
            <span>Start Shopping</span>
            <ArrowRight size={14} />
          </button>
        </div>
      )}

    </main>
  );
};
