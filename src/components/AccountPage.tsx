import React, { useState, useEffect } from 'react';
import { 
  User, 
  Package, 
  MapPin, 
  Heart, 
  LogOut, 
  ChevronRight, 
  Clock, 
  ShoppingBag, 
  Eye, 
  CheckCircle2, 
  ShieldCheck, 
  Sparkles,
  Phone,
  Mail,
  Edit2,
  Check,
  Star,
  PackageCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Order, AccountTabType, Review } from '../types';
import { db } from '../firebase/config';
import { collection, query, where, onSnapshot, doc, updateDoc, getDocs } from 'firebase/firestore';
import { ProductReviewsTab } from './account/ProductReviewsTab';
import { reviewService } from '../services/reviewService';

interface AccountPageProps {
  onNavigateToShop: () => void;
  onNavigateToWishlist: () => void;
  onTrackOrder: (orderNumber: string) => void;
  initialTab?: AccountTabType;
}

export const AccountPage: React.FC<AccountPageProps> = ({
  onNavigateToShop,
  onNavigateToWishlist,
  onTrackOrder,
  initialTab = 'dashboard'
}) => {
  const { currentUser, userProfile, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<AccountTabType>(initialTab);
  const [orders, setOrders] = useState<Order[]>([]);
  const [userReviews, setUserReviews] = useState<Review[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Editable Profile / Address state
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [addressData, setAddressData] = useState({
    name: '',
    phone: '',
    address: '',
    district: 'Dhaka',
    thana: ''
  });
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressSavedSuccess, setAddressSavedSuccess] = useState(false);

  // Sync initial address data from profile
  useEffect(() => {
    if (userProfile) {
      setAddressData({
        name: userProfile.name || currentUser?.displayName || '',
        phone: userProfile.phone || '',
        address: userProfile.address || '',
        district: userProfile.district || 'Dhaka',
        thana: userProfile.thana || ''
      });
    }
  }, [userProfile, currentUser]);

  // Fetch customer orders in real-time
  useEffect(() => {
    if (!currentUser) return;

    setLoadingOrders(true);
    const ordersRef = collection(db, 'orders');
    
    // Query by userId or customer.email
    const q = query(ordersRef, where('userId', '==', currentUser.uid));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedOrders: Order[] = [];
      snapshot.forEach((doc) => {
        fetchedOrders.push({ id: doc.id, ...doc.data() } as Order);
      });

      // Sort by date descending
      fetchedOrders.sort((a, b) => {
        const dateA = new Date(a.date || a.createdAt?.toDate?.() || 0).getTime();
        const dateB = new Date(b.date || b.createdAt?.toDate?.() || 0).getTime();
        return dateB - dateA;
      });

      setOrders(fetchedOrders);
      setLoadingOrders(false);
    }, (error) => {
      console.error("Error fetching customer orders:", error);
      setLoadingOrders(false);
    });

    // Also fetch user reviews to compute review counters
    reviewService.getUserReviews(currentUser.uid).then((reviews) => {
      setUserReviews(reviews);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setSavingAddress(true);
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        name: addressData.name,
        phone: addressData.phone,
        address: addressData.address,
        district: addressData.district,
        thana: addressData.thana,
        updatedAt: new Date().toISOString()
      });
      setIsEditingAddress(false);
      setAddressSavedSuccess(true);
      setTimeout(() => setAddressSavedSuccess(false), 3000);
    } catch (error) {
      console.error("Error updating address:", error);
    } finally {
      setSavingAddress(false);
    }
  };

  // Compute key order metrics
  const deliveredOrders = orders.filter(o => (o.status || '').toLowerCase() === 'delivered');
  const pendingOrders = orders.filter(o => ['pending', 'processing', 'confirmed', 'shipped', 'out for delivery'].includes((o.status || '').toLowerCase()));
  const eligibleProducts = reviewService.computeEligibleProducts(orders, userReviews);
  const unreviewedEligibleCount = eligibleProducts.filter(p => !p.isReviewed).length;

  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'delivered':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Delivered</span>;
      case 'shipped':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200"><Package className="w-3.5 h-3.5 text-blue-600" /> Shipped</span>;
      case 'processing':
      case 'confirmed':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200"><Clock className="w-3.5 h-3.5 text-amber-600" /> Processing</span>;
      case 'cancelled':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">Cancelled</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-700 border border-stone-200">Pending</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Account Header Banner */}
        <div className="bg-gradient-to-r from-[#800020] via-[#5C0017] to-[#3B000F] rounded-3xl p-5 sm:p-10 text-white shadow-xl mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 sm:gap-6">
            <div className="flex items-center gap-3.5 sm:gap-5 min-w-0 w-full sm:w-auto">
              <div className="w-14 h-14 sm:w-20 sm:h-20 shrink-0 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-inner font-serif text-xl sm:text-2xl font-bold">
                {(userProfile?.name || currentUser?.displayName || 'M')[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <h1 className="text-lg sm:text-3xl font-serif font-bold text-white truncate max-w-full">
                    {userProfile?.name || currentUser?.displayName || 'Valued Customer'}
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] text-[11px] sm:text-xs font-medium shrink-0 whitespace-nowrap">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Verified Customer
                  </span>
                </div>
                <div className="text-stone-300 text-xs sm:text-sm mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="inline-flex items-center gap-1.5 min-w-0">
                    <Mail className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    <span className="truncate max-w-[200px] sm:max-w-none">{currentUser?.email || 'Registered via Phone'}</span>
                  </span>
                  {userProfile?.phone && (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="text-stone-500 hidden sm:inline">•</span>
                      <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span>{userProfile.phone}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <button
              onClick={() => logout()}
              className="w-full sm:w-auto justify-center px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-stone-200 hover:text-white border border-white/10 text-xs font-semibold flex items-center gap-2 transition-all shrink-0"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Navigation Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl p-4 shadow-sm border border-stone-200/80 sticky top-24">
              <nav className="space-y-1.5">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-medium transition-all ${
                    activeTab === 'dashboard'
                      ? 'bg-[#800020] text-white shadow-md shadow-[#800020]/10 font-semibold'
                      : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4" />
                    <span>Dashboard</span>
                  </div>
                  <ChevronRight className={`w-4 h-4 ${activeTab === 'dashboard' ? 'opacity-100' : 'opacity-40'}`} />
                </button>

                <button
                  onClick={() => setActiveTab('orders')}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-medium transition-all ${
                    activeTab === 'orders'
                      ? 'bg-[#800020] text-white shadow-md shadow-[#800020]/10 font-semibold'
                      : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Package className="w-4 h-4" />
                    <span>My Orders</span>
                  </div>
                  {orders.length > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      activeTab === 'orders' ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-700'
                    }`}>
                      {orders.length}
                    </span>
                  )}
                </button>

                {/* NEW PRODUCT REVIEWS TAB */}
                <button
                  onClick={() => setActiveTab('reviews')}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-medium transition-all ${
                    activeTab === 'reviews'
                      ? 'bg-[#800020] text-white shadow-md shadow-[#800020]/10 font-semibold'
                      : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Star className="w-4 h-4" />
                    <span>Product Reviews</span>
                  </div>
                  {unreviewedEligibleCount > 0 ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#D4AF37] text-stone-950 animate-pulse">
                      {unreviewedEligibleCount} New
                    </span>
                  ) : (
                    <ChevronRight className={`w-4 h-4 ${activeTab === 'reviews' ? 'opacity-100' : 'opacity-40'}`} />
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('address')}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-medium transition-all ${
                    activeTab === 'address'
                      ? 'bg-[#800020] text-white shadow-md shadow-[#800020]/10 font-semibold'
                      : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4" />
                    <span>Shipping Address</span>
                  </div>
                  <ChevronRight className={`w-4 h-4 ${activeTab === 'address' ? 'opacity-100' : 'opacity-40'}`} />
                </button>

                <button
                  onClick={() => onNavigateToWishlist()}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-medium text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Heart className="w-4 h-4" />
                    <span>Wishlist</span>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-40" />
                </button>
              </nav>
            </div>
          </div>

          {/* Tab Content Area */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* 1. DASHBOARD TAB */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* Metric Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center text-stone-700 mb-3">
                      <Package className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Total Orders</p>
                    <p className="text-2xl font-bold font-serif text-stone-900 mt-1">{orders.length}</p>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 mb-3">
                      <Clock className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">In Transit</p>
                    <p className="text-2xl font-bold font-serif text-amber-600 mt-1">{pendingOrders.length}</p>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-3">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Delivered</p>
                    <p className="text-2xl font-bold font-serif text-emerald-600 mt-1">{deliveredOrders.length}</p>
                  </div>

                  <div 
                    onClick={() => setActiveTab('reviews')}
                    className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm hover:border-[#800020] transition-colors cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#800020]/10 flex items-center justify-center text-[#800020] mb-3">
                      <Star className="w-5 h-5 text-[#D4AF37] fill-[#D4AF37]" />
                    </div>
                    <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Review Eligible</p>
                    <p className="text-2xl font-bold font-serif text-[#800020] mt-1">{eligibleProducts.length}</p>
                  </div>
                </div>

                {/* Review Prompt Banner if eligible */}
                {unreviewedEligibleCount > 0 && (
                  <div className="bg-gradient-to-r from-amber-500/10 via-[#D4AF37]/20 to-amber-500/10 border border-[#D4AF37]/40 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-[#D4AF37] text-stone-950 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <PackageCheck className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-serif font-bold text-stone-900 text-sm sm:text-base">
                          You have {unreviewedEligibleCount} delivered item{unreviewedEligibleCount > 1 ? 's' : ''} waiting for review!
                        </h4>
                        <p className="text-xs text-stone-600 mt-0.5">
                          Share your authentic thoughts & help others make great choices.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab('reviews')}
                      className="px-5 py-2.5 rounded-xl bg-[#800020] hover:bg-[#600018] text-white text-xs font-semibold transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap"
                    >
                      <Star className="w-3.5 h-3.5 fill-[#D4AF37] text-[#D4AF37]" />
                      Write Reviews
                    </button>
                  </div>
                )}

                {/* Recent Orders Section */}
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-serif font-bold text-stone-900">Recent Orders</h3>
                    <button
                      onClick={() => setActiveTab('orders')}
                      className="text-xs font-semibold text-[#800020] hover:underline"
                    >
                      View All Orders
                    </button>
                  </div>

                  {loadingOrders ? (
                    <div className="py-8 text-center text-stone-400 text-sm">Loading your orders...</div>
                  ) : orders.length === 0 ? (
                    <div className="text-center py-10">
                      <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-3 text-stone-400">
                        <ShoppingBag className="w-8 h-8" />
                      </div>
                      <p className="text-stone-600 font-medium text-sm">You haven't placed any orders yet.</p>
                      <button
                        onClick={onNavigateToShop}
                        className="mt-4 px-5 py-2.5 bg-[#800020] text-white rounded-xl text-xs font-semibold hover:bg-[#600018] transition-colors"
                      >
                        Start Shopping
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-stone-100">
                      {orders.slice(0, 3).map((order) => (
                        <div key={order.id} className="py-4 flex items-center justify-between flex-wrap gap-4">
                          <div>
                            <p className="font-semibold text-stone-900 text-sm">Order #{order.orderNumber || order.id.slice(0, 8)}</p>
                            <p className="text-xs text-stone-500 mt-0.5">{order.date || 'Recent'}</p>
                            <p className="text-xs text-stone-700 font-medium mt-1">
                              {order.items?.length || 0} items • ৳{order.total?.toLocaleString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            {getStatusBadge(order.status)}
                            <button
                              onClick={() => {
                                setSelectedOrder(order);
                                setActiveTab('orders');
                              }}
                              className="p-2 text-stone-500 hover:text-[#800020] hover:bg-stone-50 rounded-xl transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 2. ORDERS TAB */}
            {activeTab === 'orders' && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm animate-in fade-in duration-300">
                <h3 className="text-xl font-serif font-bold text-stone-900 mb-6">My Orders ({orders.length})</h3>

                {loadingOrders ? (
                  <div className="py-12 text-center text-stone-400 text-sm">Loading order history...</div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-3 text-stone-400">
                      <Package className="w-8 h-8" />
                    </div>
                    <p className="text-stone-600 font-medium text-sm">No orders found.</p>
                    <button
                      onClick={onNavigateToShop}
                      className="mt-4 px-6 py-2.5 bg-[#800020] text-white rounded-xl text-xs font-semibold hover:bg-[#600018] transition-colors"
                    >
                      Explore Products
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <div
                        key={order.id}
                        className="border border-stone-200 rounded-2xl p-5 hover:border-[#800020]/30 transition-all"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-stone-100">
                          <div>
                            <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Order ID</span>
                            <h4 className="font-bold text-stone-900 text-sm">#{order.orderNumber || order.id}</h4>
                            <p className="text-xs text-stone-500">{order.date || 'Recent'}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            {getStatusBadge(order.status)}
                            <button
                              onClick={() => onTrackOrder(order.orderNumber || order.id)}
                              className="px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-medium transition-colors"
                            >
                              Track
                            </button>
                          </div>
                        </div>

                        {/* Items in this order */}
                        <div className="py-4 space-y-3">
                          {order.items?.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3">
                                <img
                                  src={item.product.image}
                                  alt={item.product.name}
                                  className="w-12 h-12 rounded-xl object-cover border border-stone-200"
                                />
                                <div>
                                  <p className="text-xs font-semibold text-stone-900 line-clamp-1">{item.product.name}</p>
                                  <p className="text-[11px] text-stone-500">
                                    Qty: {item.quantity} {item.selectedFinish && `• ${item.selectedFinish}`}
                                  </p>
                                </div>
                              </div>
                              <span className="text-xs font-semibold text-stone-800">
                                ৳{(item.product.price * item.quantity).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Footer / Total & Quick Review Link if delivered */}
                        <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3">
                          <div className="text-xs text-stone-500">
                            Total: <strong className="text-stone-900 text-sm">৳{order.total?.toLocaleString()}</strong> ({order.paymentMethod?.toUpperCase()})
                          </div>
                          {(order.status || '').toLowerCase() === 'delivered' && (
                            <button
                              onClick={() => setActiveTab('reviews')}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#800020] hover:underline"
                            >
                              <Star className="w-3.5 h-3.5 fill-[#D4AF37] text-[#D4AF37]" />
                              Review items from this order
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 3. PRODUCT REVIEWS TAB */}
            {activeTab === 'reviews' && (
              <div className="animate-in fade-in duration-300">
                <ProductReviewsTab orders={orders} onNavigateToShop={onNavigateToShop} />
              </div>
            )}

            {/* 4. SHIPPING ADDRESS TAB */}
            {activeTab === 'address' && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm animate-in fade-in duration-300">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-serif font-bold text-stone-900">Default Shipping Address</h3>
                  {!isEditingAddress && (
                    <button
                      onClick={() => setIsEditingAddress(true)}
                      className="px-4 py-2 border border-stone-300 hover:border-[#800020] text-stone-700 hover:text-[#800020] rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Edit Address
                    </button>
                  )}
                </div>

                {addressSavedSuccess && (
                  <div className="mb-5 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    Shipping address updated successfully!
                  </div>
                )}

                {isEditingAddress ? (
                  <form onSubmit={handleSaveAddress} className="space-y-4 max-w-lg">
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">Recipient Name</label>
                      <input
                        type="text"
                        value={addressData.name}
                        onChange={(e) => setAddressData({ ...addressData, name: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:border-[#800020] focus:ring-1 focus:ring-[#800020]"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">Contact Phone Number</label>
                      <input
                        type="tel"
                        value={addressData.phone}
                        onChange={(e) => setAddressData({ ...addressData, phone: e.target.value })}
                        placeholder="01XXXXXXXXX"
                        className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:border-[#800020] focus:ring-1 focus:ring-[#800020]"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">Full Street Address / House / Road</label>
                      <textarea
                        rows={3}
                        value={addressData.address}
                        onChange={(e) => setAddressData({ ...addressData, address: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:border-[#800020] focus:ring-1 focus:ring-[#800020]"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-stone-700 mb-1">District</label>
                        <select
                          value={addressData.district}
                          onChange={(e) => setAddressData({ ...addressData, district: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:border-[#800020] focus:ring-1 focus:ring-[#800020]"
                        >
                          <option value="Dhaka">Dhaka</option>
                          <option value="Chittagong">Chittagong</option>
                          <option value="Sylhet">Sylhet</option>
                          <option value="Rajshahi">Rajshahi</option>
                          <option value="Khulna">Khulna</option>
                          <option value="Barisal">Barisal</option>
                          <option value="Rangpur">Rangpur</option>
                          <option value="Mymensingh">Mymensingh</option>
                          <option value="Comilla">Comilla</option>
                          <option value="Gazipur">Gazipur</option>
                          <option value="Narayanganj">Narayanganj</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-stone-700 mb-1">Thana / Upazila</label>
                        <input
                          type="text"
                          value={addressData.thana}
                          onChange={(e) => setAddressData({ ...addressData, thana: e.target.value })}
                          placeholder="e.g. Dhanmondi"
                          className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:border-[#800020] focus:ring-1 focus:ring-[#800020]"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-3">
                      <button
                        type="button"
                        onClick={() => setIsEditingAddress(false)}
                        className="px-5 py-2 rounded-xl border border-stone-200 text-xs font-semibold text-stone-600 hover:bg-stone-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingAddress}
                        className="px-6 py-2 rounded-xl bg-[#800020] text-white text-xs font-semibold hover:bg-[#600018] transition-colors"
                      >
                        {savingAddress ? 'Saving...' : 'Save Address'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="p-6 rounded-2xl bg-stone-50 border border-stone-200 max-w-lg space-y-2">
                    <p className="text-sm font-bold text-stone-900">{addressData.name || 'No recipient name set'}</p>
                    <p className="text-xs text-stone-600 flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-stone-400" />
                      {addressData.phone || 'No phone number provided'}
                    </p>
                    <p className="text-xs text-stone-600 flex items-start gap-2 pt-1">
                      <MapPin className="w-3.5 h-3.5 text-stone-400 mt-0.5 flex-shrink-0" />
                      <span>
                        {addressData.address ? (
                          <>
                            {addressData.address}
                            {addressData.thana ? `, ${addressData.thana}` : ''}
                            {addressData.district ? `, ${addressData.district}` : ''}
                          </>
                        ) : (
                          'No detailed address saved. Click "Edit Address" to add your delivery location.'
                        )}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};
