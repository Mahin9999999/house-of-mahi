import React, { useState, useEffect, useRef } from 'react';
import { 
  Star, 
  ShieldCheck, 
  ThumbsUp, 
  MessageSquare, 
  CheckCircle2, 
  Filter,
  UserCheck
} from 'lucide-react';
import { Review } from '../types';
import { reviewService } from '../services/reviewService';

interface ProductReviewsProps {
  productId: string;
  initialReviews?: Review[];
  onNavigateToAccountReviews?: () => void;
}

// Module-level stable empty array reference prevents re-instantiating default prop on every render
const EMPTY_INITIAL_REVIEWS: Review[] = [];

export const ProductReviews: React.FC<ProductReviewsProps> = ({
  productId,
  initialReviews = EMPTY_INITIAL_REVIEWS,
  onNavigateToAccountReviews,
}) => {
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedRatingFilter, setSelectedRatingFilter] = useState<number | 'all'>('all');
  const [helpfulLikes, setHelpfulLikes] = useState<{ [key: string]: boolean }>({});

  // Maintain latest initialReviews reference without triggering effect re-execution
  const initialReviewsRef = useRef<Review[]>(initialReviews);
  useEffect(() => {
    initialReviewsRef.current = initialReviews;
  }, [initialReviews]);

  // Real-time Firestore subscription for this product's reviews (keyed strictly by productId)
  useEffect(() => {
    if (!productId) {
      setReviews([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = reviewService.subscribeToProductReviews(productId, (liveReviews) => {
      // Merge live reviews or fallback to approved/initial if none in db
      if (liveReviews && liveReviews.length > 0) {
        setReviews(liveReviews);
      } else if (initialReviewsRef.current && initialReviewsRef.current.length > 0) {
        setReviews(initialReviewsRef.current);
      } else {
        setReviews([]);
      }
      setLoading(false);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [productId]);

  // Compute Review Metrics
  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0
    ? (reviews.reduce((acc, r) => acc + (r.rating || 5), 0) / totalReviews).toFixed(1)
    : '5.0';

  const ratingCounts = {
    5: reviews.filter((r) => r.rating === 5).length,
    4: reviews.filter((r) => r.rating === 4).length,
    3: reviews.filter((r) => r.rating === 3).length,
    2: reviews.filter((r) => r.rating === 2).length,
    1: reviews.filter((r) => r.rating === 1).length,
  };

  // Filtered reviews
  const filteredReviews = selectedRatingFilter === 'all'
    ? reviews
    : reviews.filter((r) => r.rating === selectedRatingFilter);

  const toggleHelpful = (reviewId: string) => {
    setHelpfulLikes((prev) => ({
      ...prev,
      [reviewId]: !prev[reviewId],
    }));
  };

  return (
    <div className="space-y-8" id="product-reviews-section">
      {/* Reviews Summary & Rating Breakdown Header */}
      <div className="bg-[#FAF7F2] rounded-3xl p-6 sm:p-8 border border-[#800020]/10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          
          {/* Left: Overall Score */}
          <div className="md:col-span-4 text-center md:text-left md:border-r md:border-stone-200 md:pr-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#800020]/10 text-[#800020] text-xs font-semibold uppercase tracking-wider mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              Verified Reviews
            </div>
            <div className="flex items-baseline justify-center md:justify-start gap-2">
              <span className="text-4xl sm:text-5xl font-serif font-bold text-stone-900">
                {averageRating}
              </span>
              <span className="text-stone-400 font-serif text-lg">/ 5.0</span>
            </div>
            <div className="flex items-center justify-center md:justify-start gap-1 mt-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-5 h-5 ${
                    star <= Math.round(Number(averageRating))
                      ? 'fill-[#D4AF37] text-[#D4AF37]'
                      : 'text-stone-300'
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-stone-500 mt-2 font-medium">
              Based on {totalReviews} authentic customer rating{totalReviews === 1 ? '' : 's'}
            </p>
          </div>

          {/* Middle: Star Rating Progress Breakdown */}
          <div className="md:col-span-5 space-y-2">
            {[5, 4, 3, 2, 1].map((score) => {
              const count = ratingCounts[score as keyof typeof ratingCounts] || 0;
              const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
              return (
                <button
                  key={score}
                  onClick={() => setSelectedRatingFilter(selectedRatingFilter === score ? 'all' : score)}
                  className={`w-full flex items-center gap-3 text-xs group text-left py-0.5 rounded-lg px-2 transition-colors ${
                    selectedRatingFilter === score ? 'bg-[#800020]/10 font-bold' : 'hover:bg-stone-200/50'
                  }`}
                >
                  <span className="w-12 text-stone-700 font-medium flex items-center gap-1">
                    {score} <Star className="w-3 h-3 fill-[#D4AF37] text-[#D4AF37]" />
                  </span>
                  <div className="flex-1 h-2 bg-stone-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#D4AF37] rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-stone-500 font-mono text-[11px]">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right: Verified Policy info & CTA */}
          <div className="md:col-span-3 text-center md:text-right bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
            <UserCheck className="w-6 h-6 text-[#800020] mx-auto md:ml-auto md:mr-0 mb-2" />
            <h4 className="text-xs font-bold text-stone-900">100% Genuine Feedback</h4>
            <p className="text-[11px] text-stone-500 mt-1 leading-relaxed">
              Reviews can only be submitted by verified customers with confirmed delivered orders.
            </p>
            {onNavigateToAccountReviews && (
              <button
                onClick={onNavigateToAccountReviews}
                className="mt-3 w-full py-2 px-3 bg-[#800020] hover:bg-[#600018] text-white rounded-xl text-xs font-semibold transition-colors shadow-xs"
              >
                Write in Account
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter Chips if reviews exist */}
      {totalReviews > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-stone-100">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-stone-500 font-medium flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Filter:
            </span>
            <button
              onClick={() => setSelectedRatingFilter('all')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedRatingFilter === 'all'
                  ? 'bg-[#800020] text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              All ({totalReviews})
            </button>
            {[5, 4, 3, 2, 1].map((score) => {
              const count = ratingCounts[score as keyof typeof ratingCounts] || 0;
              if (count === 0 && selectedRatingFilter !== score) return null;
              return (
                <button
                  key={score}
                  onClick={() => setSelectedRatingFilter(score)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
                    selectedRatingFilter === score
                      ? 'bg-[#800020] text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  <span>{score}</span>
                  <Star className="w-3 h-3 fill-current" />
                  <span>({count})</span>
                </button>
              );
            })}
          </div>
          <span className="text-xs text-stone-400">
            Showing {filteredReviews.length} of {totalReviews} reviews
          </span>
        </div>
      )}

      {/* Reviews List */}
      {loading ? (
        <div className="py-12 text-center text-stone-400 text-sm">
          Loading customer reviews...
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-3xl border border-stone-200 p-8">
          <div className="w-14 h-14 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-3 text-stone-400">
            <MessageSquare className="w-6 h-6" />
          </div>
          <h4 className="font-serif font-bold text-stone-800 text-base">
            {selectedRatingFilter === 'all' ? 'No Reviews Yet' : `No ${selectedRatingFilter}-Star Reviews Found`}
          </h4>
          <p className="text-stone-500 text-xs mt-1 max-w-sm mx-auto">
            {selectedRatingFilter === 'all'
              ? 'Be the first verified customer to share your experience with this jewellery piece.'
              : 'Try clearing the star filter to see all other reviews.'}
          </p>
          {selectedRatingFilter !== 'all' && (
            <button
              onClick={() => setSelectedRatingFilter('all')}
              className="mt-4 px-4 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl"
            >
              Clear Filter
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReviews.map((review) => (
            <div
              key={review.id}
              className="bg-white rounded-2xl p-5 sm:p-6 border border-stone-200 shadow-xs hover:border-[#800020]/30 transition-all space-y-3"
            >
              {/* Header: User Name, Badge & Date */}
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#800020]/10 border border-[#800020]/20 flex items-center justify-center text-[#800020] font-serif font-bold text-sm">
                    {(review.userName || 'C')[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-serif font-bold text-stone-900 text-sm">
                        {review.userName || 'Customer'}
                      </h4>
                      {review.verifiedPurchase && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Verified Buyer
                        </span>
                      )}
                    </div>
                    {review.orderNumber && (
                      <p className="text-[11px] text-stone-400 mt-0.5">
                        Order #{review.orderNumber}
                      </p>
                    )}
                  </div>
                </div>

                {/* Rating & Date */}
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-3.5 h-3.5 ${
                          star <= (review.rating || 5)
                            ? 'fill-[#D4AF37] text-[#D4AF37]'
                            : 'text-stone-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] text-stone-400 mt-1 font-medium">
                    {review.date || 'Recent'}
                  </span>
                </div>
              </div>

              {/* Comment text */}
              <p className="text-stone-700 text-sm leading-relaxed pl-13">
                "{review.comment}"
              </p>

              {/* Helpful Like Button */}
              <div className="pt-2 pl-13 flex items-center justify-between text-xs text-stone-500">
                <button
                  onClick={() => toggleHelpful(review.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border transition-colors text-xs ${
                    helpfulLikes[review.id]
                      ? 'border-[#800020] text-[#800020] bg-[#800020]/5 font-semibold'
                      : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>{helpfulLikes[review.id] ? 'Helpful (1)' : 'Helpful'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
