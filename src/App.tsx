import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Toaster } from 'react-hot-toast';
import { 
  Header 
} from './components/Header';
import { SidebarMenu } from './components/SidebarMenu';
import { MobileBottomNav } from './components/MobileBottomNav';
import { HeroSlider } from './components/HeroSlider';
import { FeatureBadges } from './components/FeatureBadges';
import { ProductCard } from './components/ProductCard';
import { ShopPage } from './components/ShopPage';
import { WishlistPage } from './components/WishlistPage';
import { CartPage } from './components/CartPage';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { OrderSuccessModal } from './components/OrderSuccessModal';
import { QuickViewModal } from './components/QuickViewModal';
import { TrackOrderModal } from './components/TrackOrderModal';
import { CustomerAuthModal } from './components/CustomerAuthModal';
import { SplashEntrance } from './components/SplashEntrance';
import { AboutPage } from './components/AboutPage';
import { ContactPage } from './components/ContactPage';
import { AccountPage } from './components/AccountPage';
import { Footer } from './components/Footer';
import { AdminDashboard } from './admin/AdminDashboard';
import { AdminGuard } from './admin/AdminGuard';
import { useAdminStore } from './store/useAdminStore';
import { INITIAL_USER, INITIAL_REVIEWS } from './data';
import { Product, CartItem, Order, UserProfile, HomepageSection, PaymentGatewayType, Coupon } from './types';
import { Sparkles, ArrowRight, Star, Clock, ShieldCheck, Quote, Mail, HelpCircle, ChevronDown } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { trackingService } from './services/trackingService';
import { seoService } from './services/seoService';
import { paymentService } from './services/paymentService';
import { validateAndCalculateCoupon } from './services/couponService';
import { applyCouponAtomicTransaction } from './firebase/firestoreService';
import { db } from './firebase/config';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export function App() {
  // Check URL pathname on boot or navigation for secret admin route
  const getInitialAdminView = () => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      if (path === '/secure-management-login' || path.startsWith('/admin')) {
        return true;
      }
    }
    return false;
  };

  // Helper to parse clean URL path and return view state
  const parseRouteFromLocation = (): {
    tab: 'home' | 'shop' | 'wishlist' | 'cart' | 'account' | 'about' | 'contact' | 'faq';
    category: string;
    productSlug: string | null;
  } => {
    if (typeof window === 'undefined') {
      return { tab: 'home', category: 'all', productSlug: null };
    }

    const rawPath = window.location.pathname;
    const cleanPath = rawPath.replace(/\/+$/, '') || '/';
    const lower = cleanPath.toLowerCase();

    // Check for direct static pages
    if (lower === '/shop') return { tab: 'shop', category: 'all', productSlug: null };
    if (lower === '/about') return { tab: 'about', category: 'all', productSlug: null };
    if (lower === '/contact') return { tab: 'contact', category: 'all', productSlug: null };
    if (lower === '/cart') return { tab: 'cart', category: 'all', productSlug: null };
    if (lower === '/wishlist') return { tab: 'wishlist', category: 'all', productSlug: null };
    if (lower === '/account') return { tab: 'account', category: 'all', productSlug: null };
    if (lower === '/faq') return { tab: 'faq', category: 'all', productSlug: null };

    // Check for /product/:slug
    if (lower.startsWith('/product/')) {
      const slug = cleanPath.substring('/product/'.length).trim();
      return { tab: 'shop', category: 'all', productSlug: decodeURIComponent(slug) };
    }

    // Check for /category/:slug
    if (lower.startsWith('/category/')) {
      const catSlug = cleanPath.substring('/category/'.length).trim();
      return { tab: 'shop', category: decodeURIComponent(catSlug), productSlug: null };
    }

    // Check legacy hash paths (e.g. /#shop, /#category-bridal, /#product-kundan)
    const hash = window.location.hash || '';
    if (hash.startsWith('#/product/') || hash.startsWith('#product-')) {
      const slug = hash.replace(/^#(\/product\/|product-)/, '').trim();
      return { tab: 'shop', category: 'all', productSlug: decodeURIComponent(slug) };
    }
    if (hash.startsWith('#/category/') || hash.startsWith('#category-')) {
      const catSlug = hash.replace(/^#(\/category\/|category-)/, '').trim();
      return { tab: 'shop', category: decodeURIComponent(catSlug), productSlug: null };
    }
    if (hash === '#shop') return { tab: 'shop', category: 'all', productSlug: null };
    if (hash === '#about') return { tab: 'about', category: 'all', productSlug: null };
    if (hash === '#contact') return { tab: 'contact', category: 'all', productSlug: null };
    if (hash === '#cart') return { tab: 'cart', category: 'all', productSlug: null };
    if (hash === '#wishlist') return { tab: 'wishlist', category: 'all', productSlug: null };
    if (hash === '#account') return { tab: 'account', category: 'all', productSlug: null };

    return { tab: 'home', category: 'all', productSlug: null };
  };

  const initialRoute = parseRouteFromLocation();

  // Navigation & View State
  const [isAdminView, setIsAdminView] = useState<boolean>(getInitialAdminView());
  const [activeTab, setActiveTabState] = useState<'home' | 'shop' | 'wishlist' | 'cart' | 'account' | 'about' | 'contact' | 'faq'>(initialRoute.tab);
  const [selectedCategory, setSelectedCategoryState] = useState<string>(initialRoute.category);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [quickViewProduct, setQuickViewProductState] = useState<Product | null>(null);

  // Helper to open QuickView and update browser history to /product/:slug
  const setQuickViewProduct = (product: Product | null) => {
    setQuickViewProductState(product);
    if (typeof window !== 'undefined') {
      if (product) {
        const slug = (product as any).seo?.slug || (product as any).seoSlug || (product as any).slug || product.id;
        const targetPath = `/product/${encodeURIComponent(slug)}`;
        if (window.location.pathname !== targetPath) {
          window.history.pushState({ tab: activeTab, category: selectedCategory, productSlug: slug }, '', targetPath);
        }
      } else {
        // Closed modal: restore current tab/category URL
        const targetPath = getPathForTab(activeTab, selectedCategory);
        if (window.location.pathname !== targetPath) {
          window.history.pushState({ tab: activeTab, category: selectedCategory }, '', targetPath);
        }
      }
    }
  };
  
  // Store access
  const { 
    products, 
    categories, 
    orders, 
    coupons,
    addOrder, 
    initializeFirestoreSync,
    isSyncing,
    seoConfig,
    pagesSeo,
    homepageSections
  } = useAdminStore();
  const { userProfile: authProfile, currentUser, loading: authLoading } = useAuth();

  // Helper to build canonical path
  const getPathForTab = (tab: string, category: string = 'all'): string => {
    if (tab === 'home') return '/';
    if (tab === 'shop') {
      if (category && category !== 'all') {
        return `/category/${encodeURIComponent(category)}`;
      }
      return '/shop';
    }
    if (['about', 'contact', 'cart', 'wishlist', 'account', 'faq'].includes(tab)) {
      return `/${tab}`;
    }
    return '/';
  };

  // Synchronized navigation function with window.history.pushState
  const navigateToTab = (
    tab: 'home' | 'shop' | 'wishlist' | 'cart' | 'account' | 'about' | 'contact' | 'faq', 
    category: string = 'all', 
    pushToHistory: boolean = true
  ) => {
    setActiveTabState(tab);
    setSelectedCategoryState(category);

    // If a product modal is open, close it when navigating tabs
    setQuickViewProduct(null);

    if (pushToHistory && typeof window !== 'undefined') {
      const targetPath = getPathForTab(tab, category);
      if (window.location.pathname !== targetPath) {
        window.history.pushState({ tab, category }, '', targetPath);
      }
    }
  };

  // Wrapper for setActiveTab to maintain compatibility across existing components
  const setActiveTab = (newTab: any) => {
    if (typeof newTab === 'function') {
      setActiveTabState((prev) => {
        const next = newTab(prev);
        navigateToTab(next, selectedCategory, true);
        return next;
      });
    } else {
      navigateToTab(newTab, selectedCategory, true);
    }
  };

  // Wrapper for setSelectedCategory to maintain compatibility and sync /category/:slug
  const setSelectedCategory = (newCat: string) => {
    setSelectedCategoryState(newCat);
    if (typeof window !== 'undefined' && activeTab === 'shop') {
      const targetPath = newCat && newCat !== 'all' ? `/category/${encodeURIComponent(newCat)}` : '/shop';
      if (window.location.pathname !== targetPath) {
        window.history.pushState({ tab: 'shop', category: newCat }, '', targetPath);
      }
    }
  };

  // Listen to browser popstate (back/forward or URL changes)
  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname.toLowerCase();
      if (path === '/secure-management-login' || path.startsWith('/admin')) {
        setIsAdminView(true);
        return;
      }

      setIsAdminView(false);

      const route = parseRouteFromLocation();
      setActiveTabState(route.tab);
      setSelectedCategoryState(route.category);

      // Handle product deep link on popstate
      if (route.productSlug && products.length > 0) {
        const found = products.find(p => {
          const pSlug = (p as any).seo?.slug || (p as any).seoSlug || (p as any).slug || p.id;
          return pSlug === route.productSlug || p.id === route.productSlug;
        });
        if (found) {
          setQuickViewProduct(found);
        } else {
          setQuickViewProduct(null);
        }
      } else {
        setQuickViewProduct(null);
      }
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, [products]);

  // Handle direct deep-link to /product/:slug on initial catalog hydration
  useEffect(() => {
    if (products.length === 0) return;

    const route = parseRouteFromLocation();
    if (route.productSlug) {
      const found = products.find(p => {
        const pSlug = (p as any).seo?.slug || (p as any).seoSlug || (p as any).slug || p.id;
        return pSlug === route.productSlug || p.id === route.productSlug;
      });
      if (found) {
        setQuickViewProduct(found);
      }
    }

    if (route.category && route.category !== 'all') {
      setSelectedCategoryState(route.category);
    }
  }, [products]);

  // Initialize Realtime Cloud Firestore Synchronization on Startup
  useEffect(() => {
    const cleanup = initializeFirestoreSync();
    return () => {
      cleanup();
    };
  }, [initializeFirestoreSync]);

  // User Profile for Checkout
  const userProfile: UserProfile = authProfile ? {
    id: authProfile.uid,
    name: authProfile.displayName || 'Customer',
    email: authProfile.email || '',
    phone: authProfile.phoneNumber || '01400-031902',
    address: authProfile.address || 'Dhaka, Bangladesh',
    district: authProfile.district || 'Dhaka',
    thana: authProfile.city || authProfile.thana || 'Dhanmondi',
    totalOrders: orders.length,
    totalSpent: orders.reduce((sum, o) => sum + o.total, 0),
    status: authProfile.role === 'customer' ? 'active' : 'vip'
  } : INITIAL_USER;

  // Cart & Wishlist Local State
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderNote, setOrderNote] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState('');
  const [appliedCouponObject, setAppliedCouponObject] = useState<Coupon | null>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [isFreeShippingFromCoupon, setIsFreeShippingFromCoupon] = useState(false);
  const consumedOrdersRef = useRef<Set<string>>(new Set());

  // Active Session Key: null when Firebase Auth is still loading, 'user_<uid>' when logged in, 'guest' when guest
  const activeSessionKey = authLoading ? null : (currentUser?.uid ? `user_${currentUser.uid}` : 'guest');
  
  // Track the session key that has been successfully loaded into React state
  const isHydratedRef = useRef(false);
  const currentHydratedKeyRef = useRef<string | null>(null);

  // Helper to safely rehydrate cart from raw stored items with live product catalog or embedded fallback
  const rehydrateStoredCart = (rawList: any[], productCatalog: Product[]): CartItem[] => {
    if (!Array.isArray(rawList)) return [];
    const catalogMap = new Map((productCatalog || []).map(p => [p.id, p]));

    return rawList
      .map(item => {
        const pId = item?.productId || item?.product?.id || item?.id;
        if (!pId) return null;
        // 1. Prefer fresh live product from store catalog
        // 2. Fall back to embedded product metadata if catalog is still streaming
        const productObj = catalogMap.get(pId) || (item.product && item.product.id ? item.product : null);
        if (!productObj) return null;

        return {
          product: productObj,
          quantity: typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1,
          selectedFinish: item.selectedFinish || undefined,
          selectedSize: item.selectedSize || undefined
        };
      })
      .filter(Boolean) as CartItem[];
  };

  // Helper to rehydrate wishlist IDs with live product catalog
  const rehydrateStoredWishlist = (rawList: any[], productCatalog: Product[]): string[] => {
    if (!Array.isArray(rawList)) return [];
    if (productCatalog && productCatalog.length > 0) {
      const validIds = new Set(productCatalog.map(p => p.id));
      return rawList.filter(id => typeof id === 'string' && validIds.has(id));
    }
    return rawList.filter(id => typeof id === 'string');
  };

  // Load account-specific Cart & Wishlist when currentUser/auth resolves
  useEffect(() => {
    // If auth is still resolving on page load/refresh, hold on to avoid overwriting or guest collision
    if (!activeSessionKey) {
      return;
    }

    let isCancelled = false;
    isHydratedRef.current = false;

    const loadSessionCartAndWishlist = async () => {
      const localCartKey = `hom_cart_${activeSessionKey}`;
      const localWishlistKey = `hom_wishlist_${activeSessionKey}`;

      let initialCartRaw: any[] = [];
      let initialWishlistRaw: string[] = [];

      // 1. Instant load from localStorage cache for this specific session
      try {
        const cachedCartStr = localStorage.getItem(localCartKey);
        if (cachedCartStr) initialCartRaw = JSON.parse(cachedCartStr);
        const cachedWishlistStr = localStorage.getItem(localWishlistKey);
        if (cachedWishlistStr) initialWishlistRaw = JSON.parse(cachedWishlistStr);
      } catch (e) {
        console.warn('[Storage] Error reading account cache:', e);
      }

      if (!isCancelled) {
        setCart(rehydrateStoredCart(initialCartRaw, products));
        setWishlist(rehydrateStoredWishlist(initialWishlistRaw, products));
      }

      // 2. If logged in, sync latest data from Firestore
      if (currentUser?.uid) {
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists() && !isCancelled) {
            const data = userDocSnap.data();
            const firestoreCartRaw = Array.isArray(data?.cart) ? data.cart : null;
            const firestoreWishlistRaw = Array.isArray(data?.wishlist) ? data.wishlist : null;

            const finalCartRaw = firestoreCartRaw !== null ? firestoreCartRaw : initialCartRaw;
            const finalWishlistRaw = firestoreWishlistRaw !== null ? firestoreWishlistRaw : initialWishlistRaw;

            const finalCart = rehydrateStoredCart(finalCartRaw, products);
            const finalWishlist = rehydrateStoredWishlist(finalWishlistRaw, products);

            setCart(finalCart);
            setWishlist(finalWishlist);

            // Update local account cache with verified Firestore data
            try {
              localStorage.setItem(localCartKey, JSON.stringify(finalCartRaw));
              localStorage.setItem(localWishlistKey, JSON.stringify(finalWishlistRaw));
            } catch (err) {}
          }
        } catch (err) {
          console.warn('[Firestore] Error loading account cart/wishlist:', err);
        }
      }

      if (!isCancelled) {
        currentHydratedKeyRef.current = activeSessionKey;
        isHydratedRef.current = true;
      }
    };

    loadSessionCartAndWishlist();

    return () => {
      isCancelled = true;
    };
  }, [activeSessionKey]);

  // Synchronize cart item references when product catalog updates
  useEffect(() => {
    if (products && products.length > 0 && isHydratedRef.current) {
      const catalogMap = new Map(products.map(p => [p.id, p]));
      
      setCart(prev => {
        let hasChanges = false;
        const updated = prev.map(item => {
          const freshProd = catalogMap.get(item.product.id);
          if (freshProd && freshProd !== item.product) {
            hasChanges = true;
            return { ...item, product: freshProd };
          }
          return item;
        });
        return hasChanges ? updated : prev;
      });

      setWishlist(prev => {
        const validIds = new Set(products.map(p => p.id));
        const filtered = prev.filter(id => validIds.has(id));
        return filtered.length !== prev.length ? filtered : prev;
      });
    }
  }, [products]);

  // Persist Cart & Wishlist whenever changed (account-specific)
  useEffect(() => {
    // STRICT SAFETY: Never save during hydration or when key does not match
    if (!isHydratedRef.current || !activeSessionKey || currentHydratedKeyRef.current !== activeSessionKey) {
      return;
    }

    const localCartKey = `hom_cart_${activeSessionKey}`;
    const localWishlistKey = `hom_wishlist_${activeSessionKey}`;

    const serializedCart = cart.map(item => ({
      productId: item.product.id,
      product: item.product,
      quantity: item.quantity,
      selectedFinish: item.selectedFinish || null,
      selectedSize: item.selectedSize || null
    }));

    // 1. Immediately save to LocalStorage cache
    try {
      localStorage.setItem(localCartKey, JSON.stringify(serializedCart));
      localStorage.setItem(localWishlistKey, JSON.stringify(wishlist));
    } catch (e) {
      console.warn('[Storage] Error saving local cart/wishlist:', e);
    }

    // 2. Debounced save to Firestore if user is authenticated
    if (currentUser?.uid) {
      const targetUserId = currentUser.uid;
      const timer = setTimeout(async () => {
        try {
          const userDocRef = doc(db, 'users', targetUserId);
          await setDoc(
            userDocRef,
            {
              cart: serializedCart,
              wishlist: wishlist,
              updatedAt: serverTimestamp()
            },
            { merge: true }
          );
        } catch (err) {
          console.warn('[Firestore] Error saving user cart/wishlist:', err);
        }
      }, 400);

      return () => clearTimeout(timer);
    }
  }, [cart, wishlist, activeSessionKey]);

  // Modal States
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isTrackOrderOpen, setIsTrackOrderOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [latestOrder, setLatestOrder] = useState<Order | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Dynamically update document head tags (Title, Meta description, Canonical, OpenGraph, JSON-LD)
  useEffect(() => {
    if (isAdminView) {
      document.title = 'Secure Management Portal | Houseofmahi Admin';
      return;
    }

    const currentPageItem = pagesSeo.find(p => p.id === activeTab);
    const resolved = seoService.resolveSeoState({
      pageType: quickViewProduct ? 'product' : activeTab,
      product: quickViewProduct || undefined,
      category: selectedCategory !== 'all' ? categories.find(c => c.id === selectedCategory || c.slug === selectedCategory) : undefined,
      pageSeoItem: currentPageItem,
      globalConfig: seoConfig
    });

    seoService.applyToDomHead(resolved);
  }, [activeTab, quickViewProduct, selectedCategory, categories, seoConfig, pagesSeo, isAdminView]);

  // Track PageViews across navigation tabs
  useEffect(() => {
    if (!isAdminView) {
      const tabTitles: Record<string, string> = {
        home: 'Houseofmahi | Premium Beauty Studio & Women Jewelry Bangladesh',
        shop: 'Shop Luxury Jewelry & Sets | Houseofmahi',
        about: 'Our Story & Craftsmanship | Houseofmahi',
        contact: 'Contact & Support | Houseofmahi',
        wishlist: 'My Wishlist | Houseofmahi',
        cart: 'Shopping Bag | Houseofmahi',
        account: 'My Account & Orders | Houseofmahi'
      };
      const title = tabTitles[activeTab] || 'Houseofmahi | Women Jewelry';
      trackingService.trackPageView(window.location.href, title);
    }
  }, [activeTab, isAdminView]);

  // Track ViewContent when quick view product opens
  useEffect(() => {
    if (quickViewProduct) {
      trackingService.trackViewItem(quickViewProduct);
    }
  }, [quickViewProduct]);

  // Track ViewCart when Cart Drawer opens
  useEffect(() => {
    if (isCartDrawerOpen) {
      const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
      trackingService.trackViewCart(cart, subtotal);
    }
  }, [isCartDrawerOpen, cart]);

  // Track InitiateCheckout when Checkout modal opens
  useEffect(() => {
    if (isCheckoutOpen) {
      const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
      trackingService.trackBeginCheckout(cart, subtotal, appliedCoupon);
    }
  }, [isCheckoutOpen, cart, appliedCoupon]);

  // Toast Notification helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Wishlist toggle
  const toggleWishlist = (productId: string) => {
    setWishlist(prev => {
      const exists = prev.includes(productId);
      if (exists) {
        showToast('Item removed from Wishlist');
        return prev.filter(id => id !== productId);
      } else {
        showToast('Item added to Wishlist ❤️');
        return [...prev, productId];
      }
    });
  };

  // Cart operations
  const addToCart = (product: Product, finish?: string, size?: string) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id && item.selectedFinish === finish);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id && item.selectedFinish === finish
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1, selectedFinish: finish, selectedSize: size }];
    });
    // Fire tracking event
    trackingService.trackAddToCart(product, 1, finish, size);
    showToast(`Added ${product.name} to Cart 🛍️`);
  };

  const buyNow = (product: Product, finish?: string, size?: string) => {
    addToCart(product, finish, size);
    setIsCheckoutOpen(true);
  };

  const updateCartQuantity = (productId: string, delta: number) => {
    setCart(prev =>
      prev
        .map(item => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const setItemQuantity = (productId: string, quantity: number) => {
    const validQty = Math.max(1, Math.min(99, Math.floor(quantity) || 1));
    setCart(prev =>
      prev.map(item =>
        item.product.id === productId ? { ...item, quantity: validQty } : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
    showToast('Item removed from cart');
  };

  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  }, [cart]);

  const handleRemoveCoupon = () => {
    setAppliedCoupon('');
    setAppliedCouponObject(null);
    setCouponDiscount(0);
    setIsFreeShippingFromCoupon(false);
    showToast('Coupon removed');
  };

  const handleApplyCoupon = (inputCode?: string) => {
    const codeToValidate = (typeof inputCode === 'string' && inputCode.trim() ? inputCode : appliedCoupon).trim().toUpperCase();
    if (!codeToValidate) {
      showToast('Please enter a coupon code.');
      return;
    }

    const matchedCoupon = coupons.find(
      c => c.code.trim().toUpperCase() === codeToValidate
    );

    if (!matchedCoupon) {
      setCouponDiscount(0);
      setAppliedCouponObject(null);
      setIsFreeShippingFromCoupon(false);
      showToast(`Invalid coupon code "${codeToValidate}".`);
      return;
    }

    const validationResult = validateAndCalculateCoupon({
      coupon: matchedCoupon,
      cartItems: cart,
      cartSubtotal,
      userId: currentUser?.uid || authProfile?.uid,
      customerPhone: userProfile.phone
    });

    if (!validationResult.isValid) {
      setCouponDiscount(0);
      setAppliedCouponObject(null);
      setIsFreeShippingFromCoupon(false);
      showToast(validationResult.errorMessage || 'This coupon is not valid for your current cart.');
      return;
    }

    // Apply valid coupon
    setAppliedCoupon(matchedCoupon.code);
    setAppliedCouponObject(matchedCoupon);
    setCouponDiscount(validationResult.discountAmount);
    setIsFreeShippingFromCoupon(Boolean(validationResult.isFreeShipping));

    let successMsg = `Coupon ${matchedCoupon.code} applied! `;
    if (validationResult.discountAmount > 0 && validationResult.isFreeShipping) {
      successMsg += `৳${validationResult.discountAmount.toLocaleString()} discount + Free Delivery added 🎉`;
    } else if (validationResult.discountAmount > 0) {
      successMsg += `৳${validationResult.discountAmount.toLocaleString()} discount added 🎉`;
    } else if (validationResult.isFreeShipping) {
      successMsg += 'Free Delivery applied 🎉';
    }
    showToast(successMsg);
  };

  // Re-validate applied coupon whenever cart items, subtotal, or coupons change
  useEffect(() => {
    if (!appliedCoupon && !appliedCouponObject) return;

    if (cart.length === 0) {
      setAppliedCoupon('');
      setAppliedCouponObject(null);
      setCouponDiscount(0);
      setIsFreeShippingFromCoupon(false);
      return;
    }

    const currentCoupon = appliedCouponObject || coupons.find(
      c => c.code.trim().toUpperCase() === appliedCoupon.trim().toUpperCase()
    );

    if (!currentCoupon) {
      setAppliedCoupon('');
      setAppliedCouponObject(null);
      setCouponDiscount(0);
      setIsFreeShippingFromCoupon(false);
      return;
    }

    const result = validateAndCalculateCoupon({
      coupon: currentCoupon,
      cartItems: cart,
      cartSubtotal,
      userId: currentUser?.uid || authProfile?.uid,
      customerPhone: userProfile.phone
    });

    if (!result.isValid) {
      setAppliedCoupon('');
      setAppliedCouponObject(null);
      setCouponDiscount(0);
      setIsFreeShippingFromCoupon(false);
      showToast(`Coupon ${currentCoupon.code} removed: ${result.errorMessage}`);
    } else {
      setCouponDiscount(result.discountAmount);
      setIsFreeShippingFromCoupon(Boolean(result.isFreeShipping));
    }
  }, [cart, cartSubtotal, coupons]);

  // Checkout order placement with Firestore live storage
  const handleOrderComplete = (
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
  ) => {
    const orderItems = (paymentData?.items && paymentData.items.length > 0) ? [...paymentData.items] : [...cart];
    const subtotal = typeof paymentData?.subtotal === 'number' ? paymentData.subtotal : orderItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const shipping = typeof paymentData?.shippingCharge === 'number' ? paymentData.shippingCharge : (isFreeShippingFromCoupon || subtotal >= 2000 || orderItems.length === 0 ? 0 : 80);
    const discount = typeof paymentData?.discount === 'number' ? paymentData.discount : couponDiscount;
    const finalTotal = typeof paymentData?.total === 'number' ? paymentData.total : grandTotal;
    
    // Map selected payment method to Order type
    const methodStr = (paymentData?.method || 'cod').toLowerCase();
    const mappedPaymentMethod: 'cod' | 'bkash' | 'nagad' | 'card' = 
      methodStr.includes('bkash') ? 'bkash' :
      methodStr.includes('nagad') ? 'nagad' :
      methodStr.includes('card') || methodStr.includes('ssl') ? 'card' : 'cod';

    const mappedPaymentStatus: 'unpaid' | 'paid' | 'refunded' = 
      paymentData?.paymentStatus === 'paid' ? 'paid' : 'unpaid';

    // Prioritize live customer info entered in the checkout form, fallback safely to userProfile
    const liveCustomer = paymentData?.customerInfo;
    const effectiveCustomerName = liveCustomer?.name?.trim() || userProfile.name || 'Valued Customer';
    const effectiveCustomerPhone = liveCustomer?.phone?.trim() || paymentData?.customerPhone || paymentData?.senderNumber || userProfile.phone || '';
    const effectiveCustomerEmail = liveCustomer?.email?.trim() || userProfile.email || '';
    const effectiveCustomerAddress = liveCustomer?.address?.trim() || userProfile.address || '';
    const effectiveCustomerDistrict = liveCustomer?.district?.trim() || userProfile.district || 'Dhaka';
    const effectiveCustomerThana = liveCustomer?.thana?.trim() || userProfile.thana || '';
    const effectiveCustomerNote = liveCustomer?.note?.trim() || orderNote || '';

    const newOrder: Order = {
      id: orderId,
      userId: currentUser?.uid || authProfile?.uid || undefined,
      orderNumber: orderId,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      items: orderItems,
      subtotal,
      shippingCharge: shipping,
      discount,
      total: finalTotal,
      status: 'Pending',
      paymentMethod: mappedPaymentMethod,
      paymentStatus: mappedPaymentStatus,
      paymentDetails: paymentData ? {
        method: mappedPaymentMethod,
        provider: (paymentData.method as any) || mappedPaymentMethod,
        status: paymentData.paymentStatus === 'paid' ? 'paid' : 'pending',
        amount: finalTotal,
        currency: 'BDT',
        transactionId: paymentData.transactionId,
        gatewayPaymentId: paymentData.gatewayPaymentId,
        customerPhone: effectiveCustomerPhone,
        initiatedAt: new Date().toISOString()
      } : undefined,
      customer: {
        name: effectiveCustomerName,
        phone: effectiveCustomerPhone,
        email: effectiveCustomerEmail,
        address: effectiveCustomerAddress,
        district: effectiveCustomerDistrict,
        thana: effectiveCustomerThana,
        note: effectiveCustomerNote
      },
      trackingNumber: `STEAD-${Math.floor(100000 + Math.random() * 900000)}-BD`
    };

    addOrder(newOrder);
    setLatestOrder(newOrder);
    
    // Fire Purchase conversion tracking across all enabled platforms (guaranteed deduplicated)
    trackingService.trackPurchase(newOrder);

    // Record atomic coupon transaction in Firestore if coupon was applied
    const targetCouponCode = (paymentData?.couponCode || appliedCoupon || '').trim().toUpperCase();
    const couponToRecord = appliedCouponObject || (targetCouponCode ? coupons.find(
      c => c.code.trim().toUpperCase() === targetCouponCode
    ) : null);

    if (couponToRecord && !consumedOrdersRef.current.has(orderId)) {
      consumedOrdersRef.current.add(orderId);

      applyCouponAtomicTransaction({
        couponId: couponToRecord.id,
        userId: currentUser?.uid || authProfile?.uid || null,
        customerPhone: effectiveCustomerPhone || null,
        customerEmail: effectiveCustomerEmail || null,
        orderId,
        orderTotal: finalTotal,
        discountAmount: discount,
        isFreeShippingApplied: isFreeShippingFromCoupon
      }).catch(err => console.warn('[CouponTransaction] Error recording usage:', err));
    }

    setIsCheckoutOpen(false);
    setCart([]);
    setAppliedCoupon('');
    setAppliedCouponObject(null);
    setCouponDiscount(0);
    setIsFreeShippingFromCoupon(false);
  };

  // Handle Payment Gateway Callbacks (bKash, Nagad, Card/SSLCommerz)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const searchParams = new URLSearchParams(window.location.search);
    const paymentStatusParam = searchParams.get('payment_status');
    const gatewayParam = searchParams.get('gateway');
    const paymentIdParam = searchParams.get('payment_id');
    const orderIdParam = searchParams.get('order_id');

    if (!paymentStatusParam) return;

    // Clean query parameters from address bar immediately to prevent duplicate triggers on page refresh
    window.history.replaceState({}, '', window.location.pathname);

    // Retrieve pending order metadata saved in sessionStorage by CheckoutModal
    let pendingOrderData: any = null;
    try {
      const storedStr = sessionStorage.getItem('pending_pgw_order');
      if (storedStr) {
        pendingOrderData = JSON.parse(storedStr);
      }
    } catch (err) {
      console.warn('[PaymentCallback] Could not parse pending order data:', err);
    }

    const orderId = orderIdParam || pendingOrderData?.orderId;
    const targetGateway = (gatewayParam || pendingOrderData?.paymentMethod || 'bkash') as PaymentGatewayType;

    // Duplicate Order Protection: If order is already in store
    if (orderId && orders.some(o => o.id === orderId)) {
      const existing = orders.find(o => o.id === orderId);
      if (existing) {
        setLatestOrder(existing);
      }
      try {
        sessionStorage.removeItem('pending_pgw_order');
      } catch (e) {}
      return;
    }

    // Handle Payment Failure or Cancellation
    if (paymentStatusParam.toLowerCase() === 'failed' || paymentStatusParam.toLowerCase() === 'cancelled') {
      try {
        sessionStorage.removeItem('pending_pgw_order');
      } catch (e) {}
      showToast(`Payment ${paymentStatusParam.toLowerCase() === 'cancelled' ? 'was cancelled' : 'failed'}. Your cart items are preserved.`);
      return;
    }

    // Handle Payment Success with Verification
    if (paymentStatusParam.toLowerCase() === 'success') {
      const verifyAndComplete = async () => {
        try {
          // Perform backend verification with paymentService
          const verifyResult = await paymentService.verifyPayment({
            orderId: orderId || '',
            paymentId: paymentIdParam || pendingOrderData?.gatewayPaymentId || '',
            gatewayPaymentId: paymentIdParam || pendingOrderData?.gatewayPaymentId,
            paymentMethod: targetGateway,
            expectedAmount: pendingOrderData?.grandTotal || 0
          });

          if (!verifyResult || !verifyResult.isPaid) {
            console.warn('[PaymentCallback] Verification failed:', verifyResult);
            showToast(verifyResult?.message || 'Payment verification failed with bank gateway. Order not created.');
            try {
              sessionStorage.removeItem('pending_pgw_order');
            } catch (e) {}
            return;
          }

          // Clean up pending session storage upon verified payment
          try {
            sessionStorage.removeItem('pending_pgw_order');
          } catch (e) {}

          const itemsToOrder = pendingOrderData?.cart && pendingOrderData.cart.length > 0
            ? pendingOrderData.cart
            : cart;

          const grandTotal = pendingOrderData?.grandTotal || (
            itemsToOrder.reduce((sum: number, item: CartItem) => sum + item.product.price * item.quantity, 0)
          );

          const subtotal = itemsToOrder.reduce((sum: number, item: CartItem) => sum + item.product.price * item.quantity, 0);
          const isFreeShippingEffective = pendingOrderData?.isFreeShipping !== undefined 
            ? Boolean(pendingOrderData.isFreeShipping)
            : (isFreeShippingFromCoupon || subtotal >= 2000 || itemsToOrder.length === 0);
          const shipping = isFreeShippingEffective ? 0 : 80;
          const effectiveDiscount = pendingOrderData?.couponDiscount !== undefined
            ? Number(pendingOrderData.couponDiscount)
            : couponDiscount;

          const methodStr = (targetGateway || 'bkash').toLowerCase();
          const mappedPaymentMethod: 'cod' | 'bkash' | 'nagad' | 'card' = 
            methodStr.includes('bkash') ? 'bkash' :
            methodStr.includes('nagad') ? 'nagad' :
            methodStr.includes('card') || methodStr.includes('ssl') ? 'card' : 'cod';

          const mappedProvider: 'bkash' | 'nagad' | 'sslcommerz' | 'cod' | 'manual' =
            methodStr.includes('bkash') ? 'bkash' :
            methodStr.includes('nagad') ? 'nagad' :
            methodStr.includes('card') || methodStr.includes('ssl') ? 'sslcommerz' : 'cod';

          const finalOrderId = orderId || `HM-${Date.now()}`;
          const customerInfo = pendingOrderData?.customer || {
            name: userProfile.name,
            phone: userProfile.phone,
            email: userProfile.email,
            address: userProfile.address,
            district: userProfile.district,
            thana: userProfile.thana,
            note: orderNote
          };

          const effectiveCustomerPhone = customerInfo.phone || userProfile.phone;

          const newOrder: Order = {
            id: finalOrderId,
            userId: currentUser?.uid || authProfile?.uid || undefined,
            orderNumber: finalOrderId,
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            items: [...itemsToOrder],
            subtotal,
            shippingCharge: shipping,
            discount: effectiveDiscount,
            total: grandTotal,
            status: 'Pending',
            paymentMethod: mappedPaymentMethod,
            paymentStatus: 'paid',
            paymentDetails: {
              method: mappedPaymentMethod,
              provider: mappedProvider,
              status: 'paid',
              amount: grandTotal,
              currency: 'BDT',
              transactionId: verifyResult.transactionId || paymentIdParam || pendingOrderData?.gatewayPaymentId,
              gatewayPaymentId: paymentIdParam || pendingOrderData?.gatewayPaymentId,
              customerPhone: effectiveCustomerPhone,
              initiatedAt: new Date().toISOString()
            },
            customer: {
              name: customerInfo.name,
              phone: effectiveCustomerPhone,
              email: customerInfo.email,
              address: customerInfo.address,
              district: customerInfo.district,
              thana: customerInfo.thana,
              note: customerInfo.note || orderNote
            },
            trackingNumber: `STEAD-${Math.floor(100000 + Math.random() * 900000)}-BD`
          };

          addOrder(newOrder);
          setLatestOrder(newOrder);
          trackingService.trackPurchase(newOrder);

          // Record atomic coupon transaction in Firestore if coupon was applied
          const targetCouponCode = (pendingOrderData?.appliedCoupon || pendingOrderData?.couponCode || appliedCoupon || '').trim().toUpperCase();
          const couponToRecord = appliedCouponObject || (targetCouponCode ? coupons.find(
            c => c.code.trim().toUpperCase() === targetCouponCode
          ) : null);

          if (couponToRecord && !consumedOrdersRef.current.has(finalOrderId)) {
            consumedOrdersRef.current.add(finalOrderId);

            applyCouponAtomicTransaction({
              couponId: couponToRecord.id,
              userId: currentUser?.uid || authProfile?.uid || null,
              customerPhone: effectiveCustomerPhone || null,
              customerEmail: customerInfo.email || userProfile.email || null,
              orderId: finalOrderId,
              orderTotal: grandTotal,
              discountAmount: effectiveDiscount,
              isFreeShippingApplied: Boolean(pendingOrderData?.isFreeShipping ?? isFreeShippingFromCoupon)
            }).catch(err => console.warn('[CouponTransaction] PGW callback usage record error:', err));
          }

          setIsCheckoutOpen(false);
          setCart([]);
          setAppliedCoupon('');
          setAppliedCouponObject(null);
          setCouponDiscount(0);
          setIsFreeShippingFromCoupon(false);
          showToast('Payment verified successfully! Your order has been placed 🎉');
        } catch (err: any) {
          console.error('[PaymentCallback] Error verifying payment:', err);
          showToast('Failed to complete payment verification. Please contact support.');
        }
      };

      verifyAndComplete();
    }
  }, [orders, addOrder, currentUser, authProfile, userProfile, orderNote, couponDiscount, cart]);

  // Exit Admin Panel & return to Customer Front
  const handleExitAdmin = () => {
    setIsAdminView(false);
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/');
    }
    setActiveTab('home');
  };

  // Dynamic Homepage Sections from Firestore
  const activeHomepageSections = useMemo(() => {
    if (!homepageSections || homepageSections.length === 0) return [];
    return [...homepageSections]
      .filter(sec => (sec.isActive ?? sec.enabled) !== false)
      .sort((a, b) => (a.sortOrder ?? a.displayOrder ?? 0) - (b.sortOrder ?? b.displayOrder ?? 0));
  }, [homepageSections]);

  // ==========================================
  // PROTECTED ADMIN ROUTE HANDLER
  // Only accessible via secret route /secure-management-login
  // ==========================================
  if (isAdminView) {
    return (
      <AdminGuard onBackToStore={handleExitAdmin}>
        <AdminDashboard onExitAdmin={handleExitAdmin} />
      </AdminGuard>
    );
  }

  // ==========================================
  // PUBLIC CUSTOMER FRONTEND
  // Completely isolated - zero admin triggers
  // ==========================================
  return (
    <div className="min-h-screen bg-[#FFFDF9] text-[#2C221E] font-sans flex flex-col selection:bg-[#4A1525] selection:text-[#F3E8DC]">
      {/* Premium App-Style Logo Entrance Animation */}
      <SplashEntrance />
      
      {/* Global React Hot Toast Notification Container */}
      <Toaster 
        position="top-right" 
        toastOptions={{
          duration: 3500,
          style: {
            background: '#4A1525',
            color: '#FEF3C7',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: '600'
          },
          success: {
            iconTheme: {
              primary: '#10B981',
              secondary: '#FFFFFF'
            }
          },
          error: {
            iconTheme: {
              primary: '#EF4444',
              secondary: '#FFFFFF'
            }
          }
        }}
      />

      {/* Legacy Toast Notification (if triggered via local helper) */}
      {toastMessage && (
        <div 
          id="global-toast-notification"
          className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 bg-[#4A1525] text-amber-200 px-4 py-2.5 rounded-xl shadow-2xl border border-amber-400/30 text-xs font-semibold flex items-center space-x-2 animate-bounce"
        >
          <Sparkles size={14} className="text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        wishlistCount={wishlist.length}
        cartCount={cart.reduce((acc, item) => acc + item.quantity, 0)}
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        onOpenCartDrawer={() => setIsCartDrawerOpen(true)}
        onOpenTrackOrder={() => setIsTrackOrderOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
      />

      {/* Mobile Drawer Menu */}
      <SidebarMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        wishlistCount={wishlist.length}
        cartCount={cart.reduce((acc, item) => acc + item.quantity, 0)}
        onOpenTrackOrder={() => setIsTrackOrderOpen(true)}
      />

      {/* Cart Drawer Panel */}
      <CartDrawer
        isOpen={isCartDrawerOpen}
        onClose={() => setIsCartDrawerOpen(false)}
        cart={cart}
        onUpdateQuantity={updateCartQuantity}
        onRemoveItem={removeFromCart}
        onProceedToCheckout={() => {
          setIsCartDrawerOpen(false);
          setIsCheckoutOpen(true);
        }}
        onViewCartPage={() => {
          setIsCartDrawerOpen(false);
          setActiveTab('cart');
        }}
      />

      {/* Quick View Modal */}
      {quickViewProduct && (
        <QuickViewModal
          product={quickViewProduct}
          onClose={() => setQuickViewProduct(null)}
          onAddToCart={addToCart}
          onBuyNow={buyNow}
          isInWishlist={wishlist.includes(quickViewProduct.id)}
          onToggleWishlist={() => toggleWishlist(quickViewProduct.id)}
        />
      )}

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <CheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          cart={cart}
          userProfile={userProfile}
          subtotal={cartSubtotal}
          couponDiscount={couponDiscount}
          appliedCoupon={appliedCoupon}
          isFreeShipping={isFreeShippingFromCoupon}
          onApplyCoupon={handleApplyCoupon}
          onRemoveCoupon={handleRemoveCoupon}
          onUpdateQuantity={updateCartQuantity}
          onSetItemQuantity={setItemQuantity}
          onOrderComplete={handleOrderComplete}
        />
      )}

      {/* Customer Auth Modal (Login / Signup) */}
      <CustomerAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode="login"
      />

      {/* Order Success Modal */}
      {latestOrder && (
        <OrderSuccessModal
          order={latestOrder}
          onCloseAndGoHome={() => {
            setLatestOrder(null);
            setActiveTab('home');
          }}
          onTrackOrder={() => {
            setLatestOrder(null);
            setIsTrackOrderOpen(true);
          }}
        />
      )}

      {/* Track Order Modal */}
      <TrackOrderModal
        isOpen={isTrackOrderOpen}
        onClose={() => setIsTrackOrderOpen(false)}
      />

      {/* MAIN VIEW CONTENT AREA */}
      <main className="flex-1 pb-16 lg:pb-0">
        {activeTab === 'home' && (
          <div className="animate-fade-in">
            {/* 1. HERO SLIDER (Uses canonical Firestore heroBanners via HeroSlider component) */}
            <HeroSlider 
              onShopClick={() => {
                setActiveTab('shop');
                setSelectedCategory('all');
              }}
            />

            {/* 2. DYNAMIC HOMEPAGE SECTIONS (Driven entirely by Firestore homepageSections) */}
            {activeHomepageSections.map((sec) => {
              const secType = sec.sectionType || sec.type;
              const settings = sec.settings || {};

              // ----------------------------------------------------
              // A. CATEGORIES SECTION
              // ----------------------------------------------------
              if (secType === 'categories') {
                const displayedCategories = (settings.categoryIds && settings.categoryIds.length > 0)
                  ? categories.filter(c => settings.categoryIds!.includes(c.id) || settings.categoryIds!.includes(c.slug))
                  : categories;

                if (displayedCategories.length === 0) return null;

                const gridColsClass = settings.columnsDesktop === 2
                  ? 'lg:grid-cols-2'
                  : settings.columnsDesktop === 3
                  ? 'lg:grid-cols-3'
                  : settings.columnsDesktop === 4
                  ? 'lg:grid-cols-4'
                  : settings.columnsDesktop === 6
                  ? 'lg:grid-cols-6'
                  : 'lg:grid-cols-5';

                const mobileColsClass = settings.columnsMobile === 1 ? 'grid-cols-1' : 'grid-cols-2';

                return (
                  <section key={sec.id} className="py-12 px-4 max-w-7xl mx-auto">
                    <div className="text-center max-w-xl mx-auto mb-8">
                      {sec.subtitle && (
                        <span className="text-xs font-montserrat uppercase tracking-[0.25em] text-[#C5A059] font-bold">
                          {sec.subtitle}
                        </span>
                      )}
                      <h2 className="text-2xl sm:text-3xl font-cormorant font-bold text-[#4A1525] mt-1">
                        {sec.title || 'Explore by Category'}
                      </h2>
                      <div className="w-12 h-0.5 bg-[#C5A059] mx-auto mt-2"></div>
                    </div>

                    <div className={`grid ${mobileColsClass} sm:grid-cols-3 md:grid-cols-4 ${gridColsClass} gap-3 sm:gap-4`}>
                      {displayedCategories.map((cat) => {
                        const catSlug = cat.slug || cat.id;
                        const productCount = products.filter(p => 
                          p.category === catSlug || 
                          p.category === cat.name || 
                          (cat.slug && p.category === cat.slug) ||
                          (p.category && p.category.toLowerCase() === cat.name.toLowerCase())
                        ).length;
                        const displayImg = cat.image || '';

                        return (
                          <div
                            key={cat.id || cat.slug}
                            onClick={() => {
                              setSelectedCategory(catSlug);
                              setActiveTab('shop');
                            }}
                            className="group cursor-pointer bg-white rounded-2xl overflow-hidden border border-[#EFE8DE] shadow-xs hover:shadow-lg transition-all text-center p-3 sm:p-4 hover:border-[#C5A059]"
                          >
                            <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-full overflow-hidden mb-3 border-2 border-amber-100 group-hover:scale-105 transition-transform bg-amber-50/50">
                              {displayImg ? (
                                <img 
                                  src={displayImg} 
                                  alt={cat.imageAlt || `${cat.name} Collection Houseofmahi`} 
                                  className="w-full h-full object-cover" 
                                  referrerPolicy="no-referrer"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[#4A1525] font-serif font-bold text-lg">
                                  {cat.name.charAt(0)}
                                </div>
                              )}
                            </div>
                            <h3 className="text-xs sm:text-sm font-serif font-bold text-[#4A1525] group-hover:text-[#C5A059] transition-colors line-clamp-1">
                              {cat.name}
                            </h3>
                            <p className="text-[10px] text-stone-400 mt-0.5">
                              {cat.productCount !== undefined && cat.productCount > 0 
                                ? `${cat.productCount}+ Designs` 
                                : `${productCount}+ Designs`}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              }

              // ----------------------------------------------------
              // B. FEATURED PRODUCTS & PRODUCT GRID
              // ----------------------------------------------------
              if (secType === 'featured_products' || secType === 'featured' || secType === 'product_grid') {
                const limit = settings.productLimit || 8;
                let displayedProducts: Product[] = [];

                if (settings.productIds && settings.productIds.length > 0) {
                  displayedProducts = products.filter(p => settings.productIds!.includes(p.id));
                } else {
                  displayedProducts = products.slice(0, limit);
                }

                if (displayedProducts.length === 0 && !isSyncing) return null;

                const gridColsClass = settings.columnsDesktop === 2
                  ? 'lg:grid-cols-2'
                  : settings.columnsDesktop === 3
                  ? 'lg:grid-cols-3'
                  : settings.columnsDesktop === 5
                  ? 'lg:grid-cols-5'
                  : settings.columnsDesktop === 6
                  ? 'lg:grid-cols-6'
                  : 'lg:grid-cols-4';

                const mobileColsClass = settings.columnsMobile === 1 ? 'grid-cols-1' : 'grid-cols-2';

                return (
                  <section key={sec.id} className="py-10 bg-[#FAF7F2] border-t border-b border-[#EFE8DE] animate-fade-in">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6">
                      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-3">
                        <div>
                          {sec.subtitle && (
                            <span className="text-xs font-montserrat uppercase tracking-[0.25em] text-[#C5A059] font-bold">
                              {sec.subtitle}
                            </span>
                          )}
                          <h2 className="text-2xl sm:text-3xl font-cormorant font-bold text-[#4A1525] mt-1">
                            {sec.title || 'Featured Collection'}
                          </h2>
                        </div>
                        <button
                          onClick={() => {
                            setActiveTab('shop');
                            setSelectedCategory('all');
                          }}
                          className="inline-flex items-center space-x-1 text-xs font-bold text-[#4A1525] hover:text-[#C5A059] transition-colors group cursor-pointer"
                        >
                          <span>View All Products</span>
                          <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                      </div>

                      <div className={`grid ${mobileColsClass} sm:grid-cols-3 ${gridColsClass} gap-3 sm:gap-6`}>
                        {displayedProducts.length > 0 ? (
                          displayedProducts.map(product => (
                            <ProductCard
                              key={`${sec.id}-${product.id}`}
                              product={product}
                              isWishlisted={wishlist.includes(product.id)}
                              onToggleWishlist={toggleWishlist}
                              onAddToCart={addToCart}
                              onBuyNow={buyNow}
                              onQuickView={setQuickViewProduct}
                            />
                          ))
                        ) : (
                          Array.from({ length: Math.min(limit, 4) }).map((_, idx) => (
                            <div key={`skel-feat-${idx}`} className="bg-[#FAF7F2] rounded-xl border border-[#E8DFC2]/80 overflow-hidden shadow-xs flex flex-col justify-between">
                              <div>
                                <div className="aspect-square bg-stone-200 skeleton-shimmer" />
                                <div className="p-3 space-y-2">
                                  <div className="h-3 bg-stone-200 rounded-sm w-3/4 skeleton-shimmer" />
                                  <div className="h-4 bg-stone-200 rounded-sm w-1/3 skeleton-shimmer" />
                                </div>
                              </div>
                              <div className="p-2 pt-0 space-y-1.5">
                                <div className="h-7 bg-stone-200 rounded-lg w-full skeleton-shimmer" />
                                <div className="h-7 bg-stone-200 rounded-lg w-full skeleton-shimmer" />
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </section>
                );
              }

              // ----------------------------------------------------
              // C. BEST SELLERS
              // ----------------------------------------------------
              if (secType === 'best_sellers') {
                const limit = settings.productLimit || 4;
                let displayedProducts: Product[] = [];

                if (settings.productIds && settings.productIds.length > 0) {
                  displayedProducts = products.filter(p => settings.productIds!.includes(p.id));
                } else {
                  displayedProducts = products.filter(p => p.isBestSeller || p.rating >= 4.8).slice(0, limit);
                  if (displayedProducts.length === 0) {
                    displayedProducts = products.slice(0, limit);
                  }
                }

                if (displayedProducts.length === 0 && !isSyncing) return null;

                return (
                  <section key={sec.id} className="py-12 px-4 sm:px-6 max-w-7xl mx-auto animate-fade-in">
                    <div className="border-b border-[#EFE8DE] pb-3 mb-6 flex items-center justify-between">
                      <div>
                        {sec.subtitle && (
                          <span className="text-[11px] font-montserrat uppercase tracking-widest text-[#C5A059] font-bold block">
                            {sec.subtitle}
                          </span>
                        )}
                        <h3 className="text-xl sm:text-2xl font-cormorant font-bold text-[#4A1525] flex items-center space-x-2">
                          <Star size={18} className="text-amber-500 fill-amber-500" />
                          <span>{sec.title || 'Best Selling Jewels'}</span>
                        </h3>
                      </div>
                      <button 
                        onClick={() => { setActiveTab('shop'); setSelectedCategory('all'); }}
                        className="text-xs font-semibold text-[#8C6A2E] hover:underline"
                      >
                        View More
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                      {displayedProducts.length > 0 ? (
                        displayedProducts.map(product => (
                          <ProductCard
                            key={`${sec.id}-${product.id}`}
                            product={product}
                            isWishlisted={wishlist.includes(product.id)}
                            onToggleWishlist={toggleWishlist}
                            onAddToCart={addToCart}
                            onBuyNow={buyNow}
                            onQuickView={setQuickViewProduct}
                          />
                        ))
                      ) : (
                        Array.from({ length: Math.min(limit, 4) }).map((_, idx) => (
                          <div key={`skel-best-${idx}`} className="bg-[#FAF7F2] rounded-xl border border-[#E8DFC2]/80 overflow-hidden shadow-xs flex flex-col justify-between">
                            <div>
                              <div className="aspect-square bg-stone-200 skeleton-shimmer" />
                              <div className="p-3 space-y-2">
                                <div className="h-3 bg-stone-200 rounded-sm w-3/4 skeleton-shimmer" />
                                <div className="h-4 bg-stone-200 rounded-sm w-1/3 skeleton-shimmer" />
                              </div>
                            </div>
                            <div className="p-2 pt-0 space-y-1.5">
                              <div className="h-7 bg-stone-200 rounded-lg w-full skeleton-shimmer" />
                              <div className="h-7 bg-stone-200 rounded-lg w-full skeleton-shimmer" />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </section>
                );
              }

              // ----------------------------------------------------
              // D. NEW ARRIVALS
              // ----------------------------------------------------
              if (secType === 'new_arrivals') {
                const limit = settings.productLimit || 4;
                let displayedProducts: Product[] = [];

                if (settings.productIds && settings.productIds.length > 0) {
                  displayedProducts = products.filter(p => settings.productIds!.includes(p.id));
                } else {
                  displayedProducts = products.filter(p => p.isNew || p.tags?.includes('New') || p.id === 'p7' || p.id === 'p8').slice(0, limit);
                  if (displayedProducts.length === 0) {
                    displayedProducts = products.slice(0, limit);
                  }
                }

                if (displayedProducts.length === 0 && !isSyncing) return null;

                return (
                  <section key={sec.id} className="py-12 px-4 sm:px-6 max-w-7xl mx-auto animate-fade-in">
                    <div className="border-b border-[#EFE8DE] pb-3 mb-6 flex items-center justify-between">
                      <div>
                        {sec.subtitle && (
                          <span className="text-[11px] font-montserrat uppercase tracking-widest text-[#C5A059] font-bold block">
                            {sec.subtitle}
                          </span>
                        )}
                        <h3 className="text-xl sm:text-2xl font-cormorant font-bold text-[#4A1525] flex items-center space-x-2">
                          <Sparkles size={18} className="text-[#C5A059]" />
                          <span>{sec.title || 'Fresh New Arrivals'}</span>
                        </h3>
                      </div>
                      <button 
                        onClick={() => { setActiveTab('shop'); setSelectedCategory('all'); }}
                        className="text-xs font-semibold text-[#8C6A2E] hover:underline"
                      >
                        View More
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                      {displayedProducts.length > 0 ? (
                        displayedProducts.map(product => (
                          <ProductCard
                            key={`${sec.id}-${product.id}`}
                            product={product}
                            isWishlisted={wishlist.includes(product.id)}
                            onToggleWishlist={toggleWishlist}
                            onAddToCart={addToCart}
                            onBuyNow={buyNow}
                            onQuickView={setQuickViewProduct}
                          />
                        ))
                      ) : (
                        Array.from({ length: Math.min(limit, 4) }).map((_, idx) => (
                          <div key={`skel-new-${idx}`} className="bg-[#FAF7F2] rounded-xl border border-[#E8DFC2]/80 overflow-hidden shadow-xs flex flex-col justify-between">
                            <div>
                              <div className="aspect-square bg-stone-200 skeleton-shimmer" />
                              <div className="p-3 space-y-2">
                                <div className="h-3 bg-stone-200 rounded-sm w-3/4 skeleton-shimmer" />
                                <div className="h-4 bg-stone-200 rounded-sm w-1/3 skeleton-shimmer" />
                              </div>
                            </div>
                            <div className="p-2 pt-0 space-y-1.5">
                              <div className="h-7 bg-stone-200 rounded-lg w-full skeleton-shimmer" />
                              <div className="h-7 bg-stone-200 rounded-lg w-full skeleton-shimmer" />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </section>
                );
              }

              // ----------------------------------------------------
              // E. FLASH SALE
              // ----------------------------------------------------
              if (secType === 'flash_sale') {
                const limit = settings.productLimit || 4;
                let displayedProducts: Product[] = [];

                if (settings.productIds && settings.productIds.length > 0) {
                  displayedProducts = products.filter(p => settings.productIds!.includes(p.id));
                } else {
                  displayedProducts = products.filter(p => p.originalPrice && p.originalPrice > p.price).slice(0, limit);
                  if (displayedProducts.length === 0) {
                    displayedProducts = products.slice(0, limit);
                  }
                }

                if (displayedProducts.length === 0 && !isSyncing) return null;

                return (
                  <section key={sec.id} className="py-12 bg-gradient-to-r from-[#4A1525] to-[#2C0B15] text-white my-8 animate-fade-in">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                        <div>
                          <div className="inline-flex items-center space-x-2 bg-amber-400/20 text-amber-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
                            <Clock size={14} />
                            <span>{settings.flashSaleDiscountText || 'Flash Deal — Limited Quantity'}</span>
                          </div>
                          <h2 className="text-2xl sm:text-3xl font-cormorant font-bold text-amber-100">
                            {sec.title || 'Exclusive Flash Sale'}
                          </h2>
                          {sec.subtitle && (
                            <p className="text-xs sm:text-sm text-stone-300 font-light mt-1">
                              {sec.subtitle}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            setActiveTab('shop');
                            setSelectedCategory('all');
                          }}
                          className="bg-amber-400 hover:bg-amber-300 text-[#4A1525] font-bold px-6 py-2.5 rounded-full text-xs uppercase tracking-wider transition-all self-start md:self-auto cursor-pointer"
                        >
                          Shop Flash Deals
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                        {displayedProducts.length > 0 ? (
                          displayedProducts.map(product => (
                            <ProductCard
                              key={`${sec.id}-${product.id}`}
                              product={product}
                              isWishlisted={wishlist.includes(product.id)}
                              onToggleWishlist={toggleWishlist}
                              onAddToCart={addToCart}
                              onBuyNow={buyNow}
                              onQuickView={setQuickViewProduct}
                            />
                          ))
                        ) : (
                          Array.from({ length: Math.min(limit, 4) }).map((_, idx) => (
                            <div key={`skel-flash-${idx}`} className="bg-white/10 rounded-xl border border-amber-300/20 overflow-hidden shadow-xs flex flex-col justify-between">
                              <div>
                                <div className="aspect-square bg-white/10 skeleton-shimmer" />
                                <div className="p-3 space-y-2">
                                  <div className="h-3 bg-white/15 rounded-sm w-3/4 skeleton-shimmer" />
                                  <div className="h-4 bg-white/15 rounded-sm w-1/3 skeleton-shimmer" />
                                </div>
                              </div>
                              <div className="p-2 pt-0 space-y-1.5">
                                <div className="h-7 bg-white/20 rounded-lg w-full skeleton-shimmer" />
                                <div className="h-7 bg-white/20 rounded-lg w-full skeleton-shimmer" />
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </section>
                );
              }

              // ----------------------------------------------------
              // F. PROMOTIONAL BANNER (In-Page Promo Banner, Not Hero)
              // ----------------------------------------------------
              if (secType === 'promotional_banner' || secType === 'promo_banner') {
                const promoImg = settings.promoImageUrl;
                const promoLink = settings.promoLink || '/shop';
                const promoButtonText = settings.promoButtonText || 'EXPLORE NOW';

                return (
                  <section key={sec.id} className="py-8 px-4 max-w-7xl mx-auto">
                    <div 
                      onClick={() => {
                        if (promoLink.startsWith('http')) {
                          window.open(promoLink, '_blank', 'noopener,noreferrer');
                        } else {
                          setActiveTab('shop');
                        }
                      }}
                      className="relative rounded-2xl overflow-hidden shadow-md cursor-pointer group bg-[#3B111D] text-white min-h-[160px] sm:min-h-[220px] flex items-center p-6 sm:p-10 border border-[#C5A059]/40"
                    >
                      {promoImg && (
                        <img 
                          src={promoImg} 
                          alt={settings.promoImageAlt || sec.title || 'Promotional Offer'} 
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-40 group-hover:opacity-50"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      <div className="relative z-10 max-w-xl">
                        {sec.subtitle && (
                          <span className="text-xs font-montserrat uppercase tracking-[0.25em] text-amber-300 font-bold block mb-1">
                            {sec.subtitle}
                          </span>
                        )}
                        <h2 className="text-2xl sm:text-3xl font-cormorant font-bold text-amber-100">
                          {sec.title || 'Special Collection Showcase'}
                        </h2>
                        <button className="mt-4 bg-[#C5A059] hover:bg-amber-500 text-[#4A1525] font-bold px-6 py-2 rounded-full text-xs uppercase tracking-wider transition-all shadow-md">
                          {promoButtonText}
                        </button>
                      </div>
                    </div>
                  </section>
                );
              }

              // ----------------------------------------------------
              // G. TRUST FEATURES
              // ----------------------------------------------------
              if (secType === 'trust_features') {
                if (settings.badgeItems && settings.badgeItems.length > 0) {
                  return (
                    <section key={sec.id} className="bg-[#FAF7F2] py-8 border-y border-[#EFE8DE]">
                      <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                        {settings.badgeItems.map((badge, idx) => (
                          <div key={badge.id || idx} className="flex items-center space-x-3 p-3 bg-white rounded-xl border border-[#EFE8DE]">
                            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-[#8C6A2E] shrink-0">
                              <ShieldCheck size={20} />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-[#4A1525]">{badge.title}</h4>
                              <p className="text-[10px] text-stone-500">{badge.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  );
                }
                return <FeatureBadges key={sec.id} />;
              }

              // ----------------------------------------------------
              // H. REVIEWS
              // ----------------------------------------------------
              if (secType === 'reviews') {
                return (
                  <section key={sec.id} className="py-14 bg-[#FAF7F2] border-t border-b border-[#EFE8DE]">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6">
                      <div className="text-center max-w-xl mx-auto mb-10">
                        {sec.subtitle && (
                          <span className="text-xs font-montserrat uppercase tracking-[0.25em] text-[#C5A059] font-bold">
                            {sec.subtitle}
                          </span>
                        )}
                        <h2 className="text-2xl sm:text-3xl font-cormorant font-bold text-[#4A1525] mt-1">
                          {sec.title || 'Client Testimonials'}
                        </h2>
                        <div className="w-12 h-0.5 bg-[#C5A059] mx-auto mt-2"></div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {INITIAL_REVIEWS.slice(0, 3).map((rev) => (
                          <div key={rev.id} className="bg-white p-6 rounded-2xl border border-[#EFE8DE] shadow-xs relative">
                            <Quote size={24} className="text-amber-200 absolute top-4 right-4" />
                            <div className="flex items-center space-x-1 text-amber-500 mb-3">
                              {[...Array(rev.rating)].map((_, i) => (
                                <Star key={i} size={14} className="fill-amber-500 text-amber-500" />
                              ))}
                            </div>
                            <p className="text-xs sm:text-sm text-stone-600 italic leading-relaxed mb-4">
                              "{rev.comment}"
                            </p>
                            <div className="flex items-center justify-between border-t border-stone-100 pt-3">
                              <span className="text-xs font-bold text-[#4A1525]">{rev.userName}</span>
                              <span className="text-[10px] text-emerald-600 font-semibold">Verified Buyer</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                );
              }

              // ----------------------------------------------------
              // I. BRAND STORY
              // ----------------------------------------------------
              if (secType === 'brand_story') {
                return (
                  <section key={sec.id} className="py-14 px-4 sm:px-6 max-w-7xl mx-auto">
                    <div className="bg-[#FAF7F2] rounded-3xl p-6 sm:p-12 border border-[#EFE8DE] grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                      <div className="md:col-span-7">
                        {sec.subtitle && (
                          <span className="text-xs font-montserrat uppercase tracking-[0.25em] text-[#C5A059] font-bold">
                            {sec.subtitle}
                          </span>
                        )}
                        <h2 className="text-2xl sm:text-3xl font-cormorant font-bold text-[#4A1525] mt-1 mb-4">
                          {sec.title || 'Our Craft & Heritage'}
                        </h2>
                        <p className="text-xs sm:text-sm text-stone-600 leading-relaxed font-light mb-6">
                          {settings.storyText || 'Houseofmahi brings royal bridal jewellery, kundan sets, and timeless accessories crafted with premium polish and artisanal perfection for every memorable celebration in Bangladesh.'}
                        </p>
                        <button
                          onClick={() => {
                            if (settings.storyButtonLink) {
                              if (settings.storyButtonLink.startsWith('http')) {
                                window.open(settings.storyButtonLink, '_blank', 'noopener,noreferrer');
                              } else {
                                setActiveTab('about');
                              }
                            } else {
                              setActiveTab('about');
                            }
                          }}
                          className="bg-[#4A1525] hover:bg-[#360F1B] text-amber-200 font-bold px-6 py-2.5 rounded-full text-xs uppercase tracking-wider transition-all cursor-pointer"
                        >
                          {settings.storyButtonText || 'Learn Our Story'}
                        </button>
                      </div>
                      <div className="md:col-span-5 flex justify-center">
                        {settings.storyImageUrl ? (
                          <img 
                            src={settings.storyImageUrl} 
                            alt={sec.title || 'Brand Story'} 
                            className="rounded-2xl shadow-md max-h-72 object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-56 rounded-2xl bg-amber-100/50 border border-amber-200 flex flex-col items-center justify-center text-center p-6">
                            <Sparkles className="text-[#C5A059] mb-2" size={32} />
                            <span className="font-cormorant font-bold text-[#4A1525] text-xl">Handcrafted with Elegance</span>
                            <span className="text-[11px] text-stone-500 mt-1">Dhanmondi, Dhaka & All Bangladesh</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </section>
                );
              }

              // ----------------------------------------------------
              // J. NEWSLETTER
              // ----------------------------------------------------
              if (secType === 'newsletter') {
                return (
                  <section key={sec.id} className="py-12 bg-[#FAF7F2] border-t border-[#EFE8DE]">
                    <div className="max-w-xl mx-auto px-4 text-center">
                      <div className="w-12 h-12 rounded-full bg-amber-100 mx-auto flex items-center justify-center text-[#8C6A2E] mb-3">
                        <Mail size={22} />
                      </div>
                      <h2 className="text-2xl font-cormorant font-bold text-[#4A1525]">
                        {sec.title || 'Join the Mahi VIP Club'}
                      </h2>
                      <p className="text-xs text-stone-600 mt-1 mb-6 font-light">
                        {sec.subtitle || 'Subscribe to receive exclusive festive discounts, early bridal drops, and gift offers directly.'}
                      </p>
                      <form onSubmit={(e) => { e.preventDefault(); showToast('Thank you for subscribing! 🎉'); }} className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="email"
                          required
                          placeholder="Enter your email address"
                          className="flex-1 px-4 py-2.5 text-xs rounded-full border border-stone-300 focus:outline-none focus:border-[#4A1525] bg-white"
                        />
                        <button
                          type="submit"
                          className="bg-[#4A1525] hover:bg-[#360F1B] text-amber-200 font-bold px-6 py-2.5 rounded-full text-xs uppercase tracking-wider transition-all"
                        >
                          Subscribe
                        </button>
                      </form>
                    </div>
                  </section>
                );
              }

              // ----------------------------------------------------
              // K. CUSTOM COLLECTION
              // ----------------------------------------------------
              if (secType === 'custom_collection') {
                const limit = settings.productLimit || 6;
                let displayedProducts: Product[] = [];

                if (settings.productIds && settings.productIds.length > 0) {
                  displayedProducts = products.filter(p => settings.productIds!.includes(p.id));
                } else if (settings.categoryIds && settings.categoryIds.length > 0) {
                  displayedProducts = products.filter(p => settings.categoryIds!.includes(p.category)).slice(0, limit);
                } else {
                  displayedProducts = products.slice(0, limit);
                }

                if (displayedProducts.length === 0 && !isSyncing) return null;

                return (
                  <section key={sec.id} className="py-10 px-4 sm:px-6 max-w-7xl mx-auto animate-fade-in">
                    <div className="flex items-end justify-between mb-6">
                      <div>
                        {sec.subtitle && (
                          <span className="text-[11px] font-montserrat uppercase tracking-widest text-[#C5A059] font-bold block">
                            {sec.subtitle}
                          </span>
                        )}
                        <h3 className="text-xl sm:text-2xl font-cormorant font-bold text-[#4A1525]">
                          {sec.title || 'Curated Collection'}
                        </h3>
                      </div>
                      <button
                        onClick={() => { setActiveTab('shop'); setSelectedCategory('all'); }}
                        className="text-xs font-semibold text-[#8C6A2E] hover:underline"
                      >
                        View Collection
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                      {displayedProducts.length > 0 ? (
                        displayedProducts.map(product => (
                          <ProductCard
                            key={`${sec.id}-${product.id}`}
                            product={product}
                            isWishlisted={wishlist.includes(product.id)}
                            onToggleWishlist={toggleWishlist}
                            onAddToCart={addToCart}
                            onBuyNow={buyNow}
                            onQuickView={setQuickViewProduct}
                          />
                        ))
                      ) : (
                        Array.from({ length: Math.min(limit, 4) }).map((_, idx) => (
                          <div key={`skel-cust-${idx}`} className="bg-[#FAF7F2] rounded-xl border border-[#E8DFC2]/80 overflow-hidden shadow-xs flex flex-col justify-between">
                            <div>
                              <div className="aspect-square bg-stone-200 skeleton-shimmer" />
                              <div className="p-3 space-y-2">
                                <div className="h-3 bg-stone-200 rounded-sm w-3/4 skeleton-shimmer" />
                                <div className="h-4 bg-stone-200 rounded-sm w-1/3 skeleton-shimmer" />
                              </div>
                            </div>
                            <div className="p-2 pt-0 space-y-1.5">
                              <div className="h-7 bg-stone-200 rounded-lg w-full skeleton-shimmer" />
                              <div className="h-7 bg-stone-200 rounded-lg w-full skeleton-shimmer" />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </section>
                );
              }

              return null;
            })}
          </div>
        )}

        {activeTab === 'shop' && (
          <ShopPage
            products={products}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            wishlist={wishlist}
            onToggleWishlist={toggleWishlist}
            onAddToCart={addToCart}
            onBuyNow={buyNow}
            onQuickView={setQuickViewProduct}
          />
        )}

        {activeTab === 'wishlist' && (
          <WishlistPage
            wishlistIds={wishlist}
            allProducts={products}
            onRemoveFromWishlist={toggleWishlist}
            onAddToCart={addToCart}
            onBuyNow={buyNow}
            onQuickView={setQuickViewProduct}
            onGoToShop={() => {
              setActiveTab('shop');
              setSelectedCategory('all');
            }}
          />
        )}

        {activeTab === 'cart' && (
          <CartPage
            cart={cart}
            onUpdateQuantity={updateCartQuantity}
            onRemoveItem={removeFromCart}
            orderNote={orderNote}
            setOrderNote={setOrderNote}
            appliedCoupon={appliedCoupon}
            setAppliedCoupon={setAppliedCoupon}
            couponDiscount={couponDiscount}
            onApplyCoupon={handleApplyCoupon}
            onRemoveCoupon={handleRemoveCoupon}
            onProceedToCheckout={() => setIsCheckoutOpen(true)}
            onContinueShopping={() => {
              setActiveTab('shop');
              setSelectedCategory('all');
            }}
          />
        )}

        {activeTab === 'account' && (
          <AccountPage
            orders={orders}
            onNavigateToWishlist={() => setActiveTab('wishlist')}
            onNavigateToShop={() => {
              setActiveTab('shop');
              setSelectedCategory('all');
            }}
            onTrackOrder={() => {
              setIsTrackOrderOpen(true);
            }}
          />
        )}

        {activeTab === 'about' && (
          <AboutPage />
        )}

        {activeTab === 'contact' && (
          <ContactPage />
        )}

        {activeTab === 'faq' && (
          <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8 animate-fade-in">
            <div className="text-center space-y-2.5">
              <div className="inline-flex items-center justify-center p-3 bg-[#FAF7F2] text-[#4A1525] rounded-full border border-[#E8DFC2] mb-1">
                <HelpCircle size={26} />
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-[#4A1525]">Frequently Asked Questions (FAQs) & Help</h1>
              <p className="text-xs sm:text-sm text-stone-600 max-w-xl mx-auto leading-relaxed">
                Find clear answers to common questions about jewelry ordering, payment, delivery, order tracking, and customer support at House of Mahi.
              </p>
            </div>

            <div className="space-y-3.5">
              {[
                {
                  id: 1,
                  q: "How can I place an order?",
                  a: "Browse our collection on the website, select your favorite jewelry item along with your preferred polish or size, click 'Add to Cart' or 'Buy Now', and fill in your delivery details in the Checkout section. You can also place direct orders via our WhatsApp (01400-031902)."
                },
                {
                  id: 2,
                  q: "Do I need an account to place an order?",
                  a: "No, an account is not mandatory. You can quickly place an order as a guest. However, creating an account helps you view past orders, track deliveries effortlessly, and save your wishlist."
                },
                {
                  id: 3,
                  q: "How will my order be confirmed?",
                  a: "After placing an order, our customer support team may call you on your provided phone number to confirm your order and delivery address. Please keep your phone reachable. If we are unable to verify the confirmation via phone, order processing and dispatch may not proceed."
                },
                {
                  id: 4,
                  q: "How long does delivery take?",
                  a: "Inside Dhaka: Typically delivered within 24 to 48 hours. Outside Dhaka: Delivered within 2 to 4 business days via reliable courier services."
                },
                {
                  id: 5,
                  q: "What is the delivery charge?",
                  a: "Regular delivery charge is ৳80 all over Bangladesh. Orders of ৳2,000 or more qualify for FREE Home Delivery."
                },
                {
                  id: 6,
                  q: "Is delivery available all over Bangladesh?",
                  a: "Yes, we provide nationwide home delivery service covering all 64 districts across Bangladesh via trusted courier partners."
                },
                {
                  id: 7,
                  q: "Can I track my order?",
                  a: "Yes, you can track the real-time status of your order at any time directly through our website."
                },
                {
                  id: 8,
                  q: "How can I track my order?",
                  a: "Click on 'Track Order' from the top header or the mobile side menu, enter your Order ID / Order Number (e.g. HOM-1001) and your registered Phone Number, then click 'Track Order' to see current dispatch and courier progress."
                },
                {
                  id: 9,
                  q: "Can I change my delivery address after placing an order?",
                  a: "Yes, if your order has not been dispatched yet. Please contact us immediately via WhatsApp or phone call at 01400-031902 with your Order ID to update your address."
                },
                {
                  id: 10,
                  q: "Can I cancel my order?",
                  a: "You can request order cancellation before the parcel is handed over to the courier by contacting our support team via WhatsApp or call (01400-031902)."
                },
                {
                  id: 11,
                  q: "What payment methods are available?",
                  a: "We support Cash on Delivery (COD), bKash, Nagad, and secure Online Payment cards."
                },
                {
                  id: 12,
                  q: "Can I pay by Cash on Delivery?",
                  a: "Yes, Cash on Delivery is available nationwide across Bangladesh. You can pay the total amount directly to the delivery person upon receiving your parcel."
                },
                {
                  id: 13,
                  q: "What should I do if I receive a damaged or incorrect product?",
                  a: "Please check your parcel in front of the delivery person if possible. In case of any damage or incorrect item, take a clear photo/video and notify us within 24 hours on WhatsApp (01400-031902). We will promptly resolve it."
                },
                {
                  id: 14,
                  q: "What is the return/replacement policy?",
                  a: "If you receive a defective or wrong item, we provide a quick replacement upon verification. The product must be unused and in its original packaging."
                },
                {
                  id: 15,
                  q: "How can I contact customer support?",
                  a: "You can reach us anytime by calling or messaging on WhatsApp at 01400-031902, emailing us at mahimamahi456789@gmail.com, or through our official Facebook and Instagram pages."
                }
              ].map((faq) => (
                <details 
                  key={faq.id} 
                  className="group bg-white rounded-2xl border border-[#E8DFC2] p-4 sm:p-5 shadow-xs open:ring-1 open:ring-[#4A1525]/20 transition-all"
                >
                  <summary className="font-semibold text-xs sm:text-sm text-stone-900 flex items-center justify-between cursor-pointer list-none select-none">
                    <span className="flex items-center space-x-2.5">
                      <span className="w-6 h-6 rounded-full bg-[#FAF7F2] text-[#4A1525] font-bold text-[11px] flex items-center justify-center shrink-0 border border-[#E8DFC2]">
                        {faq.id}
                      </span>
                      <span>{faq.q}</span>
                    </span>
                    <ChevronDown size={16} className="text-stone-400 group-open:rotate-180 transition-transform shrink-0 ml-2" />
                  </summary>
                  <div className="mt-3.5 pt-3 border-t border-stone-100 text-xs sm:text-sm text-stone-600 leading-relaxed pl-8">
                    {faq.a}
                  </div>
                </details>
              ))}
            </div>

            <div className="p-5 sm:p-6 bg-[#4A1525] text-white rounded-2xl text-center space-y-2 border border-[#6E2439]">
              <h3 className="font-serif font-bold text-base text-amber-200">Still have questions?</h3>
              <p className="text-xs text-[#E0D5C5] max-w-md mx-auto">
                Our customer care team is always happy to assist you with styling advice, jewelry sizing, and order queries.
              </p>
              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                <a 
                  href="https://wa.me/8801400031902" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-full transition-colors"
                >
                  <span>💬 Chat on WhatsApp</span>
                </a>
                <a 
                  href="tel:01400031902" 
                  className="inline-flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-amber-200 font-bold text-xs px-4 py-2.5 rounded-full transition-colors border border-amber-300/30"
                >
                  <span>📞 Call: 01400-031902</span>
                </a>
              </div>
            </div>
          </main>
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        cartCount={cart.reduce((acc, item) => acc + item.quantity, 0)}
        wishlistCount={wishlist.length}
        onOpenCartDrawer={() => setIsCartDrawerOpen(true)}
      />

      {/* Footer */}
      <Footer
        setActiveTab={setActiveTab}
        setSelectedCategory={setSelectedCategory}
      />

    </div>
  );
}

export default App;
