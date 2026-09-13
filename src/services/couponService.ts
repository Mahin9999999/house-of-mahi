import { Coupon, CouponValidationResult, CartItem } from '../types';

export interface CouponValidationContext {
  coupon: Coupon;
  cartItems: CartItem[];
  cartSubtotal: number;
  userId?: string | null;
  customerPhone?: string | null;
}

/**
 * Pure & Predictable Centralized Validation & Discount Calculation Engine
 * Used across Cart, Checkout, and Admin Simulator.
 */
export function validateAndCalculateCoupon(
  context: CouponValidationContext
): CouponValidationResult {
  const { coupon, cartItems, cartSubtotal, userId, customerPhone } = context;

  // 1. Basic Existence & Active Status
  if (!coupon) {
    return {
      isValid: false,
      errorMessage: 'Invalid coupon code.',
      discountAmount: 0,
      isFreeShipping: false
    };
  }

  if (!coupon.isActive) {
    return {
      isValid: false,
      errorMessage: 'This coupon is currently inactive.',
      discountAmount: 0,
      isFreeShipping: false
    };
  }

  // 2. Date Range Verification
  const now = new Date();

  if (coupon.startDate) {
    const startDate = new Date(coupon.startDate);
    if (!isNaN(startDate.getTime()) && now < startDate) {
      return {
        isValid: false,
        errorMessage: `This coupon offer will start on ${startDate.toLocaleDateString()}.`,
        discountAmount: 0,
        isFreeShipping: false
      };
    }
  }

  const expiryString = coupon.endDate || coupon.expiryDate;
  if (expiryString) {
    const expiryDate = new Date(expiryString);
    // If only YYYY-MM-DD was provided, include through the end of that day
    if (!isNaN(expiryDate.getTime())) {
      if (expiryString.length <= 10) {
        expiryDate.setHours(23, 59, 59, 999);
      }
      if (now > expiryDate) {
        return {
          isValid: false,
          errorMessage: 'This coupon code has expired.',
          discountAmount: 0,
          isFreeShipping: false
        };
      }
    }
  }

  // 3. Global Usage Limit Check
  const effectiveUsageLimit = coupon.globalUsageLimit ?? coupon.usageLimit ?? 0;
  const currentUsageCount = coupon.totalUsedCount ?? coupon.usageCount ?? 0;

  if (effectiveUsageLimit > 0 && currentUsageCount >= effectiveUsageLimit) {
    return {
      isValid: false,
      errorMessage: 'This coupon has reached its maximum usage limit.',
      discountAmount: 0,
      isFreeShipping: false
    };
  }

  // 4. One User = One Successful Use Restriction (Client-side Pre-check)
  const userIdentifier = userId || customerPhone;
  if (userIdentifier && coupon.usedByUsers && Array.isArray(coupon.usedByUsers)) {
    const normalizedIdentifier = userIdentifier.trim().toLowerCase();
    const alreadyUsed = coupon.usedByUsers.some(
      (u) => u && u.trim().toLowerCase() === normalizedIdentifier
    );

    if (alreadyUsed) {
      return {
        isValid: false,
        errorMessage: 'This coupon has already been used by your account.',
        discountAmount: 0,
        isFreeShipping: false
      };
    }
  }

  // 5. Targeted Product / Category Eligibility Verification & Subtotal Calculation
  const applicableType = coupon.applicableType || 'all';
  let eligibleSubtotal = 0;
  let eligibleItemCount = 0;

  if (applicableType === 'single_product') {
    // Single Product: Exactly 1 target product required
    const targetProductIds = (coupon.applicableProductIds || []).map((id) => String(id).trim());
    if (targetProductIds.length === 0) {
      return {
        isValid: false,
        errorMessage: 'Coupon configuration error: No product specified.',
        discountAmount: 0,
        isFreeShipping: false
      };
    }

    const matchingItems = cartItems.filter((item) =>
      targetProductIds.includes(String(item.product.id).trim())
    );

    if (matchingItems.length === 0) {
      return {
        isValid: false,
        errorMessage: 'This coupon is only valid for a specific product not found in your cart.',
        discountAmount: 0,
        isFreeShipping: false
      };
    }

    // Eligible amount is strictly from the designated product
    eligibleSubtotal = matchingItems.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );
    eligibleItemCount = matchingItems.reduce((sum, item) => sum + item.quantity, 0);
  } else if (applicableType === 'multiple_products') {
    // Multiple Products / Bundle: Products specified in applicableProductIds
    const targetProductIds = (coupon.applicableProductIds || []).map((id) => String(id).trim());
    if (targetProductIds.length === 0) {
      return {
        isValid: false,
        errorMessage: 'Coupon configuration error: No products specified for bundle.',
        discountAmount: 0,
        isFreeShipping: false
      };
    }

    // Check if ALL designated target products are in the cart
    const cartProductIds = new Set(cartItems.map((item) => String(item.product.id).trim()));
    const hasAllRequiredProducts = targetProductIds.every((id) =>
      cartProductIds.has(id)
    );

    if (!hasAllRequiredProducts) {
      return {
        isValid: false,
        errorMessage: `This offer requires purchasing all ${targetProductIds.length} designated bundle products together.`,
        discountAmount: 0,
        isFreeShipping: false
      };
    }

    const matchingItems = cartItems.filter((item) =>
      targetProductIds.includes(String(item.product.id).trim())
    );

    eligibleSubtotal = matchingItems.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );
    eligibleItemCount = matchingItems.reduce((sum, item) => sum + item.quantity, 0);
  } else if (applicableType === 'categories') {
    const targetCategoryIds = (coupon.applicableCategoryIds || []).map((c) =>
      String(c).trim().toLowerCase()
    );

    if (targetCategoryIds.length === 0) {
      return {
        isValid: false,
        errorMessage: 'Coupon configuration error: No category specified.',
        discountAmount: 0,
        isFreeShipping: false
      };
    }

    const matchingItems = cartItems.filter((item) =>
      item.product.category && targetCategoryIds.includes(String(item.product.category).trim().toLowerCase())
    );

    if (matchingItems.length === 0) {
      return {
        isValid: false,
        errorMessage: 'This coupon is valid only for specific product categories not in your cart.',
        discountAmount: 0,
        isFreeShipping: false
      };
    }

    eligibleSubtotal = matchingItems.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );
    eligibleItemCount = matchingItems.reduce((sum, item) => sum + item.quantity, 0);
  } else {
    // Entire store ('all')
    eligibleSubtotal = cartSubtotal;
    eligibleItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  }

  // 6. Minimum Order Amount Check (Evaluated against Cart Subtotal)
  const minSpend = coupon.minOrderAmount ?? coupon.minSpend ?? 0;
  if (minSpend > 0 && cartSubtotal < minSpend) {
    return {
      isValid: false,
      errorMessage: `Minimum order amount of ৳${minSpend.toLocaleString()} required for this coupon.`,
      discountAmount: 0,
      isFreeShipping: false
    };
  }

  // 7. Minimum Quantity Check (Evaluated against eligible items for target-specific coupons)
  const minQuantity = coupon.minQuantity ?? 0;
  if (minQuantity > 0) {
    const quantityToCheck = applicableType === 'all' 
      ? cartItems.reduce((sum, item) => sum + item.quantity, 0)
      : eligibleItemCount;

    if (quantityToCheck < minQuantity) {
      return {
        isValid: false,
        errorMessage: `At least ${minQuantity} applicable item(s) are required in your cart to use this coupon.`,
        discountAmount: 0,
        isFreeShipping: false
      };
    }
  }

  // 8. Discount Calculation
  let calculatedDiscount = 0;
  const rawDiscountValue = coupon.discountValue ?? coupon.discountAmount ?? 0;
  const discountType = coupon.discountType || 'fixed';

  if (rawDiscountValue > 0 && eligibleSubtotal > 0) {
    if (discountType === 'percentage') {
      calculatedDiscount = Math.round((eligibleSubtotal * rawDiscountValue) / 100);

      // Enforce max discount cap if defined
      const maxCap = coupon.maxDiscountAmount ?? coupon.maxDiscount;
      if (maxCap && maxCap > 0 && calculatedDiscount > maxCap) {
        calculatedDiscount = maxCap;
      }
    } else {
      // Fixed discount
      calculatedDiscount = Math.round(rawDiscountValue);
    }
  }

  // Safety caps: Discount can never be negative or exceed eligible amount or total cart subtotal
  calculatedDiscount = Math.max(0, calculatedDiscount);
  calculatedDiscount = Math.min(calculatedDiscount, eligibleSubtotal, cartSubtotal);

  // 9. Free shipping reward indicator - Strictly Boolean true check
  const isFreeShipping = coupon.isFreeShipping === true;

  // If coupon has 0 discount amount AND is NOT free shipping, return error
  if (calculatedDiscount <= 0 && !isFreeShipping) {
    return {
      isValid: false,
      errorMessage: 'This coupon provides no valid discount for current cart items.',
      discountAmount: 0,
      isFreeShipping: false
    };
  }

  return {
    isValid: true,
    discountAmount: calculatedDiscount,
    isFreeShipping: isFreeShipping,
    coupon: coupon
  };
}
