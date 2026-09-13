import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  CheckCircle2, 
  Truck, 
  ShieldCheck, 
  CreditCard, 
  ArrowRight, 
  Loader2, 
  Smartphone, 
  Building2, 
  AlertCircle,
  Copy,
  Check,
  Lock,
  Tag,
  Sparkles,
  Plus,
  Minus,
  ShoppingBag
} from 'lucide-react';
import { CartItem, UserProfile, PaymentMethodConfig, PaymentGatewayType, Coupon } from '../types';
import { trackingService } from '../services/trackingService';
import { paymentService, DEFAULT_PAYMENT_METHODS } from '../services/paymentService';
import { useAdminStore } from '../store/useAdminStore';
import { useAuth } from '../context/AuthContext';
import { validateAndCalculateCoupon } from '../services/couponService';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  userProfile: UserProfile;
  subtotal: number;
  couponDiscount: number;
  appliedCoupon?: string;
  isFreeShipping?: boolean;
  onApplyCoupon?: (code?: string) => void;
  onRemoveCoupon?: () => void;
  onUpdateQuantity?: (productId: string, delta: number) => void;
  onSetItemQuantity?: (productId: string, quantity: number) => void;
  onOrderComplete: (
    orderId: string, 
    grandTotal: number, 
    paymentData?: { 
      method: PaymentGatewayType | string; 
      paymentStatus: 'unpaid' | 'paid' | 'pending_verification'; 
      transactionId?: string; 
      gatewayPaymentId?: string;
      senderNumber?: string;
      customerPhone?: string;
      couponCode?: string;
      customerInfo?: {
        name: string;
        phone: string;
        email?: string;
        address: string;
        district: string;
        thana: string;
        note?: string;
      };
      items?: CartItem[];
      subtotal?: number;
      shippingCharge?: number;
      discount?: number;
      total?: number;
    }
  ) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  cart: initialCart,
  userProfile,
  subtotal: initialSubtotal,
  couponDiscount: initialCouponDiscount,
  appliedCoupon: initialAppliedCoupon = '',
  isFreeShipping: initialIsFreeShipping = false,
  onApplyCoupon,
  onRemoveCoupon,
  onUpdateQuantity,
  onSetItemQuantity,
  onOrderComplete
}) => {
  if (!isOpen) return null;

  const { coupons, storeSettings } = useAdminStore();
  const { currentUser } = useAuth();

  // Local synchronized cart state for immediate interactive quantity editing within Checkout
  const [localCart, setLocalCart] = useState<CartItem[]>(initialCart);

  // Synchronize when parent cart changes
  useEffect(() => {
    setLocalCart(initialCart);
  }, [initialCart]);

  // Customer Delivery Info State (Initialized with userProfile, but edits are live snapshot)
  const [form, setForm] = useState({
    name: userProfile.name || '',
    phone: userProfile.phone || '',
    email: userProfile.email || '',
    address: userProfile.address || '',
    district: userProfile.district || 'Dhaka',
    thana: userProfile.thana || '',
    note: ''
  });

  // Handle local quantity change with robust bounds check (1 to 99)
  const handleQuantityChange = (productId: string, newQty: number) => {
    const validQty = Math.max(1, Math.min(99, Math.floor(newQty) || 1));
    
    // Update local state immediately for instant responsive feedback
    setLocalCart(prev =>
      prev.map(item =>
        item.product.id === productId ? { ...item, quantity: validQty } : item
      )
    );

    // Sync with parent App.tsx cart state
    if (onSetItemQuantity) {
      onSetItemQuantity(productId, validQty);
    } else if (onUpdateQuantity) {
      const currentItem = localCart.find(item => item.product.id === productId);
      if (currentItem) {
        const delta = validQty - currentItem.quantity;
        if (delta !== 0) {
          onUpdateQuantity(productId, delta);
        }
      }
    }
  };

  // Quantity input text change handler (safe integer extraction)
  const handleQuantityInputChange = (productId: string, rawValue: string) => {
    const cleanNum = parseInt(rawValue.replace(/\D/g, ''), 10);
    if (!isNaN(cleanNum) && cleanNum > 0) {
      handleQuantityChange(productId, cleanNum);
    } else if (rawValue === '') {
      // Temporarily allow typing or fallback safely to 1
      handleQuantityChange(productId, 1);
    }
  };

  // Live active items and subtotal
  const effectiveCart = localCart;
  const computedSubtotal = useMemo(() => {
    return effectiveCart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  }, [effectiveCart]);

  // Dynamic Payment Methods State from Firestore
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodConfig[]>(DEFAULT_PAYMENT_METHODS);
  const [selectedMethodId, setSelectedMethodId] = useState<string>('cod');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Manual MFS Input States (for customer TrxID and Sender Number)
  const [manualTrxId, setManualTrxId] = useState<string>('');
  const [manualSenderNumber, setManualSenderNumber] = useState<string>('');
  const [copiedAccount, setCopiedAccount] = useState<boolean>(false);

  // Coupon State within Checkout Modal
  const [couponCodeInput, setCouponCodeInput] = useState<string>(initialAppliedCoupon || '');
  const [activeCouponCode, setActiveCouponCode] = useState<string>(initialAppliedCoupon || '');
  const [couponError, setCouponError] = useState<string | null>(null);

  // Compute Authoritative Coupon Validation Result using couponService
  const validationResult = useMemo(() => {
    if (!activeCouponCode || effectiveCart.length === 0) {
      return null;
    }

    const matched = coupons.find(
      c => c.code.trim().toUpperCase() === activeCouponCode.trim().toUpperCase()
    );

    if (!matched) {
      return null;
    }

    return validateAndCalculateCoupon({
      coupon: matched,
      cartItems: effectiveCart,
      cartSubtotal: computedSubtotal,
      userId: currentUser?.uid,
      customerPhone: form.phone.trim() || userProfile.phone
    });
  }, [activeCouponCode, coupons, effectiveCart, computedSubtotal, currentUser, form.phone, userProfile.phone]);

  // Synchronize state when initialAppliedCoupon changes from parent
  useEffect(() => {
    if (initialAppliedCoupon) {
      setActiveCouponCode(initialAppliedCoupon);
      setCouponCodeInput(initialAppliedCoupon);
    } else {
      setActiveCouponCode('');
      setCouponCodeInput('');
    }
  }, [initialAppliedCoupon]);

  // If active coupon becomes invalid (e.g. phone entered indicates coupon already used or cart items changed)
  useEffect(() => {
    if (activeCouponCode && effectiveCart.length > 0) {
      if (validationResult && !validationResult.isValid) {
        setCouponError(validationResult.errorMessage || 'Coupon is no longer valid for this order.');
        setActiveCouponCode('');
        setCouponCodeInput('');
        if (onRemoveCoupon) {
          onRemoveCoupon();
        } else if (onApplyCoupon) {
          onApplyCoupon('');
        }
      }
    }
  }, [activeCouponCode, effectiveCart, validationResult, onRemoveCoupon, onApplyCoupon]);

  // Subscribe to real-time Payment Methods configured by Admin
  useEffect(() => {
    let isMounted = true;

    const unsubscribe = paymentService.subscribePaymentMethods((methods) => {
      if (!isMounted) return;
      
      const enabledMethods = (methods && methods.length > 0 ? methods : DEFAULT_PAYMENT_METHODS)
        .filter((m) => m.isEnabled !== false)
        .sort((a, b) => (a.sortOrder ?? a.displayOrder ?? 0) - (b.sortOrder ?? b.displayOrder ?? 0));

      setPaymentMethods(enabledMethods);

      // If currently selected method is disabled or doesn't exist, switch to first available
      setSelectedMethodId((currentId) => {
        const exists = enabledMethods.some((m) => m.id === currentId);
        if (exists) return currentId;
        return enabledMethods.length > 0 ? enabledMethods[0].id : 'cod';
      });
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Compute currently selected payment method config
  const selectedMethodConfig = useMemo(() => {
    return paymentMethods.find((m) => m.id === selectedMethodId) || paymentMethods[0] || DEFAULT_PAYMENT_METHODS[0];
  }, [paymentMethods, selectedMethodId]);

  // Dynamic Authoritative Calculations
  const isCouponValid = Boolean(validationResult && validationResult.isValid);
  const effectiveCouponDiscount = isCouponValid ? (validationResult?.discountAmount ?? 0) : 0;
  const isFreeShippingFromCoupon = isCouponValid && validationResult?.isFreeShipping === true;

  // Dynamic Delivery Rate based on customer's selected zone from Admin Firestore StoreSettings
  const insideDhakaRate = typeof storeSettings?.shippingInsideDhaka === 'number' ? storeSettings.shippingInsideDhaka : 80;
  const outsideDhakaRate = typeof storeSettings?.shippingOutsideDhaka === 'number' ? storeSettings.shippingOutsideDhaka : 150;
  const isInsideDhaka = form.district === 'Dhaka' || (form.district.toLowerCase().includes('dhaka') && !form.district.toLowerCase().includes('outside'));
  const baseDeliveryCharge = isInsideDhaka ? insideDhakaRate : outsideDhakaRate;
  
  // Shipping Rule: Coupon Free Delivery (if coupon is applied) OR standard zone charge
  const isFreeDeliveryApplied = isFreeShippingFromCoupon || initialIsFreeShipping;
  const shipping = isFreeDeliveryApplied ? 0 : baseDeliveryCharge;
  
  // Optional Gateway Charge calculation if configured in admin
  const gatewayCharge = useMemo(() => {
    if (!selectedMethodConfig) return 0;
    let extra = 0;
    if (selectedMethodConfig.chargePercentage && selectedMethodConfig.chargePercentage > 0) {
      extra += Math.round(((computedSubtotal - effectiveCouponDiscount) * selectedMethodConfig.chargePercentage) / 100);
    }
    if (selectedMethodConfig.fixedCharge && selectedMethodConfig.fixedCharge > 0) {
      extra += selectedMethodConfig.fixedCharge;
    }
    return extra;
  }, [selectedMethodConfig, computedSubtotal, effectiveCouponDiscount]);

  const grandTotal = Math.max(0, computedSubtotal - effectiveCouponDiscount + shipping + gatewayCharge);

  // Copy Account Number Helper
  const handleCopyAccount = (accountNum: string) => {
    if (!accountNum) return;
    navigator.clipboard.writeText(accountNum);
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2500);
  };

  // Helper to determine icon for payment method
  const getMethodIcon = (method: PaymentMethodConfig) => {
    if (method.type === 'cash_on_delivery' || method.provider === 'cod') {
      return <Truck size={18} className="text-[#4A1525]" />;
    }
    if (method.type === 'manual_mfs' || method.provider === 'manual') {
      return <Smartphone size={18} className="text-[#4A1525]" />;
    }
    if (method.provider === 'bkash' || method.provider === 'nagad') {
      return <Smartphone size={18} className="text-[#4A1525]" />;
    }
    if (method.provider === 'sslcommerz' || method.provider === 'card') {
      return <Building2 size={18} className="text-[#4A1525]" />;
    }
    return <CreditCard size={18} className="text-[#4A1525]" />;
  };

  // Apply Coupon Handler in Checkout Modal
  const handleApplyCouponCode = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError(null);
    const cleanedCode = couponCodeInput.trim().toUpperCase();
    if (!cleanedCode) {
      setCouponError('Please enter a coupon code.');
      return;
    }

    const matchedCoupon = coupons.find(
      c => c.code.trim().toUpperCase() === cleanedCode
    );

    if (!matchedCoupon) {
      setCouponError(`Invalid coupon code "${cleanedCode}".`);
      return;
    }

    const res = validateAndCalculateCoupon({
      coupon: matchedCoupon,
      cartItems: effectiveCart,
      cartSubtotal: computedSubtotal,
      userId: currentUser?.uid,
      customerPhone: form.phone.trim() || userProfile.phone
    });

    if (!res.isValid) {
      setCouponError(res.errorMessage || 'Coupon is not applicable to current order.');
      return;
    }

    setActiveCouponCode(matchedCoupon.code);
    if (onApplyCoupon) {
      onApplyCoupon(matchedCoupon.code);
    }
  };

  // Remove Applied Coupon Handler in Checkout Modal
  const handleRemoveCoupon = () => {
    setActiveCouponCode('');
    setCouponCodeInput('');
    setCouponError(null);
    if (onRemoveCoupon) {
      onRemoveCoupon();
    } else if (onApplyCoupon) {
      onApplyCoupon('');
    }
  };

  // Form Submission Handler with Live Customer Information Snapshot
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // 1. Basic customer info validation
    if (!form.name.trim() || !form.phone.trim() || !form.address.trim()) {
      setErrorMsg('Please fill in all required delivery fields (Full Name, Phone Number, and Full Address).');
      return;
    }

    // Validate phone number format (must be standard BD mobile 11 digits)
    const cleanPhone = form.phone.trim().replace(/\D/g, '');
    if (cleanPhone.length < 11) {
      setErrorMsg('Please provide a valid 11-digit Bangladeshi contact phone number (e.g. 017XXXXXXXX).');
      return;
    }

    if (!selectedMethodConfig) {
      setErrorMsg('Please select a valid payment method.');
      return;
    }

    if (effectiveCart.length === 0) {
      setErrorMsg('Your cart is empty. Please add items before checking out.');
      return;
    }

    // 2. FINAL PRE-ORDER COUPON VALIDATION
    if (activeCouponCode) {
      const freshCoupon = coupons.find(
        c => c.code.trim().toUpperCase() === activeCouponCode.trim().toUpperCase()
      );

      if (!freshCoupon) {
        setErrorMsg(`Coupon "${activeCouponCode}" is no longer active or available.`);
        handleRemoveCoupon();
        return;
      }

      const finalValidation = validateAndCalculateCoupon({
        coupon: freshCoupon,
        cartItems: effectiveCart,
        cartSubtotal: computedSubtotal,
        userId: currentUser?.uid,
        customerPhone: form.phone.trim() || userProfile.phone
      });

      if (!finalValidation.isValid) {
        setErrorMsg(`Coupon issue: ${finalValidation.errorMessage || 'This coupon can no longer be applied to your order.'}`);
        handleRemoveCoupon();
        return;
      }
    }

    const generatedOrderId = 'HOM-' + Math.floor(100000 + Math.random() * 900000);
    const isManualMFS = selectedMethodConfig.type === 'manual_mfs' || selectedMethodConfig.provider === 'manual' || !!selectedMethodConfig.accountNumber;
    const isCOD = selectedMethodConfig.type === 'cash_on_delivery' || selectedMethodConfig.provider === 'cod';

    // Authoritative Live Customer Information Snapshot
    const liveCustomerSnapshot = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || userProfile.email || '',
      address: form.address.trim(),
      district: form.district.trim(),
      thana: form.thana.trim(),
      note: form.note.trim()
    };

    // Save live customer info to browser session storage for seamless failover & checkout persistence
    try {
      sessionStorage.setItem('houseofmahi_last_checkout_customer', JSON.stringify(liveCustomerSnapshot));
    } catch (e) {
      // Ignore sessionStorage errors
    }

    // =========================================================================
    // CASE 1: Cash on Delivery (COD)
    // =========================================================================
    if (isCOD) {
      trackingService.trackAddPaymentInfo('Cash on Delivery', grandTotal, effectiveCart);
      onOrderComplete(generatedOrderId, grandTotal, {
        method: 'cod',
        paymentStatus: 'unpaid',
        customerPhone: liveCustomerSnapshot.phone,
        couponCode: isCouponValid ? activeCouponCode : undefined,
        customerInfo: liveCustomerSnapshot,
        items: effectiveCart,
        subtotal: computedSubtotal,
        shippingCharge: shipping,
        discount: effectiveCouponDiscount,
        total: grandTotal
      });
      return;
    }

    // =========================================================================
    // CASE 2: Manual MFS Payment (bKash / Nagad / Rocket Send Money)
    // =========================================================================
    if (isManualMFS) {
      const cleanTrx = manualTrxId.trim();
      const cleanSender = manualSenderNumber.trim();

      // Check required Transaction ID
      if (selectedMethodConfig.requiresTransactionId !== false && !cleanTrx) {
        setErrorMsg(`Transaction ID (TrxID) is required for ${selectedMethodConfig.displayName || selectedMethodConfig.name}. Please send money and enter the TrxID.`);
        return;
      }

      if (cleanTrx && cleanTrx.length < 5) {
        setErrorMsg('Please enter a valid Transaction ID (minimum 5 characters).');
        return;
      }

      // Check required Sender Mobile Number
      if (selectedMethodConfig.requiresSenderNumber !== false && !cleanSender) {
        setErrorMsg('Sender Mobile Number is required so our team can verify your payment.');
        return;
      }

      setIsProcessing(true);
      try {
        trackingService.trackAddPaymentInfo(selectedMethodConfig.displayName || selectedMethodConfig.name, grandTotal, effectiveCart);

        // Submit manual payment submission to Firestore ledger
        const manualResult = await paymentService.submitManualPayment({
          orderId: generatedOrderId,
          orderNumber: generatedOrderId,
          paymentMethodId: selectedMethodConfig.id,
          paymentMethodName: selectedMethodConfig.displayName || selectedMethodConfig.name,
          provider: selectedMethodConfig.provider || 'manual',
          accountNumber: selectedMethodConfig.accountNumber || '',
          amount: grandTotal,
          currency: 'BDT',
          transactionId: cleanTrx,
          senderNumber: cleanSender,
          customerName: liveCustomerSnapshot.name,
          customerPhone: liveCustomerSnapshot.phone,
          customerEmail: liveCustomerSnapshot.email,
          notes: `Customer checkout submission for Order #${generatedOrderId}`
        });

        if (manualResult.success) {
          onOrderComplete(generatedOrderId, grandTotal, {
            method: selectedMethodConfig.provider || 'bkash',
            paymentStatus: 'unpaid',
            transactionId: cleanTrx,
            senderNumber: cleanSender,
            customerPhone: liveCustomerSnapshot.phone,
            couponCode: isCouponValid ? activeCouponCode : undefined,
            customerInfo: liveCustomerSnapshot,
            items: effectiveCart,
            subtotal: computedSubtotal,
            shippingCharge: shipping,
            discount: effectiveCouponDiscount,
            total: grandTotal
          });
        } else {
          setIsProcessing(false);
          setErrorMsg(manualResult.message || 'Could not verify payment submission. Please check your TrxID or try another method.');
        }
      } catch (err: any) {
        console.error('[CheckoutModal] Manual payment error:', err);
        setIsProcessing(false);
        setErrorMsg(err.message || 'An error occurred while submitting payment information. Please try again.');
      }
      return;
    }

    // =========================================================================
    // CASE 3: Automated Payment Gateway (bKash / Nagad / SSLCommerz / Card)
    // =========================================================================
    setIsProcessing(true);
    try {
      trackingService.trackAddPaymentInfo(
        (selectedMethodConfig.displayName || selectedMethodConfig.name).toUpperCase(), 
        grandTotal, 
        effectiveCart
      );

      const targetGateway = (selectedMethodConfig.provider === 'card' 
        ? 'card' 
        : selectedMethodConfig.provider) as PaymentGatewayType;

      const sessionRes = await paymentService.createPaymentSession({
        orderId: generatedOrderId,
        orderNumber: generatedOrderId,
        amount: grandTotal,
        currency: 'BDT',
        paymentMethod: targetGateway,
        customer: {
          name: liveCustomerSnapshot.name,
          phone: liveCustomerSnapshot.phone,
          email: liveCustomerSnapshot.email,
          address: `${liveCustomerSnapshot.address}, ${liveCustomerSnapshot.thana ? liveCustomerSnapshot.thana + ', ' : ''}${liveCustomerSnapshot.district}`
        },
        callbackUrl: window.location.origin + `/api/payment/callback/${targetGateway}`
      });

      if (sessionRes.success && sessionRes.paymentUrl) {
        await paymentService.recordTransaction({
          orderId: generatedOrderId,
          orderNumber: generatedOrderId,
          customerName: liveCustomerSnapshot.name,
          customerPhone: liveCustomerSnapshot.phone,
          customerEmail: liveCustomerSnapshot.email,
          method: targetGateway,
          provider: targetGateway === 'card' ? 'sslcommerz' : targetGateway,
          paymentMethodName: selectedMethodConfig.displayName || selectedMethodConfig.name,
          amount: grandTotal,
          currency: 'BDT',
          status: 'pending',
          gatewayPaymentId: sessionRes.gatewayPaymentId,
          paymentUrl: sessionRes.paymentUrl,
          initiatedAt: new Date().toISOString()
        });

        // Store temporary order state in session for recovery upon gateway return callback
        try {
          sessionStorage.setItem('pending_pgw_order', JSON.stringify({
            orderId: generatedOrderId,
            grandTotal,
            cart: effectiveCart,
            customer: liveCustomerSnapshot,
            paymentMethod: targetGateway,
            paymentMethodName: selectedMethodConfig.displayName || selectedMethodConfig.name,
            gatewayPaymentId: sessionRes.gatewayPaymentId,
            appliedCoupon: isCouponValid ? activeCouponCode : '',
            couponDiscount: effectiveCouponDiscount,
            isFreeShipping: isFreeDeliveryApplied,
            shippingCharge: shipping,
            timestamp: Date.now()
          }));
        } catch (storageErr) {
          console.warn('Session storage write error:', storageErr);
        }

        window.location.href = sessionRes.paymentUrl;
      } else {
        setIsProcessing(false);
        setErrorMsg(
          sessionRes.message || 
          `Unable to initialize ${selectedMethodConfig.displayName || selectedMethodConfig.name}. Please select Cash on Delivery or another payment option.`
        );
      }
    } catch (err: any) {
      console.error('[CheckoutModal] Gateway initiation exception:', err);
      setIsProcessing(false);
      setErrorMsg(err.message || 'An error occurred while connecting to the secure payment gateway.');
    }
  };

  const isSelectedManualMFS = selectedMethodConfig && (
    selectedMethodConfig.type === 'manual_mfs' || 
    selectedMethodConfig.provider === 'manual' || 
    !!selectedMethodConfig.accountNumber
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl sm:rounded-3xl shadow-2xl border border-[#E8DFC2] overflow-hidden my-auto max-h-[96vh] sm:max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header - Mobile Compact & Desktop Rich */}
        <div className="bg-[#4A1525] text-white px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between border-b border-[#5C1B2E] shrink-0">
          <div className="min-w-0 pr-2">
            <h3 className="font-serif font-bold text-base sm:text-xl text-amber-200 truncate">Express Checkout</h3>
            <p className="text-[10px] sm:text-xs text-amber-300/80 truncate">Quick delivery details & order review</p>
          </div>
          <button 
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            aria-label="Close Checkout"
            className="text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors disabled:opacity-50 cursor-pointer shrink-0"
            title="Close Checkout"
          >
            <X size={18} className="sm:w-5 sm:h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-3.5 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto font-sans flex-1 overscroll-contain">
          
          {/* Error Banner */}
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start space-x-2.5 text-xs text-rose-800 animate-in fade-in">
              <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{errorMsg}</div>
            </div>
          )}

          {/* Section 1: Customer Delivery Info */}
          <div className="space-y-3.5">
            <h4 className="font-bold text-xs text-[#4A1525] uppercase tracking-wider flex items-center space-x-1.5 border-b border-stone-100 pb-1.5">
              <Truck size={15} />
              <span>1. Delivery Information (Exact Order Recipient)</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Full Name *</label>
                <input 
                  type="text" 
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Mahin Ahmed"
                  className="w-full px-3.5 py-2.5 border border-stone-200 rounded-xl bg-[#FAF7F2] focus:outline-none focus:ring-2 focus:ring-[#4A1525] text-stone-900"
                  required
                  disabled={isProcessing}
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Phone Number (01XXXXXXXXX) *</label>
                <input 
                  type="tel" 
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="017XXXXXXXX"
                  className="w-full px-3.5 py-2.5 border border-stone-200 rounded-xl bg-[#FAF7F2] focus:outline-none focus:ring-2 focus:ring-[#4A1525] text-stone-900 font-mono"
                  required
                  disabled={isProcessing}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-stone-700 mb-1">Full Delivery Address *</label>
                <input 
                  type="text" 
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="House #, Road #, Area details (e.g. House 12, Road 4, Sector 7, Uttara)"
                  className="w-full px-3.5 py-2.5 border border-stone-200 rounded-xl bg-[#FAF7F2] focus:outline-none focus:ring-2 focus:ring-[#4A1525] text-stone-900"
                  required
                  disabled={isProcessing}
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Delivery Zone / District *</label>
                <select 
                  value={form.district}
                  onChange={(e) => setForm({ ...form, district: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-stone-200 rounded-xl bg-[#FAF7F2] focus:outline-none focus:ring-2 focus:ring-[#4A1525] text-stone-900 font-medium"
                  disabled={isProcessing}
                >
                  <option value="Dhaka">Inside Dhaka (৳ {insideDhakaRate} Delivery Charge)</option>
                  <option value="Outside Dhaka">Outside Dhaka (৳ {outsideDhakaRate} Delivery Charge)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Thana / Area (Optional)</label>
                <input 
                  type="text" 
                  value={form.thana}
                  onChange={(e) => setForm({ ...form, thana: e.target.value })}
                  placeholder="e.g. Dhanmondi, Gulshan, Mirpur"
                  className="w-full px-3.5 py-2.5 border border-stone-200 rounded-xl bg-[#FAF7F2] focus:outline-none focus:ring-2 focus:ring-[#4A1525] text-stone-900"
                  disabled={isProcessing}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-stone-700 mb-1">Delivery Note / Instructions (Optional)</label>
                <input 
                  type="text" 
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="Special instructions for delivery rider (e.g. Please call before delivery)"
                  className="w-full px-3.5 py-2.5 border border-stone-200 rounded-xl bg-[#FAF7F2] focus:outline-none focus:ring-2 focus:ring-[#4A1525] text-stone-900"
                  disabled={isProcessing}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Dynamic Payment Methods Selection */}
          <div className="space-y-3.5 pt-1">
            <div className="flex items-center justify-between border-b border-stone-100 pb-1.5">
              <h4 className="font-bold text-xs text-[#4A1525] uppercase tracking-wider flex items-center space-x-1.5">
                <CreditCard size={15} />
                <span>2. Select Payment Method</span>
              </h4>
              <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <ShieldCheck size={12} /> 100% Encrypted & Safe
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {paymentMethods.map((method) => {
                const isSelected = selectedMethodId === method.id;
                return (
                  <label 
                    key={method.id}
                    className={`p-3.5 rounded-2xl border flex items-start space-x-3 cursor-pointer transition-all ${
                      isSelected 
                        ? 'border-[#4A1525] bg-[#FAF7F2] ring-2 ring-[#4A1525] shadow-xs' 
                        : 'border-stone-200 bg-white hover:border-stone-300'
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="checkoutPaymentMethod" 
                      value={method.id}
                      checked={isSelected} 
                      onChange={() => {
                        setSelectedMethodId(method.id);
                        setErrorMsg(null);
                        trackingService.trackAddPaymentInfo(method.displayName || method.name, grandTotal, effectiveCart);
                      }}
                      disabled={isProcessing}
                      className="accent-[#4A1525] mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5">
                          {getMethodIcon(method)}
                          <p className="font-bold text-stone-900 leading-snug">{method.displayName || method.name}</p>
                        </div>
                        {method.badge && (
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-[#4A1525] border border-amber-200 shrink-0">
                            {method.badge}
                          </span>
                        )}
                      </div>
                      
                      {method.description && (
                        <p className="text-[10px] text-stone-500 mt-1 line-clamp-2 leading-relaxed">
                          {method.description}
                        </p>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>

            {/* Section 2.1: Dynamic Manual MFS Instructions & Input Box */}
            {isSelectedManualMFS && selectedMethodConfig && (
              <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 sm:p-5 space-y-4 animate-in fade-in">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 uppercase tracking-wide">
                      <Smartphone size={15} className="text-amber-800" />
                      <span>{selectedMethodConfig.displayName || selectedMethodConfig.name} Details</span>
                    </div>
                    <p className="text-[11px] text-stone-600 leading-relaxed">
                      {selectedMethodConfig.instructionText || selectedMethodConfig.instructions || `Please Send Money the exact payable amount to our ${selectedMethodConfig.accountType || 'personal'} account number below.`}
                    </p>
                  </div>
                </div>

                {/* Account Number Display with Copy Action */}
                {selectedMethodConfig.accountNumber && (
                  <div className="bg-white p-3 rounded-xl border border-amber-200 flex items-center justify-between shadow-2xs">
                    <div>
                      <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                        {selectedMethodConfig.accountType ? `${selectedMethodConfig.accountType} Number` : 'Receiver Account'}
                      </span>
                      <span className="font-mono text-base font-bold text-stone-900 tracking-wider">
                        {selectedMethodConfig.accountNumber}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyAccount(selectedMethodConfig.accountNumber!)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        copiedAccount 
                          ? 'bg-emerald-600 text-white' 
                          : 'bg-[#4A1525] hover:bg-[#360F1B] text-white'
                      }`}
                    >
                      {copiedAccount ? <Check size={13} /> : <Copy size={13} />}
                      <span>{copiedAccount ? 'Copied!' : 'Copy Number'}</span>
                    </button>
                  </div>
                )}

                {/* TrxID & Sender Number Input Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                  <div>
                    <label className="block font-bold text-stone-800 mb-1">
                      Transaction ID (TrxID) *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 9K28FD4A"
                      value={manualTrxId}
                      onChange={(e) => setManualTrxId(e.target.value.toUpperCase())}
                      className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#4A1525] font-mono font-bold uppercase text-stone-900"
                      required={selectedMethodConfig.requiresTransactionId !== false}
                      disabled={isProcessing}
                    />
                    <span className="text-[10px] text-stone-400 mt-0.5 block">Found in the SMS received after payment</span>
                  </div>

                  <div>
                    <label className="block font-bold text-stone-800 mb-1">
                      Sender Mobile Number *
                    </label>
                    <input
                      type="tel"
                      placeholder="01XXXXXXXXX"
                      value={manualSenderNumber}
                      onChange={(e) => setManualSenderNumber(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#4A1525] font-mono text-stone-900"
                      required={selectedMethodConfig.requiresSenderNumber !== false}
                      disabled={isProcessing}
                    />
                    <span className="text-[10px] text-stone-400 mt-0.5 block">Mobile number from which money was sent</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Coupon Code in Checkout */}
          <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#E8DFC2] space-y-2.5">
            <label className="text-xs font-bold text-stone-800 flex items-center space-x-1.5">
              <Tag size={14} className="text-[#4A1525]" />
              <span>Apply Promo / Coupon Code</span>
            </label>

            {activeCouponCode && isCouponValid ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-1.5">
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                    <span className="font-mono font-bold text-xs text-emerald-950">
                      {activeCouponCode}
                    </span>
                    <span className="text-[10px] bg-emerald-200/80 text-emerald-900 font-semibold px-1.5 py-0.2 rounded">
                      Applied
                    </span>
                  </div>
                  <div className="text-[11px] text-emerald-700 font-medium">
                    {effectiveCouponDiscount > 0 && <span>✓ ৳{effectiveCouponDiscount.toLocaleString()} Discount</span>}
                    {effectiveCouponDiscount > 0 && isFreeShippingFromCoupon && <span> + </span>}
                    {isFreeShippingFromCoupon && <span>✓ Free Delivery</span>}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveCoupon}
                  className="text-xs text-red-600 hover:text-red-800 font-semibold flex items-center space-x-1 p-1 cursor-pointer"
                >
                  <X size={13} />
                  <span>Remove</span>
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCodeInput}
                    onChange={(e) => {
                      setCouponCodeInput(e.target.value.toUpperCase());
                      setCouponError(null);
                    }}
                    placeholder="Enter Coupon Code"
                    className="flex-1 text-xs px-3.5 py-2 uppercase font-mono font-bold border border-stone-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#4A1525]"
                    disabled={isProcessing}
                  />
                  <button
                    type="button"
                    onClick={handleApplyCouponCode}
                    disabled={isProcessing || !couponCodeInput.trim()}
                    className="bg-[#4A1525] text-amber-200 text-xs font-bold px-4 py-2 rounded-xl hover:bg-[#360F1B] transition-colors disabled:opacity-50 shrink-0 cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
                {couponError && (
                  <p className="text-[11px] text-red-600 font-medium">{couponError}</p>
                )}
              </div>
            )}
          </div>

          {/* Section 4: Single Authoritative Order Summary & Items List */}
          <div className="bg-[#FAF7F2] p-3 sm:p-4 md:p-5 rounded-2xl border border-[#E8DFC2] space-y-3 sm:space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-[#E8DFC2] pb-2">
              <h4 className="font-bold text-xs sm:text-sm text-[#4A1525] uppercase tracking-wider flex items-center space-x-1.5">
                <ShoppingBag size={15} className="shrink-0 text-[#4A1525]" />
                <span>Order Summary ({effectiveCart.reduce((sum, i) => sum + i.quantity, 0)} {effectiveCart.reduce((sum, i) => sum + i.quantity, 0) === 1 ? 'pc' : 'pcs'})</span>
              </h4>
              <span className="text-[11px] text-stone-500 font-medium">
                {effectiveCart.length} {effectiveCart.length === 1 ? 'product' : 'products'}
              </span>
            </div>

            {/* Product Item Cards - Completely Mobile-Friendly (320px+) */}
            <div className="space-y-2.5 divide-y divide-[#E8DFC2]/60">
              {effectiveCart.map((item) => {
                const itemSubtotal = item.product.price * item.quantity;
                return (
                  <div 
                    key={`summary-${item.product.id}-${item.selectedFinish || 'default'}-${item.selectedSize || 'default'}`}
                    className="pt-2.5 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3"
                  >
                    {/* Left: Product Thumbnail & Title/Variants */}
                    <div className="flex items-start sm:items-center space-x-2.5 sm:space-x-3 min-w-0 flex-1">
                      <img 
                        src={item.product.image} 
                        alt={item.product.name}
                        referrerPolicy="no-referrer"
                        className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl object-cover border border-stone-200 shrink-0 bg-white shadow-2xs"
                      />
                      <div className="min-w-0 flex-1">
                        <h5 className="font-bold text-stone-900 text-xs sm:text-sm leading-snug break-words">
                          {item.product.name}
                        </h5>
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-stone-600 mt-0.5">
                          <span className="font-medium text-stone-700">Unit: ৳{item.product.price.toLocaleString()}</span>
                          {item.selectedFinish && (
                            <span className="px-1.5 py-0.2 bg-white rounded border border-stone-200 text-[10px] text-stone-700 font-medium">
                              {item.selectedFinish}
                            </span>
                          )}
                          {item.selectedSize && (
                            <span className="px-1.5 py-0.2 bg-white rounded border border-stone-200 text-[10px] text-stone-700 font-medium">
                              {item.selectedSize}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Quantity Stepper & Price Calculation */}
                    <div className="flex items-center justify-between sm:justify-end gap-2.5 sm:gap-3 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                      {/* Quantity Controls (Accessible 32px-36px Touch Target) */}
                      <div className="flex items-center border border-stone-300 rounded-xl bg-white shadow-2xs overflow-hidden">
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(item.product.id, item.quantity - 1)}
                          disabled={item.quantity <= 1 || isProcessing}
                          aria-label={`Decrease quantity of ${item.product.name}`}
                          className="w-8 h-8 flex items-center justify-center text-stone-600 hover:text-stone-900 hover:bg-stone-100 disabled:opacity-35 disabled:hover:bg-transparent transition-colors cursor-pointer"
                          title="Decrease Quantity"
                        >
                          <Minus size={13} />
                        </button>
                        
                        <input
                          type="number"
                          min={1}
                          max={99}
                          value={item.quantity}
                          onChange={(e) => handleQuantityInputChange(item.product.id, e.target.value)}
                          disabled={isProcessing}
                          aria-label={`Quantity for ${item.product.name}`}
                          className="w-10 sm:w-11 h-8 text-center text-xs font-bold text-stone-900 font-mono focus:outline-none border-x border-stone-200 py-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none bg-transparent"
                          title="Type quantity directly"
                        />

                        <button
                          type="button"
                          onClick={() => handleQuantityChange(item.product.id, item.quantity + 1)}
                          disabled={item.quantity >= 99 || isProcessing}
                          aria-label={`Increase quantity of ${item.product.name}`}
                          className="w-8 h-8 flex items-center justify-center text-stone-600 hover:text-stone-900 hover:bg-stone-100 disabled:opacity-35 disabled:hover:bg-transparent transition-colors cursor-pointer"
                          title="Increase Quantity"
                        >
                          <Plus size={13} />
                        </button>
                      </div>

                      {/* Explicit Item Subtotal & Price Math */}
                      <div className="text-right min-w-[80px] sm:min-w-[100px]">
                        <div className="font-bold text-stone-900 font-mono text-xs sm:text-sm">
                          ৳ {itemSubtotal.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-stone-500 font-medium">
                          ৳{item.product.price.toLocaleString()} × {item.quantity} {item.quantity === 1 ? 'pc' : 'pcs'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Financial Breakdown Section */}
            <div className="border-t border-[#E8DFC2] pt-3 space-y-2">
              <div className="flex justify-between text-stone-600">
                <span>Items Subtotal ({effectiveCart.reduce((sum, i) => sum + i.quantity, 0)} pcs):</span>
                <span className="font-bold text-stone-900 font-mono">৳ {computedSubtotal.toLocaleString()}</span>
              </div>
              
              {effectiveCouponDiscount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span className="flex items-center space-x-1">
                    <Tag size={12} className="shrink-0" />
                    <span>Coupon Savings ({activeCouponCode}):</span>
                  </span>
                  <span className="font-bold font-mono">- ৳ {effectiveCouponDiscount.toLocaleString()}</span>
                </div>
              )}

              <div className="flex justify-between text-stone-600">
                <span>Delivery Charge ({form.district === 'Dhaka' ? 'Inside Dhaka' : 'Outside Dhaka'}):</span>
                <span className="font-bold text-stone-900 font-mono">
                  {shipping === 0 ? (
                    <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      FREE (৳0)
                    </span>
                  ) : (
                    `৳ ${shipping}`
                  )}
                </span>
              </div>

              {isFreeShippingFromCoupon && (
                <div className="text-[11px] text-emerald-700 font-medium flex items-center space-x-1">
                  <Sparkles size={13} className="text-emerald-600 shrink-0" />
                  <span>Free delivery applied from coupon "{activeCouponCode}"</span>
                </div>
              )}

              {gatewayCharge > 0 && (
                <div className="flex justify-between text-stone-600">
                  <span>Gateway Processing Fee:</span>
                  <span className="font-bold text-stone-900 font-mono">+ ৳ {gatewayCharge}</span>
                </div>
              )}

              <div className="flex justify-between items-center text-sm font-bold text-[#4A1525] pt-2 border-t border-[#E8DFC2]">
                <span className="text-xs sm:text-sm">Grand Total Payable:</span>
                <span className="text-base sm:text-lg font-serif font-bold text-stone-900">৳ {grandTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Submit Action Button */}
          <button 
            type="submit"
            disabled={isProcessing}
            className="w-full bg-[#4A1525] hover:bg-[#360F1B] active:scale-[0.99] text-white text-xs sm:text-sm font-bold py-3.5 sm:py-4 px-4 rounded-xl sm:rounded-2xl shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-75 disabled:cursor-not-allowed cursor-pointer"
          >
            {isProcessing ? (
              <>
                <Loader2 size={16} className="animate-spin text-amber-300" />
                <span className="truncate">
                  {isSelectedManualMFS 
                    ? 'VERIFYING & RECORDING PAYMENT...' 
                    : 'CONNECTING SECURE GATEWAY...'}
                </span>
              </>
            ) : (
              <>
                <span className="truncate">
                  {selectedMethodConfig.type === 'cash_on_delivery' || selectedMethodConfig.provider === 'cod'
                    ? 'CONFIRM & PLACE ORDER (CASH ON DELIVERY)'
                    : isSelectedManualMFS
                    ? 'SUBMIT MANUAL PAYMENT & CONFIRM ORDER'
                    : `PROCEED TO SECURE ${(selectedMethodConfig.displayName || selectedMethodConfig.name).toUpperCase()}`}
                </span>
                <ArrowRight size={16} className="shrink-0" />
              </>
            )}
          </button>

          <div className="text-center text-[10px] sm:text-[11px] text-stone-400 flex items-center justify-center gap-1.5 pt-0.5 pb-2">
            <Lock size={12} className="text-emerald-700 shrink-0" />
            <span className="truncate">House of Mahi protects your data with SSL 256-bit bank encryption</span>
          </div>

        </form>
      </div>
    </div>
  );
};
