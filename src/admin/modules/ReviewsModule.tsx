import React, { useState, useEffect } from 'react';
import { 
  Star, 
  CheckCircle, 
  XCircle, 
  Trash2, 
  Search, 
  MessageSquare, 
  ShieldCheck, 
  Phone, 
  Mail, 
  Loader2, 
  Eye, 
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { useAdminStore } from '../../store/useAdminStore';
import { Review } from '../../types';
import { reviewService } from '../../services/reviewService';
import { db } from '../../firebase/config';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

interface FlatReviewItem extends Review {
  productId: string;
  productName: string;
  productImage: string;
  productCategory?: string;
}

export const ReviewsModule: React.FC = () => {
  const { products, updateProduct } = useAdminStore();

  const [firestoreReviews, setFirestoreReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [verifiedFilter, setVerifiedFilter] = useState<'all' | 'verified' | 'unverified'>('all');
  
  // Modals & action states
  const [selectedReviewDetails, setSelectedReviewDetails] = useState<FlatReviewItem | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Subscribe to real-time customer reviews from Firestore
  useEffect(() => {
    setLoadingReviews(true);
    const unsubscribe = reviewService.subscribeToAllReviews((reviews) => {
      setFirestoreReviews(reviews || []);
      setLoadingReviews(false);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Merge Firestore reviews with products store reviews
  const allReviews: FlatReviewItem[] = React.useMemo(() => {
    const map = new Map<string, FlatReviewItem>();

    // 1. First add reviews from Firestore
    firestoreReviews.forEach((rev) => {
      const product = products.find((p) => p.id === rev.productId);
      const key = rev.id;
      map.set(key, {
        ...rev,
        productId: rev.productId,
        productName: rev.productName || product?.name || 'Jewellery Product',
        productImage: rev.productImage || product?.image || 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&q=80&w=300',
        productCategory: product?.categoryLabel || 'Jewellery',
      });
    });

    // 2. Add any embedded product reviews from store not in firestore map
    products.forEach((p) => {
      if (p.reviews && p.reviews.length > 0) {
        p.reviews.forEach((r) => {
          const key = r.id;
          if (!map.has(key)) {
            map.set(key, {
              ...r,
              productId: p.id,
              productName: p.name,
              productImage: p.image,
              productCategory: p.categoryLabel,
            });
          }
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      const dateA = new Date(a.date || 0).getTime();
      const dateB = new Date(b.date || 0).getTime();
      return dateB - dateA;
    });
  }, [firestoreReviews, products]);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // Handle status update (Approved / Rejected)
  const handleUpdateStatus = async (productId: string, reviewId: string, newStatus: 'approved' | 'rejected') => {
    try {
      setActionLoadingId(reviewId);
      
      // Update in Firestore
      const reviewRef = doc(db, 'reviews', reviewId);
      await updateDoc(reviewRef, {
        status: newStatus,
        updatedAt: serverTimestamp()
      }).catch((e) => {
        console.warn('Review might only exist locally in product store:', e);
      });

      // Update in product store
      const product = products.find((p) => p.id === productId);
      if (product && product.reviews) {
        const updatedReviews = product.reviews.map((r) =>
          r.id === reviewId ? { ...r, status: newStatus } : r
        );
        const approvedReviews = updatedReviews.filter((r) => r.status === 'approved');
        const newRating = approvedReviews.length > 0
          ? Number((approvedReviews.reduce((sum, r) => sum + r.rating, 0) / approvedReviews.length).toFixed(1))
          : product.rating;

        updateProduct(productId, {
          reviews: updatedReviews,
          rating: newRating,
          reviewsCount: approvedReviews.length
        });
      }

      showToast(`Review status updated to "${newStatus}"`);
    } catch (error) {
      console.error('Error updating review status:', error);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle customer review deletion
  const handleDeleteReview = async (productId: string, reviewId: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this customer review?')) return;

    try {
      setActionLoadingId(reviewId);

      // Delete from Firestore
      await reviewService.deleteReview(reviewId);

      // Delete from product store
      const product = products.find((p) => p.id === productId);
      if (product && product.reviews) {
        const updatedReviews = product.reviews.filter((r) => r.id !== reviewId);
        const approvedReviews = updatedReviews.filter((r) => r.status === 'approved');
        const newRating = approvedReviews.length > 0
          ? Number((approvedReviews.reduce((sum, r) => sum + r.rating, 0) / approvedReviews.length).toFixed(1))
          : 5.0;

        updateProduct(productId, {
          reviews: updatedReviews,
          rating: newRating,
          reviewsCount: approvedReviews.length
        });
      }

      if (selectedReviewDetails?.id === reviewId) {
        setSelectedReviewDetails(null);
      }

      showToast('Review permanently deleted');
    } catch (error) {
      console.error('Error deleting review:', error);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filter reviews
  const filteredReviews = allReviews.filter((r) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      (r.userName || '').toLowerCase().includes(q) ||
      (r.comment || '').toLowerCase().includes(q) ||
      (r.productName || '').toLowerCase().includes(q) ||
      (r.orderNumber || '').toLowerCase().includes(q) ||
      (r.userEmail || '').toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'all' || (r.status || 'approved') === statusFilter;
    const matchesRating = ratingFilter === 'all' || r.rating === Number(ratingFilter);
    const matchesVerified = 
      verifiedFilter === 'all' ||
      (verifiedFilter === 'verified' && r.verifiedPurchase) ||
      (verifiedFilter === 'unverified' && !r.verifiedPurchase);

    return matchesSearch && matchesStatus && matchesRating && matchesVerified;
  });

  const totalReviewsCount = allReviews.length;
  const approvedCount = allReviews.filter((r) => (r.status || 'approved') === 'approved').length;
  const pendingCount = allReviews.filter((r) => r.status === 'pending').length;
  const verifiedCount = allReviews.filter((r) => r.verifiedPurchase).length;
  const catalogAvgRating = totalReviewsCount > 0
    ? (allReviews.reduce((sum, r) => sum + (r.rating || 5), 0) / totalReviewsCount).toFixed(1)
    : '5.0';

  return (
    <div className="space-y-6">
      {/* Toast notification */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-800 text-white px-4 py-3 rounded-xl shadow-lg border border-emerald-600 text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 size={16} className="text-emerald-300" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-4">
        <div>
          <h2 className="text-xl font-serif font-bold text-neutral-900">Product Ratings & Reviews Moderation</h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            View, moderate, approve, or reject genuine customer reviews submitted for delivered orders.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-1.5 shadow-xs">
            <ShieldCheck size={14} className="text-emerald-600" />
            Verified Customer Submissions Only
          </span>
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm">
          <div className="text-[11px] uppercase font-mono text-neutral-500 font-semibold">Total Reviews</div>
          <div className="text-2xl font-bold font-serif text-neutral-900 mt-1 flex items-baseline gap-2">
            <span>{totalReviewsCount}</span>
            <span className="text-xs font-sans text-neutral-400 font-normal">({verifiedCount} verified)</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm">
          <div className="text-[11px] uppercase font-mono text-emerald-700 font-semibold">Published / Live</div>
          <div className="text-2xl font-bold font-serif text-emerald-700 mt-1">{approvedCount}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm">
          <div className="text-[11px] uppercase font-mono text-amber-600 font-semibold">Pending Moderation</div>
          <div className="text-2xl font-bold font-serif text-amber-600 mt-1">{pendingCount}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm">
          <div className="text-[11px] uppercase font-mono text-neutral-500 font-semibold">Average Store Rating</div>
          <div className="text-2xl font-bold font-serif text-[#800020] mt-1 flex items-center gap-1.5">
            <span>{catalogAvgRating}</span>
            <Star size={18} className="fill-[#D4AF37] text-[#D4AF37]" />
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-neutral-50 p-3 rounded-2xl border border-neutral-200">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3 top-2.5 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Reviewer, Product, Order #, or Comment..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-neutral-300 rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-[#800020]"
          />
        </div>

        <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-between sm:justify-end flex-wrap gap-y-2">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="text-xs border border-neutral-300 rounded-xl px-3 py-1.5 bg-white focus:outline-none font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="approved">Approved / Live</option>
            <option value="pending">Pending Moderation</option>
            <option value="rejected">Rejected</option>
          </select>

          {/* Rating filter */}
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            className="text-xs border border-neutral-300 rounded-xl px-3 py-1.5 bg-white focus:outline-none font-medium"
          >
            <option value="all">All Ratings</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
          </select>

          {/* Verified filter */}
          <select
            value={verifiedFilter}
            onChange={(e) => setVerifiedFilter(e.target.value as any)}
            className="text-xs border border-neutral-300 rounded-xl px-3 py-1.5 bg-white focus:outline-none font-medium"
          >
            <option value="all">All Buyers</option>
            <option value="verified">Verified Only</option>
            <option value="unverified">Unverified Only</option>
          </select>
        </div>
      </div>

      {/* Reviews Table */}
      <div className="overflow-x-auto border border-neutral-200 rounded-2xl bg-white shadow-sm">
        {loadingReviews ? (
          <div className="py-16 text-center text-neutral-400 text-xs flex flex-col items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#800020] mb-2" />
            <span>Syncing real-time customer reviews...</span>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50/80 text-neutral-500 uppercase font-mono text-[10px]">
                <th className="py-3.5 px-4">Product</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Rating</th>
                <th className="py-3.5 px-4">Customer Review</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Moderation Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredReviews.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-400">
                    <MessageSquare className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                    <p className="font-medium text-neutral-600">No customer reviews found matching your search or filters.</p>
                  </td>
                </tr>
              ) : (
                filteredReviews.map((rev) => {
                  const isActing = actionLoadingId === rev.id;
                  const isApproved = (rev.status || 'approved') === 'approved';
                  const isRejected = rev.status === 'rejected';
                  const isPending = rev.status === 'pending';

                  return (
                    <tr key={`${rev.productId}-${rev.id}`} className="hover:bg-neutral-50/70 transition-colors">
                      {/* Product Column */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3">
                          <img
                            src={rev.productImage}
                            alt={rev.productName}
                            className="w-10 h-10 rounded-xl object-cover border border-neutral-200 shrink-0"
                          />
                          <div>
                            <div className="font-bold text-neutral-900 line-clamp-1 max-w-[180px]">
                              {rev.productName}
                            </div>
                            <div className="text-[10px] text-neutral-400 font-mono">
                              {rev.productCategory || 'Jewellery'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Reviewer Column */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-neutral-800">{rev.userName}</div>
                        {rev.verifiedPurchase && (
                          <span className="inline-flex items-center space-x-1 text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 mt-0.5">
                            <ShieldCheck size={10} className="text-emerald-600" />
                            <span>Verified Buyer</span>
                          </span>
                        )}
                        {rev.orderNumber && (
                          <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
                            #{rev.orderNumber}
                          </div>
                        )}
                      </td>

                      {/* Rating Column */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              size={13}
                              className={`${
                                star <= rev.rating 
                                  ? 'text-[#D4AF37] fill-[#D4AF37]' 
                                  : 'text-neutral-300'
                              }`}
                            />
                          ))}
                        </div>
                      </td>

                      {/* Comment Column */}
                      <td className="py-3.5 px-4 max-w-xs text-neutral-700">
                        <p className="line-clamp-2 italic">"{rev.comment}"</p>
                      </td>

                      {/* Date Column */}
                      <td className="py-3.5 px-4 font-mono text-neutral-500 text-[11px]">
                        {rev.date || 'Recent'}
                      </td>

                      {/* Status Column */}
                      <td className="py-3.5 px-4">
                        {isApproved && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Live / Approved
                          </span>
                        )}
                        {isPending && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Pending
                          </span>
                        )}
                        {isRejected && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Rejected
                          </span>
                        )}
                      </td>

                      {/* Actions Column */}
                      <td className="py-3.5 px-4 text-right">
                        {isActing ? (
                          <Loader2 size={16} className="animate-spin text-[#800020] ml-auto" />
                        ) : (
                          <div className="flex items-center justify-end space-x-1.5">
                            {/* View details */}
                            <button
                              onClick={() => setSelectedReviewDetails(rev)}
                              className="p-1.5 text-neutral-600 hover:text-[#800020] hover:bg-neutral-100 rounded-lg transition"
                              title="View Full Customer Review Details"
                            >
                              <Eye size={15} />
                            </button>

                            {/* Approve */}
                            {!isApproved && (
                              <button
                                onClick={() => handleUpdateStatus(rev.productId, rev.id, 'approved')}
                                className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                                title="Approve & Publish Review"
                              >
                                <CheckCircle size={16} />
                              </button>
                            )}

                            {/* Reject */}
                            {!isRejected && (
                              <button
                                onClick={() => handleUpdateStatus(rev.productId, rev.id, 'rejected')}
                                className="p-1.5 text-amber-700 hover:bg-amber-50 rounded-lg transition"
                                title="Reject Review"
                              >
                                <XCircle size={16} />
                              </button>
                            )}

                            {/* Delete */}
                            <button
                              onClick={() => handleDeleteReview(rev.productId, rev.id)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Delete Customer Review"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Review Details Modal */}
      {selectedReviewDetails && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-stone-200 relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setSelectedReviewDetails(null)}
              className="absolute top-5 right-5 text-stone-400 hover:text-stone-700 p-1.5 rounded-full hover:bg-stone-100 transition-colors"
            >
              <XCircle className="w-5 h-5" />
            </button>

            <div className="mb-5">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#800020] bg-[#800020]/10 px-2.5 py-1 rounded-full">
                Review Details & Audit Log
              </span>
              <h3 className="text-lg font-serif font-bold text-stone-900 mt-2">
                {selectedReviewDetails.productName}
              </h3>
            </div>

            <div className="space-y-4 text-xs">
              {/* Product preview */}
              <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-2xl border border-stone-200">
                <img
                  src={selectedReviewDetails.productImage}
                  alt={selectedReviewDetails.productName}
                  className="w-12 h-12 rounded-xl object-cover border border-stone-200"
                />
                <div>
                  <p className="font-bold text-stone-900">{selectedReviewDetails.productName}</p>
                  <p className="text-stone-500 font-mono text-[11px]">Product ID: {selectedReviewDetails.productId}</p>
                </div>
              </div>

              {/* Reviewer info */}
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-900 text-sm">{selectedReviewDetails.userName}</span>
                  {selectedReviewDetails.verifiedPurchase && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      Verified Buyer
                    </span>
                  )}
                </div>
                {selectedReviewDetails.userEmail && (
                  <p className="text-stone-600 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-stone-400" />
                    {selectedReviewDetails.userEmail}
                  </p>
                )}
                {selectedReviewDetails.userPhone && (
                  <p className="text-stone-600 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-stone-400" />
                    {selectedReviewDetails.userPhone}
                  </p>
                )}
                {selectedReviewDetails.orderNumber && (
                  <p className="text-stone-600 font-mono text-[11px]">
                    Associated Order: #{selectedReviewDetails.orderNumber}
                  </p>
                )}
              </div>

              {/* Star Rating & Comment */}
              <div className="p-4 bg-[#FAF7F2] rounded-2xl border border-[#800020]/10 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={15}
                        className={`${
                          star <= selectedReviewDetails.rating
                            ? 'text-[#D4AF37] fill-[#D4AF37]'
                            : 'text-stone-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-stone-400 font-medium">{selectedReviewDetails.date}</span>
                </div>
                <p className="text-stone-800 text-sm italic leading-relaxed pt-1">
                  "{selectedReviewDetails.comment}"
                </p>
              </div>

              {/* Action Buttons in Modal */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => handleDeleteReview(selectedReviewDetails.productId, selectedReviewDetails.id)}
                  className="px-4 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl text-xs font-semibold transition"
                >
                  Delete Review
                </button>
                {(selectedReviewDetails.status || 'approved') !== 'approved' && (
                  <button
                    type="button"
                    onClick={() => {
                      handleUpdateStatus(selectedReviewDetails.productId, selectedReviewDetails.id, 'approved');
                      setSelectedReviewDetails(null);
                    }}
                    className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl text-xs font-semibold transition"
                  >
                    Approve Review
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedReviewDetails(null)}
                  className="px-4 py-2 bg-stone-100 text-stone-700 hover:bg-stone-200 rounded-xl text-xs font-semibold transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
