import React, { useState, useEffect } from 'react';
import { 
  Star, 
  CheckCircle, 
  PackageCheck, 
  ShoppingBag, 
  Clock, 
  Edit3, 
  X, 
  AlertCircle, 
  ShieldCheck, 
  Loader2,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Order, Review, EligibleReviewProduct } from '../../types';
import { reviewService } from '../../services/reviewService';

interface ProductReviewsTabProps {
  orders: Order[];
  onNavigateToShop?: () => void;
}

export const ProductReviewsTab: React.FC<ProductReviewsTabProps> = ({ 
  orders, 
  onNavigateToShop 
}) => {
  const { currentUser, userProfile } = useAuth();
  const [userReviews, setUserReviews] = useState<Review[]>([]);
  const [eligibleProducts, setEligibleProducts] = useState<EligibleReviewProduct[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Review Modal State
  const [activeModalProduct, setActiveModalProduct] = useState<EligibleReviewProduct | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Compute immutable customer account name
  const customerAccountName = userProfile?.name || currentUser?.displayName || 'Valued Customer';
  const customerAccountEmail = userProfile?.email || currentUser?.email || '';
  const customerAccountPhone = userProfile?.phone || currentUser?.phoneNumber || '';

  // Load reviews and compute eligibility
  const loadReviewsAndEligibility = async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const reviews = await reviewService.getUserReviews(currentUser.uid);
      setUserReviews(reviews);
      const eligible = reviewService.computeEligibleProducts(orders, reviews);
      setEligibleProducts(eligible);
    } catch (error) {
      console.error('Error loading product reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviewsAndEligibility();
  }, [currentUser, orders]);

  // Open modal for new review or editing
  const handleOpenReviewModal = (product: EligibleReviewProduct, editMode = false) => {
    setActiveModalProduct(product);
    setIsEditing(editMode);
    setFormError(null);
    setFormSuccess(null);

    if (editMode && product.review) {
      setRating(product.review.rating || 5);
      setComment(product.review.comment || '');
    } else {
      setRating(5);
      setComment('');
    }
  };

  const handleCloseModal = () => {
    setActiveModalProduct(null);
    setIsEditing(false);
    setFormError(null);
    setFormSuccess(null);
  };

  // Submit review handler
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModalProduct || !currentUser) return;

    if (!comment || comment.trim().length < 5) {
      setFormError('Please write at least 5 characters sharing your genuine feedback.');
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);

      if (isEditing && activeModalProduct.review) {
        const res = await reviewService.updateReview(
          activeModalProduct.review.id,
          rating,
          comment
        );
        if (res.success) {
          setFormSuccess('Review updated successfully!');
          setTimeout(() => {
            handleCloseModal();
            loadReviewsAndEligibility();
          }, 1200);
        } else {
          setFormError(res.message);
        }
      } else {
        const res = await reviewService.submitReview({
          productId: activeModalProduct.productId,
          productName: activeModalProduct.productName,
          productImage: activeModalProduct.productImage,
          userId: currentUser.uid,
          userName: customerAccountName,
          userEmail: customerAccountEmail,
          userPhone: customerAccountPhone,
          orderId: activeModalProduct.orderId,
          orderNumber: activeModalProduct.orderNumber,
          rating,
          comment,
        });

        if (res.success) {
          setFormSuccess('Thank you! Your verified purchase review has been submitted.');
          setTimeout(() => {
            handleCloseModal();
            loadReviewsAndEligibility();
          }, 1400);
        } else {
          setFormError(res.message);
        }
      }
    } catch (err: any) {
      setFormError(err.message || 'An unexpected error occurred while saving your review.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-12 border border-[#800020]/10 shadow-sm flex flex-col items-center justify-center min-h-[350px]">
        <Loader2 className="w-8 h-8 text-[#800020] animate-spin mb-3" />
        <p className="text-stone-500 text-sm font-medium">Checking your purchased items & review eligibility...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#2A0812] to-[#4A0E1E] rounded-2xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-10 pointer-events-none">
          <Star className="w-48 h-48 text-[#D4AF37]" />
        </div>
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] text-xs font-semibold uppercase tracking-wider mb-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            Verified Customer Reviews
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white mb-2">
            Your Product Reviews
          </h2>
          <p className="text-stone-300 text-sm leading-relaxed">
            Only products you have purchased and received (<span className="text-[#D4AF37] font-semibold">Delivered</span>) can be reviewed. Your authentic feedback helps fellow jewellery lovers make confident choices.
          </p>
        </div>
      </div>

      {/* Eligible Products List / Empty State */}
      {eligibleProducts.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 sm:p-14 border border-stone-200 text-center shadow-sm">
          <div className="w-20 h-20 bg-[#800020]/5 rounded-full flex items-center justify-center mx-auto mb-5 text-[#800020]">
            <PackageCheck className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-serif font-bold text-stone-900 mb-2">
            No Products Available for Review
          </h3>
          <p className="text-stone-500 text-sm max-w-md mx-auto mb-6 leading-relaxed">
            Products you purchase and receive will automatically appear here once their order status is marked as <strong className="text-stone-700">Delivered</strong>.
          </p>
          {onNavigateToShop && (
            <button
              onClick={onNavigateToShop}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#800020] hover:bg-[#600018] text-white text-sm font-semibold transition-colors shadow-sm"
            >
              <ShoppingBag className="w-4 h-4" />
              Explore Collections
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {eligibleProducts.map((item) => (
            <div
              key={item.productId}
              className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              {/* Product Info */}
              <div>
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-stone-100 flex-shrink-0 border border-stone-200">
                    <img
                      src={item.productImage || 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&q=80&w=300'}
                      alt={item.productName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 mb-1.5">
                      <CheckCircle className="w-3 h-3" />
                      Delivered • Order #{item.orderNumber}
                    </div>
                    <h4 className="font-serif font-bold text-stone-900 text-base line-clamp-1">
                      {item.productName}
                    </h4>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Price: <span className="font-semibold text-stone-800">৳{item.price.toLocaleString()}</span>
                    </p>
                  </div>
                </div>

                {/* Review status preview */}
                {item.isReviewed && item.review ? (
                  <div className="bg-[#FAF7F2] rounded-xl p-4 border border-[#800020]/10 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              star <= (item.review?.rating || 5)
                                ? 'fill-[#D4AF37] text-[#D4AF37]'
                                : 'text-stone-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-[11px] text-stone-400 font-medium">{item.review.date}</span>
                    </div>
                    <p className="text-xs text-stone-700 italic line-clamp-2">
                      "{item.review.comment}"
                    </p>
                    <div className="mt-2 flex items-center gap-1 text-[11px] text-[#800020] font-medium">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
                      Verified Purchase • {item.review.userName}
                    </div>
                  </div>
                ) : (
                  <div className="bg-stone-50 rounded-xl p-3 border border-dashed border-stone-200 mb-4 flex items-center gap-2 text-xs text-stone-600">
                    <Sparkles className="w-4 h-4 text-[#D4AF37] flex-shrink-0" />
                    <span>You received this item! How was your experience?</span>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="pt-2">
                {item.isReviewed ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 py-2 px-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-semibold border border-emerald-200 text-center flex items-center justify-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                      Review Submitted ✓
                    </div>
                    <button
                      onClick={() => handleOpenReviewModal(item, true)}
                      className="px-3.5 py-2 border border-stone-300 hover:border-[#800020] text-stone-700 hover:text-[#800020] rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5"
                      title="Edit your review"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleOpenReviewModal(item, false)}
                    className="w-full py-2.5 px-4 bg-[#800020] hover:bg-[#600018] text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Star className="w-3.5 h-3.5 fill-[#D4AF37] text-[#D4AF37]" />
                    Write a Review
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Submission / Editing Modal */}
      {activeModalProduct && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-stone-200 relative animate-in fade-in zoom-in duration-200">
            {/* Close Button */}
            <button
              onClick={handleCloseModal}
              disabled={submitting}
              className="absolute top-5 right-5 text-stone-400 hover:text-stone-700 p-1 rounded-full hover:bg-stone-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Title */}
            <div className="mb-5">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#800020] bg-[#800020]/10 px-2.5 py-1 rounded-full">
                {isEditing ? 'Update Review' : 'Verified Product Review'}
              </span>
              <h3 className="text-xl font-serif font-bold text-stone-900 mt-2 line-clamp-1">
                {activeModalProduct.productName}
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Order #{activeModalProduct.orderNumber} • Delivered
              </p>
            </div>

            {/* Error / Success Feedback */}
            {formError && (
              <div className="p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
                <span>{formError}</span>
              </div>
            )}
            {formSuccess && (
              <div className="p-3 mb-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSubmitReview} className="space-y-4">
              {/* Customer Account Name (READ-ONLY / IMMUTABLE) */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Customer Reviewer Name (From Account Profile)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={customerAccountName}
                    readOnly
                    disabled
                    className="w-full px-4 py-2.5 bg-stone-100 border border-stone-200 rounded-xl text-stone-700 text-sm font-medium cursor-not-allowed select-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    Verified Account
                  </span>
                </div>
                <p className="text-[11px] text-stone-400 mt-1">
                  Review will be published under your registered account name.
                </p>
              </div>

              {/* Rating Selector */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Overall Rating <span className="text-[#800020]">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        disabled={submitting}
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 text-stone-300 hover:scale-110 transition-transform focus:outline-hidden"
                      >
                        <Star
                          className={`w-7 h-7 ${
                            star <= (hoverRating || rating)
                              ? 'fill-[#D4AF37] text-[#D4AF37]'
                              : 'text-stone-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <span className="text-xs font-semibold text-stone-700 ml-2">
                    {rating === 5 && '★★★★★ Excellent'}
                    {rating === 4 && '★★★★☆ Very Good'}
                    {rating === 3 && '★★★☆☆ Average'}
                    {rating === 2 && '★★☆☆☆ Fair'}
                    {rating === 1 && '★☆☆☆☆ Poor'}
                  </span>
                </div>
              </div>

              {/* Review Textarea */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Your Genuine Review <span className="text-[#800020]">*</span>
                </label>
                <textarea
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  disabled={submitting}
                  placeholder="Share details about the quality, finishing, weight, and your styling experience with this piece..."
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-[#800020] focus:ring-1 focus:ring-[#800020] text-sm text-stone-800 placeholder-stone-400 resize-none transition-all"
                  required
                />
                <p className="text-[11px] text-stone-400 mt-1">Minimum 5 characters.</p>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-[#800020] hover:bg-[#600018] text-white text-xs font-semibold transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {isEditing ? 'Update Review' : 'Submit Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
