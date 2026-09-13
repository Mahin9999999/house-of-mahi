import { create } from 'zustand';
import { 
  Product, 
  Category, 
  Order, 
  OrderStatus, 
  HeroBanner, 
  HomepageSection, 
  MarketingPixelsConfig, 
  SeoConfig,
  PageSeoItem,
  StoreSettings, 
  DashboardAnalytics,
  DashboardTimeFilter,
  DashboardStoreHealthMetrics,
  ProductDemandIntelligence,
  CategoryDemandAnalysis,
  Coupon,
  CourierServiceConfig,
  CourierBookingResult
} from '../types';
import { 
  PRODUCTS, 
  CATEGORIES, 
  INITIAL_ORDERS, 
  MARKETING_PIXELS_CONFIG, 
  SEO_CONFIG,
  DEFAULT_PAGES_SEO,
  STORE_SETTINGS, 
  INITIAL_ANALYTICS 
} from '../data';
import {
  subscribeToProducts,
  createProductInFirestore,
  updateProductInFirestore,
  deleteProductFromFirestore,
  subscribeToOrders,
  createOrderInFirestore,
  updateOrderStatusInFirestore,
  subscribeToCategories,
  setCategoryInFirestore,
  deleteCategoryFromFirestore,
  mergeCategoriesInFirestore,
  subscribeToHeroBanners,
  createHeroBannerInFirestore,
  updateHeroBannerInFirestore,
  deleteHeroBannerFromFirestore,
  toggleHeroBannerStatusInFirestore,
  reorderHeroBannersInFirestore,
  subscribeToHomepageSections,
  createHomepageSectionInFirestore,
  updateHomepageSectionInFirestore,
  deleteHomepageSectionFromFirestore,
  toggleHomepageSectionStatusInFirestore,
  reorderHomepageSectionsInFirestore,
  subscribeToCoupons,
  saveCouponToFirestore,
  setCouponInFirestore,
  deleteCouponFromFirestore,
  subscribeToMarketingConfig,
  saveMarketingConfigToFirestore,
  subscribeToSeoConfig,
  saveSeoConfigToFirestore,
  subscribeToPageSeoList,
  savePageSeoListToFirestore,
  subscribeToCourierConfigs,
  saveCourierConfigToFirestore,
  deleteCourierConfigFromFirestore,
  subscribeToStoreSettings,
  saveStoreSettingsToFirestore
} from '../firebase/firestoreService';
import { trackingService } from '../services/trackingService';
import { INITIAL_COURIER_CONFIGS, executeAutoCourierBooking } from '../services/courierService';

// Storage cache key for resilient homepage sections synchronization
const HOMEPAGE_SECTIONS_STORAGE_KEY = 'hom_homepage_sections_cache_v2';

/**
 * Normalizes a raw homepage section object from Firestore or LocalStorage cache
 * guaranteeing all required fields, boolean flags, sorting orders, and schema stability.
 */
function normalizeHomepageSection(raw: any, fallbackOrder: number = 1): HomepageSection {
  if (!raw || typeof raw !== 'object') {
    return {
      id: `sec-${Date.now()}-${fallbackOrder}`,
      title: '',
      subtitle: '',
      sectionType: 'categories',
      type: 'categories',
      sortOrder: fallbackOrder,
      displayOrder: fallbackOrder,
      isActive: true,
      enabled: true,
      settings: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  const sortOrder = typeof raw.sortOrder === 'number' 
    ? raw.sortOrder 
    : (typeof raw.displayOrder === 'number' ? raw.displayOrder : fallbackOrder);
  const displayOrder = typeof raw.displayOrder === 'number' ? raw.displayOrder : sortOrder;
  const isActive = raw.isActive !== undefined ? Boolean(raw.isActive) : (raw.enabled !== undefined ? Boolean(raw.enabled) : true);
  const enabled = raw.enabled !== undefined ? Boolean(raw.enabled) : isActive;
  const sectionType = raw.sectionType || raw.type || 'categories';
  const type = raw.type || sectionType;

  return {
    ...raw,
    id: String(raw.id || `sec-${Date.now()}-${fallbackOrder}`),
    title: raw.title || '',
    subtitle: raw.subtitle || '',
    sectionType,
    type,
    sortOrder,
    displayOrder,
    isActive,
    enabled,
    settings: (raw.settings && typeof raw.settings === 'object') ? raw.settings : {},
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString()
  };
}

/**
 * Safely parses and hydrates homepage sections from localStorage.
 * Resilient against malformed JSON, corrupted data, or SSR environments.
 */
function getHydratedHomepageSections(): HomepageSection[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(HOMEPAGE_SECTIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item): item is Record<string, any> => Boolean(item && typeof item === 'object' && item.id))
      .map((item, idx) => normalizeHomepageSection(item, idx + 1))
      .sort((a, b) => (a.sortOrder ?? a.displayOrder ?? 0) - (b.sortOrder ?? b.displayOrder ?? 0));
  } catch (err) {
    console.warn('Failed to parse cached homepage sections from localStorage:', err);
    return [];
  }
}

/**
 * Safely writes homepage sections to localStorage cache.
 */
function safePersistHomepageCache(list: HomepageSection[]) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(HOMEPAGE_SECTIONS_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('Failed to write homepage sections cache to localStorage:', e);
  }
}

interface AdminStoreState {
  // Authentication
  isAdminAuthenticated: boolean;
  adminToken: string | null;
  adminUsername: string | null;
  adminLogin: (username: string, pass: string) => boolean;
  adminLogout: () => void;

  // Cloud Sync State
  isSyncing: boolean;
  syncError: string | null;
  initializeFirestoreSync: () => () => void;

  // Products
  products: Product[];
  addProduct: (product: Omit<Product, 'id'>) => Promise<string>;
  updateProduct: (id: string, updated: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  bulkUpdateStock: (updates: { id: string; stockQuantity: number }[]) => Promise<void>;

  // Categories
  categories: Category[];
  addCategory: (category: Omit<Category, 'id'>) => Promise<void>;
  updateCategory: (id: string, updated: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  mergeCategories: (sourceCategoryIds: string[], targetCategoryId: string) => Promise<boolean>;

  // Orders
  orders: Order[];
  addOrder: (order: Order) => Promise<string>;
  updateOrderStatus: (orderId: string, status: OrderStatus, trackingNumber?: string, courierName?: string) => Promise<void>;
  bulkUpdateOrderStatus: (orderIds: string[], status: OrderStatus) => Promise<{ successCount: number; failCount: number }>;
  addOrderAdminNote: (orderId: string, note: string) => Promise<void>;

  // 1. HERO BANNERS (Canonical Collection: 'heroBanners')
  heroBanners: HeroBanner[];
  banners: HeroBanner[]; // Backward compatibility alias
  addHeroBanner: (banner: Omit<HeroBanner, 'id'>) => Promise<string>;
  updateHeroBanner: (id: string, updated: Partial<HeroBanner>) => Promise<void>;
  deleteHeroBanner: (id: string) => Promise<void>;
  toggleHeroBannerStatus: (id: string, isActive: boolean) => Promise<void>;
  reorderHeroBanners: (reordered: HeroBanner[]) => Promise<void>;

  // Legacy Banner Aliases for Backward Compatibility
  addBanner: (banner: Omit<HeroBanner, 'id'>) => Promise<void>;
  updateBanner: (id: string, updated: Partial<HeroBanner>) => Promise<void>;
  deleteBanner: (id: string) => Promise<void>;
  reorderBanners: (reordered: HeroBanner[]) => void;

  // Coupons
  coupons: Coupon[];
  addCoupon: (coupon: Omit<Coupon, 'id'>) => Promise<void>;
  updateCoupon: (id: string, updated: Partial<Coupon>) => Promise<void>;
  deleteCoupon: (id: string) => Promise<void>;

  // 2. HOMEPAGE BUILDER (Canonical Collection: 'homepageSections')
  homepageSections: HomepageSection[];
  addHomepageSection: (section: Omit<HomepageSection, 'id'>) => Promise<string>;
  updateHomepageSection: (id: string, updated: Partial<HomepageSection>) => Promise<void>;
  deleteHomepageSection: (id: string) => Promise<void>;
  toggleHomepageSectionStatus: (id: string, isActive: boolean) => Promise<void>;
  reorderHomepageSections: (reordered: HomepageSection[]) => Promise<void>;

  // Marketing & Pixels
  marketingPixels: MarketingPixelsConfig;
  updateMarketingPixels: (updated: Partial<MarketingPixelsConfig>) => void;

  // Global SEO & Page-Level SEO Config
  seoConfig: SeoConfig;
  pagesSeo: PageSeoItem[];
  updateSeoConfig: (updated: Partial<SeoConfig>) => void;
  updatePageSeo: (id: string, updated: Partial<PageSeoItem>) => void;
  resetPagesSeoToDefault: () => void;

  // Store Settings
  storeSettings: StoreSettings;
  updateStoreSettings: (updated: Partial<StoreSettings>) => void;

  // Courier Services Management & Automation
  couriers: CourierServiceConfig[];
  addCourierConfig: (courier: Omit<CourierServiceConfig, 'id'>) => Promise<void>;
  updateCourierConfig: (id: string, updated: Partial<CourierServiceConfig>) => Promise<void>;
  deleteCourierConfig: (id: string) => Promise<void>;
  setCourierPriority: (reordered: CourierServiceConfig[]) => Promise<void>;
  setDefaultCourier: (id: string) => Promise<void>;
  autoBookOrderWithCourier: (orderId: string, forcedCourierId?: string) => Promise<CourierBookingResult>;
  batchAutoBookOrders: (orderIds: string[]) => Promise<{ successCount: number; failCount: number; results: CourierBookingResult[] }>;

  // Computed Analytics & Intelligence
  getAnalytics: () => DashboardAnalytics;
  getDashboardStoreHealthMetrics: (timeFilter: DashboardTimeFilter) => DashboardStoreHealthMetrics;
  getDemandIntelligence: (timeFilter?: DashboardTimeFilter, categoryId?: string) => {
    productDemandList: ProductDemandIntelligence[];
    fastMovingProducts: ProductDemandIntelligence[];
    slowMovingProducts: ProductDemandIntelligence[];
    criticalRestockProducts: ProductDemandIntelligence[];
    categoryDemandList: CategoryDemandAnalysis[];
    totalUnitsSold: number;
    topCategoryName: string;
  };
}

export const useAdminStore = create<AdminStoreState>((set, get) => ({
  // Admin Auth State (default logged in for easy admin review)
  isAdminAuthenticated: true,
  adminToken: 'admin-mock-token-houseofmahi',
  adminUsername: 'admin',

  adminLogin: (username: string, pass: string) => {
    if ((username === 'admin' && pass === 'admin123') || (username === 'mahi' && pass === 'mahi2026')) {
      set({
        isAdminAuthenticated: true,
        adminToken: `token-${Date.now()}`,
        adminUsername: username
      });
      return true;
    }
    return false;
  },

  adminLogout: () => {
    set({
      isAdminAuthenticated: false,
      adminToken: null,
      adminUsername: null
    });
  },

  // Real-time Cloud Synchronization
  isSyncing: false,
  syncError: null,

  initializeFirestoreSync: () => {
    set({ isSyncing: true, syncError: null });

    const unsubscribers: (() => void)[] = [];

    try {
      // 1. Subscribe to Products
      const unsubProducts = subscribeToProducts(
        (firestoreProducts) => {
          if (firestoreProducts && firestoreProducts.length > 0) {
            set({ products: firestoreProducts, isSyncing: false });
          } else {
            set({ products: PRODUCTS, isSyncing: false });
          }
        },
        (err) => {
          console.warn('Products sync warning:', err.message);
          set({ isSyncing: false });
        }
      );
      unsubscribers.push(unsubProducts);

      // 2. Subscribe to Orders
      const unsubOrders = subscribeToOrders(
        (firestoreOrders) => {
          if (firestoreOrders && firestoreOrders.length > 0) {
            const normalizedOrders = firestoreOrders.map(ord => {
              let normStatus: OrderStatus = 'Pending';
              const raw = (ord.status as string || '').toLowerCase().trim();
              
              if (raw === 'pending confirmation' || raw === 'pending_confirmation' || raw === 'pending') {
                normStatus = 'Pending';
              } else if (raw === 'confirmed') {
                normStatus = 'Confirmed';
              } else if (raw === 'processing' || raw === 'packed') {
                normStatus = 'Processing';
              } else if (raw === 'shipped' || raw === 'shipping' || raw === 'courier') {
                normStatus = 'Shipped';
              } else if (raw === 'delivered' || raw === 'completed') {
                normStatus = 'Delivered';
              } else if (raw === 'cancelled' || raw === 'canceled') {
                normStatus = 'Cancelled';
              } else if (raw === 'refunded' || raw === 'refund') {
                normStatus = 'Refunded';
              } else {
                normStatus = 'Pending';
              }

              return {
                ...ord,
                status: normStatus
              };
            });
            set({ orders: normalizedOrders });
          }
        },
        (err) => console.warn('Orders sync warning:', err.message)
      );
      unsubscribers.push(unsubOrders);

      // 3. Subscribe to Categories
      const unsubCats = subscribeToCategories(
        (firestoreCats) => {
          if (firestoreCats && firestoreCats.length > 0) {
            set({ categories: firestoreCats });
          } else {
            set({ categories: CATEGORIES });
          }
        },
        (err) => console.warn('Categories sync warning:', err.message)
      );
      unsubscribers.push(unsubCats);

      // 4. Subscribe to HERO BANNERS (Real Firestore sync with fallback safety)
      const unsubHeroBanners = subscribeToHeroBanners(
        (firestoreHeroBanners) => {
          const list = firestoreHeroBanners || [];
          // Keep store synchronized with Firestore list; also keep fallback if any exists
          set((state) => {
            if (list.length > 0) {
              return { heroBanners: list, banners: list };
            }
            // If firestore is empty, preserve state if it has valid banners, or fallback cleanly
            return {
              heroBanners: state.heroBanners.length > 0 ? state.heroBanners : [],
              banners: state.banners.length > 0 ? state.banners : []
            };
          });
        },
        (err) => console.warn('Hero Banners sync warning:', err.message)
      );
      unsubscribers.push(unsubHeroBanners);

      // 5. Subscribe to HOMEPAGE SECTIONS (Canonical Firestore sync with resilient cache fallback)
      const unsubHomepageSections = subscribeToHomepageSections(
        (firestoreSections) => {
          if (firestoreSections && firestoreSections.length > 0) {
            // Canonical Firestore source has records -> normalize, sort, update store & cache
            const normalized = firestoreSections
              .map((s, idx) => normalizeHomepageSection(s, idx + 1))
              .sort((a, b) => (a.sortOrder ?? a.displayOrder ?? 0) - (b.sortOrder ?? b.displayOrder ?? 0));

            set({ homepageSections: normalized });
            safePersistHomepageCache(normalized);
          } else {
            // Firestore snapshot returned 0 documents (unseeded or empty database)
            // Prevent wiping out valid UI state if local cache or memory already has sections
            set((state) => {
              if (state.homepageSections && state.homepageSections.length > 0) {
                // Keep existing in-memory state
                return {};
              }
              const cached = getHydratedHomepageSections();
              if (cached.length > 0) {
                return { homepageSections: cached };
              }
              return { homepageSections: [] };
            });
          }
        },
        (err) => {
          console.warn('Homepage sections sync warning:', err.message);
          // If firestore read error occurs, fallback gracefully to hydrated cache
          set((state) => {
            if (!state.homepageSections || state.homepageSections.length === 0) {
              const cached = getHydratedHomepageSections();
              if (cached.length > 0) {
                return { homepageSections: cached };
              }
            }
            return {};
          });
        }
      );
      unsubscribers.push(unsubHomepageSections);

      // 6. Subscribe to Coupons
      const unsubCoupons = subscribeToCoupons(
        (firestoreCoupons) => {
          if (firestoreCoupons && firestoreCoupons.length > 0) {
            set({ coupons: firestoreCoupons });
          } else {
            set({ coupons: [] });
          }
        },
        (err) => console.warn('Coupons sync warning:', err.message)
      );
      unsubscribers.push(unsubCoupons);

      // 7. Subscribe to Marketing & Analytics Tracking Configuration
      const unsubMarketing = subscribeToMarketingConfig(
        (firestoreConfig) => {
          if (firestoreConfig) {
            const merged = { ...MARKETING_PIXELS_CONFIG, ...firestoreConfig };
            set({ marketingPixels: merged });
            trackingService.syncConfig(merged);
          } else {
            trackingService.syncConfig(MARKETING_PIXELS_CONFIG);
          }
        },
        (err) => {
          console.warn('Marketing config sync warning:', err.message);
          trackingService.syncConfig(get().marketingPixels);
        }
      );
      unsubscribers.push(unsubMarketing);

      // 8. Subscribe to Global SEO Configuration
      const unsubSeo = subscribeToSeoConfig(
        (firestoreSeo) => {
          if (firestoreSeo) {
            set({ seoConfig: { ...SEO_CONFIG, ...firestoreSeo } });
          } else {
            set({ seoConfig: SEO_CONFIG });
          }
        },
        (err) => console.warn('SEO config sync warning:', err.message)
      );
      unsubscribers.push(unsubSeo);

      // 9. Subscribe to Page-Specific SEO Configuration
      const unsubPagesSeo = subscribeToPageSeoList(
        (firestorePages) => {
          if (firestorePages && firestorePages.length > 0) {
            set({ pagesSeo: firestorePages });
          } else {
            set({ pagesSeo: DEFAULT_PAGES_SEO });
          }
        },
        (err) => console.warn('Pages SEO sync warning:', err.message)
      );
      unsubscribers.push(unsubPagesSeo);

      // 10. Subscribe to Courier Services Configuration
      const unsubCouriers = subscribeToCourierConfigs(
        (firestoreCouriers) => {
          if (firestoreCouriers && firestoreCouriers.length > 0) {
            const sorted = [...firestoreCouriers].sort((a, b) => a.priority - b.priority);
            set({ couriers: sorted });
          } else {
            // Preserve current store couriers if already loaded/modified, otherwise use INITIAL_COURIER_CONFIGS
            set((state) => ({
              couriers: state.couriers && state.couriers.length > 0 ? state.couriers : INITIAL_COURIER_CONFIGS
            }));
          }
        },
        (err) => console.warn('Courier config sync warning:', err.message)
      );
      unsubscribers.push(unsubCouriers);

      // 11. Subscribe to Store & Delivery Settings
      const unsubStoreSettings = subscribeToStoreSettings((settings) => {
        if (settings) {
          set((state) => ({
            storeSettings: {
              ...state.storeSettings,
              ...settings
            }
          }));
        }
      });
      unsubscribers.push(unsubStoreSettings);

    } catch (error: any) {
      console.error('Failed to initialize Firestore sync:', error);
      set({ isSyncing: false, syncError: error.message || 'Firestore connection issue' });
    }

    return () => {
      unsubscribers.forEach((unsub) => unsub && unsub());
    };
  },

  // Products CRUD with Firestore Persistence
  products: PRODUCTS,

  addProduct: async (newProductData) => {
    const newId = `hom-prod-${Date.now()}`;
    const newProduct: Product = {
      id: newId,
      ...newProductData,
      rating: 5.0,
      reviewsCount: 0,
      viewsCount: 1,
      addedToCartCount: 0,
      wishlistCount: 0,
      salesCount: 0,
      demandScore: 10,
      inStock: (newProductData.stockQuantity ?? 10) > 0,
      createdAt: new Date().toISOString()
    };

    set((state) => ({
      products: [newProduct, ...state.products]
    }));

    try {
      await createProductInFirestore(newProduct, newId);
    } catch (err) {
      console.error('Failed to persist product:', err);
    }

    return newId;
  },

  updateProduct: async (id, updated) => {
    set((state) => ({
      products: state.products.map((p) => {
        if (p.id === id) {
          const nextStock = updated.stockQuantity !== undefined ? updated.stockQuantity : p.stockQuantity;
          const nextInStock = nextStock !== undefined ? nextStock > 0 : p.inStock;
          return {
            ...p,
            ...updated,
            stockQuantity: nextStock,
            inStock: nextInStock
          };
        }
        return p;
      })
    }));

    try {
      await updateProductInFirestore(id, updated);
    } catch (err) {
      console.error(`Failed to update product ${id}:`, err);
    }
  },

  deleteProduct: async (id) => {
    set((state) => ({
      products: state.products.filter((p) => p.id !== id)
    }));

    try {
      await deleteProductFromFirestore(id);
    } catch (err) {
      console.error(`Failed to delete product ${id}:`, err);
    }
  },

  bulkUpdateStock: async (updates) => {
    set((state) => ({
      products: state.products.map((p) => {
        const updateItem = updates.find((u) => u.id === p.id);
        if (updateItem) {
          return {
            ...p,
            stockQuantity: updateItem.stockQuantity,
            inStock: updateItem.stockQuantity > 0
          };
        }
        return p;
      })
    }));

    const updatePromises = updates.map((u) =>
      updateProductInFirestore(u.id, {
        stockQuantity: u.stockQuantity,
        inStock: u.stockQuantity > 0
      })
    );
    await Promise.all(updatePromises);
  },

  // Categories CRUD with Firestore Persistence
  categories: CATEGORIES,

  addCategory: async (categoryData) => {
    const newId = `cat-${Date.now()}`;
    const newCategory: Category = {
      id: newId,
      ...categoryData,
      displayOrder: get().categories.length + 1,
      productCount: 0
    };

    set((state) => ({
      categories: [...state.categories, newCategory]
    }));

    try {
      await setCategoryInFirestore(newId, newCategory);
    } catch (err) {
      console.error('Failed to persist category:', err);
    }
  },

  updateCategory: async (id, updated) => {
    set((state) => ({
      categories: state.categories.map((c) => (c.id === id ? { ...c, ...updated } : c))
    }));

    try {
      await setCategoryInFirestore(id, updated);
    } catch (err) {
      console.error(`Failed to update category ${id}:`, err);
    }
  },

  deleteCategory: async (id) => {
    set((state) => ({
      categories: state.categories.filter((c) => c.id !== id)
    }));

    try {
      await deleteCategoryFromFirestore(id);
    } catch (err) {
      console.error(`Failed to delete category ${id}:`, err);
    }
  },

  mergeCategories: async (sourceCategoryIds, targetCategoryId) => {
    if (!sourceCategoryIds || sourceCategoryIds.length === 0 || !targetCategoryId) {
      return false;
    }

    const state = get();
    const targetCat = state.categories.find(c => c.id === targetCategoryId);
    if (!targetCat) {
      console.error('Target category not found for merge operation.');
      return false;
    }

    const targetSlug = targetCat.slug;
    const targetName = targetCat.name;

    const sourceCats = state.categories.filter(c => sourceCategoryIds.includes(c.id));
    const sourceSlugs = new Set(sourceCats.map(c => (c.slug || '').toLowerCase().trim()));
    const sourceNames = new Set(sourceCats.map(c => (c.name || '').toLowerCase().trim()));

    // 1. Optimistically update products state
    const updatedProducts: Product[] = state.products.map(p => {
      const prodCat = (p.category || '').toLowerCase().trim();
      const prodCatLabel = (p.categoryLabel || '').toLowerCase().trim();
      const isMatch = 
        sourceCategoryIds.includes(p.category as string) ||
        sourceSlugs.has(prodCat) ||
        sourceNames.has(prodCatLabel);

      if (isMatch) {
        return {
          ...p,
          category: targetSlug as any,
          categoryLabel: targetName
        };
      }
      return p;
    });

    // 2. Optimistically update subcategories that belonged to merged sources
    const updatedCategories: Category[] = state.categories
      .filter(c => !sourceCategoryIds.includes(c.id) || c.id === targetCategoryId)
      .map(c => {
        if (c.parentCategory && (sourceCategoryIds.includes(c.parentCategory) || sourceSlugs.has(c.parentCategory.toLowerCase().trim()))) {
          return {
            ...c,
            parentCategory: targetSlug
          };
        }
        return c;
      });

    set({
      products: updatedProducts,
      categories: updatedCategories
    });

    // 3. Persist to Firestore
    try {
      const success = await mergeCategoriesInFirestore(
        sourceCategoryIds,
        targetCategoryId,
        targetName,
        targetSlug
      );
      return success;
    } catch (err) {
      console.error('Failed to merge categories in Firestore:', err);
      return false;
    }
  },

  // Orders CRUD with Real-time Intelligence & Courier Automation
  orders: INITIAL_ORDERS,

  addOrder: async (newOrder) => {
    set((state) => ({
      orders: [newOrder, ...state.orders]
    }));

    // Update sales metrics for ordered products
    set((state) => ({
      products: state.products.map((p) => {
        const itemInOrder = newOrder.items.find((item) => item.product.id === p.id);
        if (itemInOrder) {
          const addedSales = itemInOrder.quantity;
          const nextStock = Math.max(0, (p.stockQuantity ?? 10) - addedSales);
          return {
            ...p,
            salesCount: (p.salesCount || 0) + addedSales,
            stockQuantity: nextStock,
            inStock: nextStock > 0
          };
        }
        return p;
      })
    }));

    try {
      await createOrderInFirestore(newOrder);
    } catch (err) {
      console.error('Failed to persist order to Firestore:', err);
    }

    return newOrder.id;
  },

  updateOrderStatus: async (orderId, status, trackingNumber, courierName) => {
    let orderToUpdate: Order | undefined;

    set((state) => ({
      orders: state.orders.map((o) => {
        if (o.id === orderId || o.orderNumber === orderId) {
          orderToUpdate = {
            ...o,
            status,
            trackingNumber: trackingNumber || o.trackingNumber,
            courierName: courierName || o.courierName
          };
          return orderToUpdate;
        }
        return o;
      })
    }));

    if (orderToUpdate) {
      try {
        const extraFields: Record<string, any> = {};
        if (courierName) extraFields.courierName = courierName;
        await updateOrderStatusInFirestore(orderToUpdate.id, status, trackingNumber, extraFields);
      } catch (err) {
        console.error(`Failed to update order status ${orderId} in Firestore:`, err);
      }

      // If status changed to Confirmed, check for automatic courier assignment
      if (status === 'Confirmed' && (!orderToUpdate.courierConsignmentId || orderToUpdate.courierBookingStatus === 'unbooked')) {
        const activeCouriers = get().couriers.filter(c => c.isActive && c.autoAssignOnConfirm);
        if (activeCouriers.length > 0) {
          get().autoBookOrderWithCourier(orderToUpdate.id).catch(err => {
            console.warn(`Automatic courier booking on confirm notice: ${err?.message || err}`);
          });
        }
      }
    }
  },

  bulkUpdateOrderStatus: async (orderIds, status) => {
    let successCount = 0;
    let failCount = 0;

    set((state) => ({
      orders: state.orders.map((o) => {
        if (orderIds.includes(o.id) || orderIds.includes(o.orderNumber)) {
          return { ...o, status };
        }
        return o;
      })
    }));

    const updatePromises = orderIds.map(async (id) => {
      try {
        const targetOrder = get().orders.find((o) => o.id === id || o.orderNumber === id);
        if (targetOrder) {
          await updateOrderStatusInFirestore(targetOrder.id, status);
          successCount++;
        }
      } catch (err) {
        console.error(`Failed to bulk update order ${id}:`, err);
        failCount++;
      }
    });

    await Promise.all(updatePromises);
    return { successCount, failCount };
  },

  addOrderAdminNote: async (orderId, note) => {
    const timeFormatted = new Date().toLocaleString('en-US');
    const newNote = `${timeFormatted}: ${note}`;

    set((state) => ({
      orders: state.orders.map((o) => {
        if (o.id === orderId || o.orderNumber === orderId) {
          const existingNotes = o.adminNotes || [];
          return { ...o, adminNotes: [...existingNotes, newNote] };
        }
        return o;
      })
    }));

    const targetOrder = get().orders.find((o) => o.id === orderId || o.orderNumber === orderId);
    if (targetOrder) {
      try {
        await updateOrderStatusInFirestore(targetOrder.id, targetOrder.status);
      } catch (err) {
        console.error('Failed to update admin note in Firestore:', err);
      }
    }
  },

  // -------------------------------------------------------------
  // 1. HERO BANNERS MODULE STATE & CRUD (Collection: 'heroBanners')
  // Zero mock/demo fallback: Starts clean and syncs strictly with Firestore
  // -------------------------------------------------------------
  heroBanners: [],
  banners: [], // Backward compatibility mirror

  addHeroBanner: async (bannerData) => {
    const newId = `banner-${Date.now()}`;
    const nextOrder = get().heroBanners.length + 1;
    const newBanner: HeroBanner = {
      id: newId,
      ...bannerData,
      sortOrder: bannerData.sortOrder ?? nextOrder,
      displayOrder: bannerData.displayOrder ?? nextOrder,
      isActive: bannerData.isActive ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    set((state) => {
      const updatedList = [...state.heroBanners, newBanner].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      return { heroBanners: updatedList, banners: updatedList };
    });

    try {
      await createHeroBannerInFirestore(newBanner);
    } catch (err) {
      console.error('Failed to persist hero banner in Firestore:', err);
    }

    return newId;
  },

  updateHeroBanner: async (id, updated) => {
    set((state) => {
      const updatedList = state.heroBanners.map((b) => (b.id === id ? { ...b, ...updated, updatedAt: new Date().toISOString() } : b))
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      return { heroBanners: updatedList, banners: updatedList };
    });

    try {
      await updateHeroBannerInFirestore(id, updated);
    } catch (err) {
      console.error(`Failed to update hero banner ${id} in Firestore:`, err);
    }
  },

  deleteHeroBanner: async (id) => {
    set((state) => {
      const updatedList = state.heroBanners.filter((b) => b.id !== id);
      return { heroBanners: updatedList, banners: updatedList };
    });

    try {
      await deleteHeroBannerFromFirestore(id);
    } catch (err) {
      console.error(`Failed to delete hero banner ${id} from Firestore:`, err);
    }
  },

  toggleHeroBannerStatus: async (id, isActive) => {
    set((state) => {
      const updatedList = state.heroBanners.map((b) => (b.id === id ? { ...b, isActive, updatedAt: new Date().toISOString() } : b));
      return { heroBanners: updatedList, banners: updatedList };
    });

    try {
      await toggleHeroBannerStatusInFirestore(id, isActive);
    } catch (err) {
      console.error(`Failed to toggle status for hero banner ${id}:`, err);
    }
  },

  reorderHeroBanners: async (reordered) => {
    const assigned = reordered.map((b, idx) => ({
      ...b,
      sortOrder: idx + 1,
      displayOrder: idx + 1
    }));

    set({ heroBanners: assigned, banners: assigned });

    try {
      await reorderHeroBannersInFirestore(assigned.map(b => ({ id: b.id, sortOrder: b.sortOrder || 1 })));
    } catch (err) {
      console.error('Failed to persist hero banners reorder in Firestore:', err);
    }
  },

  // Legacy Banner Aliases
  addBanner: async (bannerData) => {
    await get().addHeroBanner(bannerData);
  },

  updateBanner: async (id, updated) => {
    await get().updateHeroBanner(id, updated);
  },

  deleteBanner: async (id) => {
    await get().deleteHeroBanner(id);
  },

  reorderBanners: (reordered) => {
    get().reorderHeroBanners(reordered);
  },

  // -------------------------------------------------------------
  // 2. HOMEPAGE BUILDER MODULE STATE & CRUD (Collection: 'homepageSections')
  // Hydrates immediately from local cache on startup; synchronized with Firestore
  // -------------------------------------------------------------
  homepageSections: getHydratedHomepageSections(),

  addHomepageSection: async (sectionData) => {
    const newId = `sec-${Date.now()}`;
    const nextOrder = get().homepageSections.length + 1;
    const newSection: HomepageSection = normalizeHomepageSection({
      id: newId,
      ...sectionData,
      sortOrder: sectionData.sortOrder ?? nextOrder,
      displayOrder: sectionData.displayOrder ?? nextOrder,
      isActive: sectionData.isActive ?? true,
      enabled: sectionData.enabled ?? true,
      settings: sectionData.settings || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, nextOrder);

    const updatedList = [...get().homepageSections, newSection].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    set({ homepageSections: updatedList });
    safePersistHomepageCache(updatedList);

    try {
      await createHomepageSectionInFirestore(newSection);
    } catch (err) {
      console.error('Failed to persist homepage section in Firestore:', err);
    }

    return newId;
  },

  updateHomepageSection: async (id, updated) => {
    const updatedList = get().homepageSections.map((s) => (s.id === id ? normalizeHomepageSection({ ...s, ...updated, updatedAt: new Date().toISOString() }) : s))
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    
    set({ homepageSections: updatedList });
    safePersistHomepageCache(updatedList);

    try {
      await updateHomepageSectionInFirestore(id, updated);
    } catch (err) {
      console.error(`Failed to update homepage section ${id} in Firestore:`, err);
    }
  },

  deleteHomepageSection: async (id) => {
    const updatedList = get().homepageSections.filter((s) => s.id !== id);
    set({ homepageSections: updatedList });
    safePersistHomepageCache(updatedList);

    try {
      await deleteHomepageSectionFromFirestore(id);
    } catch (err) {
      console.error(`Failed to delete homepage section ${id} from Firestore:`, err);
    }
  },

  toggleHomepageSectionStatus: async (id, isActive) => {
    const updatedList = get().homepageSections.map((s) => (s.id === id ? { ...s, isActive, enabled: isActive, updatedAt: new Date().toISOString() } : s));
    set({ homepageSections: updatedList });
    safePersistHomepageCache(updatedList);

    try {
      await toggleHomepageSectionStatusInFirestore(id, isActive);
    } catch (err) {
      console.error(`Failed to toggle status for homepage section ${id}:`, err);
    }
  },

  reorderHomepageSections: async (reordered) => {
    const assigned = reordered.map((s, idx) => ({
      ...s,
      sortOrder: idx + 1,
      displayOrder: idx + 1
    }));

    set({ homepageSections: assigned });
    safePersistHomepageCache(assigned);

    try {
      await reorderHomepageSectionsInFirestore(assigned.map(s => ({ id: s.id, sortOrder: s.sortOrder || 1 })));
    } catch (err) {
      console.error('Failed to persist homepage sections reorder in Firestore:', err);
    }
  },

  // Coupons CRUD with Direct Firestore Sync
  coupons: [],

  addCoupon: async (couponData) => {
    const newId = `coupon-${Date.now()}`;
    const newCoupon: Coupon = {
      id: newId,
      ...couponData,
      code: (couponData.code || '').trim().toUpperCase(),
      isActive: couponData.isActive !== undefined ? couponData.isActive : true,
      totalUsedCount: 0,
      usageCount: 0,
      perUserLimit: couponData.perUserLimit ?? 1,
      usedByUsers: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    set((state) => ({
      coupons: [newCoupon, ...state.coupons.filter(c => c.id !== newId)]
    }));

    try {
      await saveCouponToFirestore(newCoupon);
    } catch (err) {
      console.error('Failed to persist coupon in Firestore:', err);
    }
  },

  updateCoupon: async (id, updated) => {
    const updatedAt = new Date().toISOString();
    set((state) => ({
      coupons: state.coupons.map((c) => (c.id === id ? { 
        ...c, 
        ...updated, 
        code: updated.code ? updated.code.trim().toUpperCase() : c.code,
        updatedAt 
      } : c))
    }));

    try {
      await saveCouponToFirestore({ ...updated, id, updatedAt });
    } catch (err) {
      console.error(`Failed to update coupon ${id} in Firestore:`, err);
    }
  },

  deleteCoupon: async (id) => {
    set((state) => ({
      coupons: state.coupons.filter((c) => c.id !== id)
    }));

    try {
      await deleteCouponFromFirestore(id);
    } catch (err) {
      console.error(`Failed to delete coupon ${id} from Firestore:`, err);
    }
  },

  // Marketing & Pixels
  marketingPixels: MARKETING_PIXELS_CONFIG,

  updateMarketingPixels: (updated) => {
    const nextConfig = { ...get().marketingPixels, ...updated };
    set({ marketingPixels: nextConfig });
    
    // Immediately synchronize local tracking service engine
    trackingService.syncConfig(nextConfig);

    try {
      localStorage.setItem('hom_marketing_pixels_config', JSON.stringify(nextConfig));
    } catch (e) {
      // Ignore local storage error
    }

    saveMarketingConfigToFirestore(nextConfig).catch(() => {
      // Handled in firestoreService
    });
  },

  // SEO & Pages SEO Config
  seoConfig: SEO_CONFIG,
  pagesSeo: DEFAULT_PAGES_SEO,

  updateSeoConfig: (updated) => {
    const nextConfig = { ...get().seoConfig, ...updated };
    set({ seoConfig: nextConfig });
    saveSeoConfigToFirestore(nextConfig).catch(console.error);
  },

  updatePageSeo: (id, updated) => {
    const currentPages = get().pagesSeo;
    const nextPages = currentPages.map((p) => (p.id === id ? { ...p, ...updated, updatedAt: new Date().toISOString() } : p));
    set({ pagesSeo: nextPages });
    savePageSeoListToFirestore(nextPages).catch(console.error);
  },

  resetPagesSeoToDefault: () => {
    set({ pagesSeo: DEFAULT_PAGES_SEO });
    savePageSeoListToFirestore(DEFAULT_PAGES_SEO).catch(console.error);
  },

  // Store Settings
  storeSettings: STORE_SETTINGS,

  updateStoreSettings: (updated) => {
    const newSettings = { ...get().storeSettings, ...updated };
    set({ storeSettings: newSettings });
    saveStoreSettingsToFirestore(newSettings).catch((err) => {
      console.error('Failed to persist store settings to Firestore:', err);
    });
  },

  // Courier Services Management State & Methods
  couriers: INITIAL_COURIER_CONFIGS,

  addCourierConfig: async (courierData) => {
    const existingIds = new Set(get().couriers.map((c) => c.id));
    let newId: string = courierData.provider;
    if (courierData.provider === 'custom' || existingIds.has(newId)) {
      newId = `${courierData.provider}-${Date.now()}`;
    }
    const newCourier: CourierServiceConfig = {
      id: newId,
      ...courierData,
      priority: courierData.priority || (get().couriers.length + 1),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    set((state) => {
      const filtered = state.couriers.filter((c) => c.id !== newId);
      return {
        couriers: [...filtered, newCourier].sort((a, b) => a.priority - b.priority)
      };
    });

    try {
      await saveCourierConfigToFirestore(newCourier);
    } catch (err) {
      console.error('Failed to persist courier config:', err);
    }
  },

  updateCourierConfig: async (id, updated) => {
    set((state) => ({
      couriers: state.couriers.map((c) => {
        if (c.id === id) {
          return {
            ...c,
            ...updated,
            updatedAt: new Date().toISOString()
          };
        }
        return c;
      }).sort((a, b) => a.priority - b.priority)
    }));

    const target = get().couriers.find(c => c.id === id);
    if (target) {
      try {
        await saveCourierConfigToFirestore(target);
      } catch (err) {
        console.error(`Failed to update courier config ${id}:`, err);
      }
    }
  },

  deleteCourierConfig: async (id) => {
    set((state) => ({
      couriers: state.couriers.filter((c) => c.id !== id)
    }));

    try {
      await deleteCourierConfigFromFirestore(id);
    } catch (err) {
      console.error(`Failed to delete courier config ${id}:`, err);
    }
  },

  setCourierPriority: async (reordered) => {
    const updated = reordered.map((c, idx) => ({
      ...c,
      priority: idx + 1,
      updatedAt: new Date().toISOString()
    }));

    set({ couriers: updated });

    const promises = updated.map(c => saveCourierConfigToFirestore(c));
    await Promise.all(promises);
  },

  setDefaultCourier: async (id) => {
    const updated = get().couriers.map(c => ({
      ...c,
      isDefault: c.id === id,
      updatedAt: new Date().toISOString()
    }));

    set({ couriers: updated });

    const promises = updated.map(c => saveCourierConfigToFirestore(c));
    await Promise.all(promises);
  },

  autoBookOrderWithCourier: async (orderId, forcedCourierId) => {
    const targetOrder = get().orders.find(o => o.id === orderId || o.orderNumber === orderId);
    if (!targetOrder) {
      return {
        success: false,
        provider: 'custom',
        courierName: 'Unknown',
        status: 'failed',
        errorMessage: `Order ${orderId} not found.`
      };
    }

    const availableCouriers = get().couriers.filter(c => c.isActive);
    if (availableCouriers.length === 0) {
      return {
        success: false,
        provider: 'custom',
        courierName: 'None',
        status: 'failed',
        errorMessage: 'No active courier service configured. Please configure Pathao, Steadfast or RedX in Settings.'
      };
    }

    // Call execution engine with full couriers list and optional forcedCourierId
    const result = await executeAutoCourierBooking(targetOrder, get().couriers, forcedCourierId);

    // Update order with consignment info if successful
    if (result.success && result.consignmentId) {
      set((state) => ({
        orders: state.orders.map((o) => {
          if (o.id === targetOrder.id) {
            return {
              ...o,
              courierName: result.courierName,
              courierConsignmentId: result.consignmentId,
              trackingNumber: result.trackingCode || result.consignmentId,
              courierTrackingUrl: result.trackingUrl,
              courierBookingStatus: 'booked',
              courierBookingTime: new Date().toISOString(),
              courierLastError: undefined
            };
          }
          return o;
        })
      }));

      try {
        await updateOrderStatusInFirestore(targetOrder.id, targetOrder.status, result.trackingCode || result.consignmentId, {
          courierName: result.courierName,
          courierConsignmentId: result.consignmentId,
          courierTrackingUrl: result.trackingUrl,
          courierBookingStatus: 'booked',
          courierBookingTime: new Date().toISOString(),
          courierLastError: null
        });
      } catch (err) {
        console.error('Failed to update courier booking info in Firestore:', err);
      }
    } else {
      set((state) => ({
        orders: state.orders.map((o) => {
          if (o.id === targetOrder.id) {
            return {
              ...o,
              courierBookingStatus: 'failed',
              courierLastError: result.errorMessage
            };
          }
          return o;
        })
      }));

      try {
        await updateOrderStatusInFirestore(targetOrder.id, targetOrder.status, targetOrder.trackingNumber, {
          courierBookingStatus: 'failed',
          courierLastError: result.errorMessage
        });
      } catch (err) {
        console.error('Failed to update courier error in Firestore:', err);
      }
    }

    return result;
  },

  batchAutoBookOrders: async (orderIds) => {
    let successCount = 0;
    let failCount = 0;
    const results: CourierBookingResult[] = [];

    for (const id of orderIds) {
      const res = await get().autoBookOrderWithCourier(id);
      results.push(res);
      if (res.success) {
        successCount++;
      } else {
        failCount++;
      }
    }

    return { successCount, failCount, results };
  },

  // Computed Analytics & Intelligence
  getAnalytics: () => {
    const state = get();
    const orders = state.orders;
    const products = state.products;

    const todayStr = new Date().toISOString().split('T')[0];
    const todayOrdersList = orders.filter((o) => o.date && o.date.startsWith(todayStr));
    const todaySales = todayOrdersList.reduce((sum, o) => sum + (o.total || 0), 0);
    const todayOrders = todayOrdersList.length;

    const totalCustomers = new Set(orders.map((o) => o.customer.phone || o.customer.email)).size;
    const totalProductsSold = orders.reduce(
      (sum, o) => sum + o.items.reduce((iSum, item) => iSum + item.quantity, 0),
      0
    );

    const totalSalesAll = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const averageOrderValue = orders.length > 0 ? Math.round(totalSalesAll / orders.length) : 0;

    const ordersByStatus: Record<OrderStatus, number> = {
      Pending: 0,
      Confirmed: 0,
      Processing: 0,
      Shipped: 0,
      Delivered: 0,
      Cancelled: 0,
      Refunded: 0
    };

    orders.forEach((o) => {
      if (ordersByStatus[o.status] !== undefined) {
        ordersByStatus[o.status]++;
      }
    });

    const lowStockCount = products.filter((p) => (p.stockQuantity ?? 10) > 0 && (p.stockQuantity ?? 10) <= 5).length;
    const outOfStockCount = products.filter((p) => (p.stockQuantity ?? 10) === 0 || !p.inStock).length;

    const daysMap: Record<string, { sales: number; orders: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      daysMap[key] = { sales: 0, orders: 0 };
    }

    orders.forEach((o) => {
      const dateKey = o.date ? o.date.split('T')[0] : '';
      if (daysMap[dateKey]) {
        daysMap[dateKey].sales += o.total || 0;
        daysMap[dateKey].orders += 1;
      }
    });

    const salesData7Days = Object.keys(daysMap).map((date) => ({
      date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
      sales: daysMap[date].sales,
      orders: daysMap[date].orders
    }));

    const topSellingProducts = [...products]
      .sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0))
      .slice(0, 5);

    const highDemandProducts = [...products]
      .sort((a, b) => (b.demandScore || 0) - (a.demandScore || 0))
      .slice(0, 5);

    return {
      todaySales,
      todayOrders,
      totalCustomers,
      totalProductsSold,
      averageOrderValue,
      cartAbandonmentRate: 24.5,
      conversionRate: 3.8,
      ordersByStatus,
      lowStockCount,
      outOfStockCount,
      salesData7Days,
      topSellingProducts,
      highDemandProducts
    };
  },

  getDashboardStoreHealthMetrics: (timeFilter) => {
    const state = get();
    const orders = state.orders;
    const products = state.products;

    const now = new Date();
    const filterOrders = orders.filter((o) => {
      if (!o.date) return true;
      const orderDate = new Date(o.date);
      if (isNaN(orderDate.getTime())) return true;

      const diffTime = Math.abs(now.getTime() - orderDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (timeFilter === 'today') {
        return orderDate.toDateString() === now.toDateString();
      } else if (timeFilter === '7days') {
        return diffDays <= 7;
      } else if (timeFilter === '30days') {
        return diffDays <= 30;
      } else if (timeFilter === 'month') {
        return (
          orderDate.getMonth() === now.getMonth() &&
          orderDate.getFullYear() === now.getFullYear()
        );
      }
      return true;
    });

    const grossSales = filterOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalOrders = filterOrders.length;

    let pendingOrders = 0;
    let confirmedOrders = 0;
    let processingOrders = 0;
    let shippedOrders = 0;
    let deliveredOrders = 0;
    let cancelledOrders = 0;
    let refundedOrders = 0;

    filterOrders.forEach((o) => {
      switch (o.status) {
        case 'Pending': pendingOrders++; break;
        case 'Confirmed': confirmedOrders++; break;
        case 'Processing': processingOrders++; break;
        case 'Shipped': shippedOrders++; break;
        case 'Delivered': deliveredOrders++; break;
        case 'Cancelled': cancelledOrders++; break;
        case 'Refunded': refundedOrders++; break;
      }
    });

    const netSales = filterOrders
      .filter((o) => o.status !== 'Cancelled' && o.status !== 'Refunded')
      .reduce((sum, o) => sum + (o.total || 0), 0);

    const averageOrderValue = totalOrders > 0 ? Math.round(grossSales / totalOrders) : 0;
    const uniqueCustomers = new Set(filterOrders.map((o) => o.customer.phone || o.customer.email || o.customer.name)).size;

    const lowStockThreshold = state.storeSettings.lowStockThreshold || 5;
    const totalCatalogProducts = products.length;
    const activeProductsCount = products.filter((p) => p.inStock).length;
    const lowStockCount = products.filter(
      (p) => (p.stockQuantity ?? 10) > 0 && (p.stockQuantity ?? 10) <= lowStockThreshold
    ).length;
    const outOfStockCount = products.filter((p) => (p.stockQuantity ?? 10) === 0 || !p.inStock).length;

    const daysCount = timeFilter === 'today' ? 1 : timeFilter === '7days' ? 7 : timeFilter === 'month' ? 30 : 30;
    const chartMap: Record<string, { sales: number; orders: number }> = {};

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      chartMap[key] = { sales: 0, orders: 0 };
    }

    filterOrders.forEach((o) => {
      const key = o.date ? o.date.split('T')[0] : '';
      if (chartMap[key]) {
        chartMap[key].sales += o.total || 0;
        chartMap[key].orders += 1;
      }
    });

    const salesChartData = Object.keys(chartMap).map((dateStr) => {
      const d = new Date(dateStr);
      const label = timeFilter === 'today' 
        ? d.toLocaleTimeString('en-US', { hour: 'numeric' })
        : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const sales = chartMap[dateStr].sales;
      const dayOrders = chartMap[dateStr].orders;
      return {
        label,
        date: dateStr,
        sales,
        orders: dayOrders,
        aov: dayOrders > 0 ? Math.round(sales / dayOrders) : 0
      };
    });

    return {
      timeFilter,
      netSales,
      grossSales,
      totalOrders,
      pendingOrders,
      confirmedOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      refundedOrders,
      averageOrderValue,
      totalCustomers: uniqueCustomers,
      totalCatalogProducts,
      activeProductsCount,
      lowStockCount,
      outOfStockCount,
      lowStockThreshold,
      salesChartData
    };
  },

  getDemandIntelligence: (timeFilter = '30days', categoryId?: string) => {
    const state = get();
    const metrics = state.getDashboardStoreHealthMetrics(timeFilter);
    const configuredThreshold = state.storeSettings.lowStockThreshold || 5;

    let targetProducts = state.products;
    if (categoryId && categoryId !== 'all') {
      targetProducts = targetProducts.filter(
        (p) => p.category === categoryId || p.categoryLabel.toLowerCase() === categoryId.toLowerCase()
      );
    }

    const filteredOrders = state.orders;
    const velocityDays = timeFilter === 'today' ? 1 : timeFilter === '7days' ? 7 : 30;

    let totalUnitsSold = 0;

    const productDemandList: ProductDemandIntelligence[] = targetProducts.map((p) => {
      let unitsSold = p.salesCount || 0;
      let ordersCount = 0;
      let revenueGenerated = 0;

      filteredOrders.forEach((o) => {
        if (o.status !== 'Cancelled' && o.status !== 'Refunded') {
          const item = o.items.find((i) => i.product.id === p.id);
          if (item) {
            unitsSold += item.quantity;
            ordersCount += 1;
            revenueGenerated += (item.product.price || 0) * item.quantity;
          }
        }
      });

      totalUnitsSold += unitsSold;
      const currentStock = p.stockQuantity ?? (p.inStock ? 10 : 0);

      const calculatedDemandScore = Math.min(
        100,
        Math.round(unitsSold * 10 + (p.viewsCount || 0) * 0.5 + (p.addedToCartCount || 0) * 2)
      );

      let demandLevel: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
      if (unitsSold >= 10 || calculatedDemandScore >= 70) {
        demandLevel = 'VERY_HIGH';
      } else if (unitsSold >= 5 || calculatedDemandScore >= 40) {
        demandLevel = 'HIGH';
      } else if (unitsSold >= 2 || calculatedDemandScore >= 20) {
        demandLevel = 'MEDIUM';
      }

      let restockPriority: 'CRITICAL' | 'MONITOR' | 'HEALTHY' | 'SLOW_MOVING' = 'HEALTHY';
      if ((demandLevel === 'VERY_HIGH' || demandLevel === 'HIGH') && currentStock <= configuredThreshold) {
        restockPriority = 'CRITICAL';
      } else if ((demandLevel === 'VERY_HIGH' || demandLevel === 'HIGH') && currentStock <= configuredThreshold * 3) {
        restockPriority = 'MONITOR';
      } else if ((demandLevel === 'LOW' || unitsSold === 0) && currentStock > configuredThreshold * 2) {
        restockPriority = 'SLOW_MOVING';
      }

      const salesVelocityPerDay = Number((unitsSold / velocityDays).toFixed(2));
      const stockRunoutDays =
        salesVelocityPerDay > 0 ? Math.max(1, Math.round(currentStock / salesVelocityPerDay)) : null;

      return {
        product: p,
        unitsSold,
        ordersCount,
        revenueGenerated,
        currentStock,
        demandScore: calculatedDemandScore,
        demandLevel,
        restockPriority,
        salesVelocityPerDay,
        stockRunoutDays
      };
    });

    const fastMovingProducts = [...productDemandList]
      .sort((a, b) => b.unitsSold - a.unitsSold || b.revenueGenerated - a.revenueGenerated)
      .slice(0, 10);

    const slowMovingProducts = [...productDemandList]
      .filter((p) => p.unitsSold <= 2)
      .sort((a, b) => b.currentStock - a.currentStock)
      .slice(0, 10);

    const criticalRestockProducts = [...productDemandList]
      .filter((p) => p.restockPriority === 'CRITICAL')
      .sort((a, b) => a.currentStock - b.currentStock || b.unitsSold - a.unitsSold);

    const categoryMap = new Map<string, { units: number; orders: number; revenue: number; count: number }>();
    state.categories.forEach((cat) => {
      categoryMap.set(cat.name, { units: 0, orders: 0, revenue: 0, count: 0 });
    });

    productDemandList.forEach((item) => {
      const catName = item.product.category || 'Uncategorized';
      const existing = categoryMap.get(catName) || { units: 0, orders: 0, revenue: 0, count: 0 };
      categoryMap.set(catName, {
        units: existing.units + item.unitsSold,
        orders: existing.orders + item.ordersCount,
        revenue: existing.revenue + item.revenueGenerated,
        count: existing.count + 1
      });
    });

    let topCategoryName = 'All Categories';
    let maxCategoryRevenue = -1;

    const categoryDemandList: CategoryDemandAnalysis[] = Array.from(categoryMap.entries()).map(
      ([categoryName, data]) => {
        if (data.revenue > maxCategoryRevenue) {
          maxCategoryRevenue = data.revenue;
          topCategoryName = categoryName;
        }

        const marketSharePercentage =
          totalUnitsSold > 0 ? Math.round((data.units / totalUnitsSold) * 100) : 0;

        return {
          categoryId: categoryName.toLowerCase().replace(/\s+/g, '-'),
          categoryName,
          unitsSold: data.units,
          ordersCount: data.orders,
          revenue: data.revenue,
          productCount: data.count,
          marketSharePercentage
        };
      }
    ).sort((a, b) => b.unitsSold - a.unitsSold || b.revenue - a.revenue);

    return {
      productDemandList,
      fastMovingProducts,
      slowMovingProducts,
      criticalRestockProducts,
      categoryDemandList,
      totalUnitsSold,
      topCategoryName
    };
  }
}));
