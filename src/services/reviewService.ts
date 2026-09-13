import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  where, 
  onSnapshot, 
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Review, Order } from '../types';

export interface SubmitReviewParams {
  productId: string;
  productName: string;
  productImage: string;
  userId: string;
  userName: string;
  userEmail?: string;
  userPhone?: string;
  orderId?: string;
  orderNumber: string;
  rating: number;
  comment: string;
}

export interface EligibleReviewProduct {
  orderId: string;
  orderNumber: string;
  orderDate?: string;
  deliveredDate?: string;
  productId: string;
  productName: string;
  productImage: string;
  price: number;
  productPrice?: number;
  productCategory?: string;
  hasReviewed: boolean;
  isReviewed?: boolean;
  review?: Review;
}

export const reviewService = {
  /**
   * Real-time listener for reviews belonging to a single product.
   * Uses client-side sorting to eliminate the need for Firestore composite indexes.
   */
  subscribeToProductReviews: (
    productId: string,
    callback: (reviews: Review[]) => void
  ) => {
    try {
      const reviewsRef = collection(db, 'reviews');
      const q = query(
        reviewsRef,
        where('productId', '==', productId)
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const reviews: Review[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            reviews.push({
              id: docSnap.id,
              productId: data.productId,
              productName: data.productName,
              productImage: data.productImage,
              userId: data.userId,
              userName: data.userName,
              userEmail: data.userEmail,
              userPhone: data.userPhone,
              orderNumber: data.orderNumber,
              rating: data.rating,
              date: data.date,
              comment: data.comment,
              verifiedPurchase: data.verifiedPurchase ?? true,
              status: data.status || 'approved',
              createdAt: data.createdAt
            } as Review);
          });

          // Sort client-side by date / timestamp descending
          reviews.sort((a, b) => {
            const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.date || 0).getTime();
            const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.date || 0).getTime();
            return timeB - timeA;
          });

          callback(reviews);
        },
        (error) => {
          console.error('Error in review real-time subscription:', error);
          callback([]);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error('Failed to set up product reviews listener:', error);
      callback([]);
      return () => {};
    }
  },

  /**
   * Real-time listener for all reviews (Used by Admin Panel).
   */
  subscribeToAllReviews: (callback: (reviews: Review[]) => void) => {
    try {
      const reviewsRef = collection(db, 'reviews');
      const unsubscribe = onSnapshot(
        reviewsRef,
        (snapshot) => {
          const reviews: Review[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            reviews.push({
              id: docSnap.id,
              productId: data.productId,
              productName: data.productName,
              productImage: data.productImage,
              userId: data.userId,
              userName: data.userName,
              userEmail: data.userEmail,
              userPhone: data.userPhone,
              orderNumber: data.orderNumber,
              rating: data.rating,
              date: data.date,
              comment: data.comment,
              verifiedPurchase: data.verifiedPurchase ?? true,
              status: data.status || 'approved',
              createdAt: data.createdAt
            } as Review);
          });

          // Sort client-side by newest first
          reviews.sort((a, b) => {
            const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.date || 0).getTime();
            const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.date || 0).getTime();
            return timeB - timeA;
          });

          callback(reviews);
        },
        (error) => {
          console.error('Error fetching all reviews:', error);
          callback([]);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error('Failed to set up all reviews listener:', error);
      callback([]);
      return () => {};
    }
  },

  /**
   * Fetch all reviews written by a specific user.
   */
  getUserReviews: async (userId: string): Promise<Review[]> => {
    if (!userId) return [];
    try {
      const reviewsRef = collection(db, 'reviews');
      const q = query(reviewsRef, where('userId', '==', userId));
      const snap = await getDocs(q);
      const reviews: Review[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        reviews.push({
          id: docSnap.id,
          productId: data.productId,
          productName: data.productName,
          productImage: data.productImage,
          userId: data.userId,
          userName: data.userName,
          userEmail: data.userEmail,
          userPhone: data.userPhone,
          orderNumber: data.orderNumber,
          rating: data.rating,
          date: data.date,
          comment: data.comment,
          verifiedPurchase: data.verifiedPurchase ?? true,
          status: data.status || 'approved',
          createdAt: data.createdAt
        } as Review);
      });

      // Sort client-side descending
      reviews.sort((a, b) => {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.date || 0).getTime();
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.date || 0).getTime();
        return timeB - timeA;
      });

      return reviews;
    } catch (error) {
      console.error('Error fetching user reviews:', error);
      return [];
    }
  },

  /**
   * Computes which products from delivered orders are eligible for review.
   */
  computeEligibleProducts: (orders: Order[], userReviews: Review[]): EligibleReviewProduct[] => {
    const list: EligibleReviewProduct[] = [];
    const reviewMap = new Map<string, Review>();
    userReviews.forEach((r) => {
      if (r.productId) {
        reviewMap.set(r.productId, r);
      }
    });

    orders.forEach((ord) => {
      const status = (ord.status || '').toLowerCase();
      const isDelivered = status === 'delivered' || status === 'completed';
      if (!isDelivered) return;

      const orderNumber = ord.id ? (ord.id.startsWith('HOM-') || ord.id.startsWith('ORD-') ? ord.id : `ORD-${ord.id.slice(-6).toUpperCase()}`) : 'ORD-DELIVERED';
      const orderDate = ord.createdAt?.toDate 
        ? ord.createdAt.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) 
        : (ord.createdAt ? new Date(ord.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Recent');

      ord.items?.forEach((item) => {
        const p = item.product;
        if (!p || !p.id) return;

        const existingReview = reviewMap.get(p.id);
        const alreadyAdded = list.some((x) => x.productId === p.id);
        if (!alreadyAdded) {
          const hasReviewed = !!existingReview;
          const numPrice = typeof p.price === 'number' ? p.price : (Number(p.price) || 0);
          list.push({
            orderId: ord.id || '',
            orderNumber,
            orderDate,
            deliveredDate: orderDate,
            productId: p.id,
            productName: p.name || 'Product',
            productImage: p.image || '',
            price: numPrice,
            productPrice: numPrice,
            productCategory: p.categoryLabel || '',
            hasReviewed,
            isReviewed: hasReviewed,
            review: existingReview
          });
        }
      });
    });

    return list;
  },

  /**
   * Validates whether a customer has a delivered order containing the product.
   */
  verifyDeliveredPurchase: async (
    userId: string, 
    userPhone: string | undefined, 
    userEmail: string | undefined, 
    productId: string,
    orderNumber?: string
  ): Promise<{ isValid: boolean; orderId?: string }> => {
    try {
      // 1. Search directly by orderNumber if provided
      if (orderNumber) {
        const orderRef = doc(db, 'orders', orderNumber);
        const orderSnap = await getDoc(orderRef);
        if (orderSnap.exists()) {
          const orderData = orderSnap.data() as Order;
          const status = (orderData.status || '').toLowerCase();
          const isDelivered = status === 'delivered' || status === 'completed';
          const containsProduct = orderData.items?.some((item) => item.product.id === productId);

          if (isDelivered && containsProduct) {
            return { isValid: true, orderId: orderSnap.id };
          }
        }
      }

      // 2. Query user orders by userId
      if (userId && userId !== 'guest') {
        const ordersRef = collection(db, 'orders');
        const q = query(ordersRef, where('userId', '==', userId));
        const snap = await getDocs(q);

        for (const docSnap of snap.docs) {
          const orderData = docSnap.data() as Order;
          const status = (orderData.status || '').toLowerCase();
          const isDelivered = status === 'delivered' || status === 'completed';
          const containsProduct = orderData.items?.some((item) => item.product.id === productId);

          if (isDelivered && containsProduct) {
            return { isValid: true, orderId: docSnap.id };
          }
        }
      }

      // 3. Fallback check by phone number
      if (userPhone && userPhone.length >= 11) {
        const cleanPhone = userPhone.replace(/\D/g, '').slice(-11);
        const ordersRef = collection(db, 'orders');
        const q = query(ordersRef, where('shippingAddress.phone', '==', cleanPhone));
        const snap = await getDocs(q);

        for (const docSnap of snap.docs) {
          const orderData = docSnap.data() as Order;
          const status = (orderData.status || '').toLowerCase();
          const isDelivered = status === 'delivered' || status === 'completed';
          const containsProduct = orderData.items?.some((item) => item.product.id === productId);

          if (isDelivered && containsProduct) {
            return { isValid: true, orderId: docSnap.id };
          }
        }
      }

      return { isValid: false };
    } catch (error) {
      console.error('Error verifying purchase:', error);
      return { isValid: false };
    }
  },

  /**
   * Submit a verified customer review.
   */
  submitReview: async (params: SubmitReviewParams): Promise<{ success: boolean; message: string; review?: Review }> => {
    try {
      const reviewDocId = `rev_${params.productId}_${params.userId}_${Date.now()}`;
      const reviewRef = doc(db, 'reviews', reviewDocId);

      const formattedDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

      const newReview: Review = {
        id: reviewDocId,
        productId: params.productId,
        productName: params.productName,
        productImage: params.productImage,
        userId: params.userId,
        userName: params.userName,
        userEmail: params.userEmail,
        userPhone: params.userPhone,
        orderNumber: params.orderNumber,
        rating: params.rating,
        date: formattedDate,
        comment: params.comment,
        verifiedPurchase: true,
        status: 'approved'
      };

      await setDoc(reviewRef, {
        ...newReview,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return {
        success: true,
        message: 'Thank you! Your verified review has been published successfully.',
        review: newReview
      };
    } catch (error: any) {
      console.error('Error submitting review:', error);
      return {
        success: false,
        message: error.message || 'Failed to submit review. Please try again.'
      };
    }
  },

  /**
   * Update existing customer review.
   */
  updateReview: async (reviewId: string, rating: number, comment: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const reviewRef = doc(db, 'reviews', reviewId);
      await updateDoc(reviewRef, {
        rating,
        comment,
        updatedAt: serverTimestamp()
      });
      return { success: true, message: 'Review updated successfully' };
    } catch (error: any) {
      console.error('Error updating review:', error);
      return { success: false, message: error.message || 'Failed to update review' };
    }
  },

  /**
   * Update review status (Moderation: 'approved' | 'rejected')
   */
  updateReviewStatus: async (reviewId: string, status: 'approved' | 'rejected') => {
    try {
      const reviewRef = doc(db, 'reviews', reviewId);
      await updateDoc(reviewRef, {
        status,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating review status:', error);
      throw error;
    }
  },

  /**
   * Permanently delete a review document
   */
  deleteReview: async (reviewId: string) => {
    try {
      const reviewRef = doc(db, 'reviews', reviewId);
      await deleteDoc(reviewRef);
      return { success: true };
    } catch (error) {
      console.error('Error deleting review:', error);
      throw error;
    }
  }
};
