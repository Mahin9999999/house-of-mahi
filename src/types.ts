// Houseofmahi E-commerce & Admin Type Definitions

export type ProductCategoryType = 'necklaces' | 'earrings' | 'rings' | 'bracelets' | 'sets' | 'bags' | 'hair-accessories' | 'all';

export interface Review {
  id: string;
  productId?: string;
  productName?: string;
  productImage?: string;
  userId?: string;
  userName: string;
  userEmail?: string;
  userPhone?: string;
  orderId?: string;
  orderNumber?: string;
  rating: number;
  date: string;
  comment: string;
  verifiedPurchase: boolean;
  status?: 'pending' | 'approved' | 'rejected';
  createdAt?: any;
  updatedAt?: any;
}

export interface EligibleReviewProduct {
  productId: string;
  productName: string;
  productImage: string;
  price: number;
  orderId: string;
  orderNumber: string;
  deliveredDate?: string;
  isReviewed: boolean;
  review?: Review;
}

export type AccountTabType = 'dashboard' | 'orders' | 'reviews' | 'address' | 'profile' | 'details' | 'wishlist';

export interface ProductAttribute {
  name: string;
  options: string[];
}

export interface ProductVariation {
  id: string;
  attributes: Record<string, string>; // e.g. { Finish: 'Gold', Size: 'Medium' }
  price: number;
  regularPrice?: number;
  stock: number;
  sku?: string;
  image?: string;
}

// Product Image SEO Data
export interface ProductImageSeo {
  url: string;
  altText: string;
  title?: string;
  caption?: string;
  isPrimary?: boolean;
}

// Product Specific SEO Metadata
export interface ProductSeoData {
  seoTitle?: string;
  metaDescription?: string;
  primaryKeyword?: string;
  secondaryKeywords?: string[];
  slug?: string;
  canonicalUrl?: string;
  indexStatus?: 'index' | 'noindex';
  followStatus?: 'follow' | 'nofollow';
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterCard?: 'summary' | 'summary_large_image';
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  brand?: string;
  gtin?: string;
  mpn?: string;
  condition?: 'NewCondition' | 'RefurbishedCondition' | 'UsedCondition';
  keyFeatures?: string[];
  targetUseCase?: string;
  faqs?: { question: string; answer: string }[];
  imageSeoList?: ProductImageSeo[];
}

export interface Product {
  id: string;
  name: string;
  sku?: string;
  category: ProductCategoryType;
  categoryLabel: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviewsCount: number;
  image: string;
  imageAlt?: string; // Specific primary image ALT
  galleryImages?: string[];
  galleryImagesAlt?: Record<string, string>; // Map of image URL -> ALT text
  finishes?: string[];
  colorImages?: Record<string, string[]>; // Map of color/finish name -> array of specific image URLs
  sizes?: string[];
  description: string;
  shortDescription?: string;
  inStock: boolean;
  stockQuantity?: number;
  isNew?: boolean;
  isBestSeller?: boolean;
  isFeatured?: boolean;
  tags: string[];
  attributes?: ProductAttribute[];
  variations?: ProductVariation[];
  reviews?: Review[];
  // Analytics metrics
  viewsCount?: number;
  addedToCartCount?: number;
  wishlistCount?: number;
  salesCount?: number;
  demandScore?: number;
  createdAt?: string;

  // SEO & AEO Extensions
  seo?: ProductSeoData;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  imageAlt?: string;
  parentCategory?: string;
  displayOrder: number;
  productCount: number;
  // Advanced Category SEO
  seoTitle?: string;
  seoDescription?: string;
  primaryKeyword?: string;
  secondaryKeywords?: string[];
  canonicalUrl?: string;
  indexStatus?: 'index' | 'noindex';
  followStatus?: 'follow' | 'nofollow';
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedFinish?: string;
  selectedSize?: string;
  selectedVariationId?: string;
}

export type OrderStatus = 
  | 'Pending'
  | 'Confirmed'
  | 'Processing'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled'
  | 'Refunded';

export interface OrderCustomerInfo {
  name: string;
  phone: string;
  email?: string;
  address: string;
  district: string;
  thana: string;
  note?: string;
}

export interface OrderPaymentDetails {
  method: 'cod' | 'bkash' | 'nagad' | 'card';
  provider: 'bkash' | 'nagad' | 'sslcommerz' | 'cod' | 'manual';
  status: 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled' | 'refunded';
  amount: number;
  currency: 'BDT';
  transactionId?: string;
  gatewayPaymentId?: string;
  paymentUrl?: string;
  initiatedAt?: string;
  paidAt?: string;
  verifiedAt?: string;
  refundAmount?: number;
  refundReason?: string;
  refundedAt?: string;
  customerPhone?: string;
  errorMessage?: string;
  rawGatewayResponse?: any;
}

export interface Order {
  id: string;
  userId?: string;
  orderNumber: string;
  date: string;
  items: CartItem[];
  subtotal: number;
  shippingCharge: number;
  discount: number;
  total: number;
  status: OrderStatus;
  paymentMethod: 'cod' | 'bkash' | 'nagad' | 'card';
  paymentStatus: 'unpaid' | 'paid' | 'refunded';
  paymentDetails?: OrderPaymentDetails;
  customer: OrderCustomerInfo;
  trackingNumber?: string;
  courierName?: string;
  courierConsignmentId?: string;
  courierTrackingUrl?: string;
  courierBookingStatus?: 'unbooked' | 'booking_in_progress' | 'booked' | 'failed';
  courierBookingTime?: string;
  courierLastError?: string;
  adminNotes?: string[];
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  district: string;
  thana: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate?: string;
  status: 'active' | 'vip' | 'inactive';
}

// ==========================================
// 1. HERO BANNERS MODULE TYPES
// Dedicated Firestore Collection: 'heroBanners'
// ==========================================
export interface HeroBanner {
  id: string;
  title: string;
  subtitle?: string;
  tagline?: string;
  description?: string;
  desktopImage: string; // Cloudinary Secure URL
  mobileImage?: string; // Cloudinary Secure URL for responsive mobile screens
  imageAlt?: string;
  buttonText?: string;
  buttonUrl?: string;
  secondaryButtonText?: string;
  secondaryButtonUrl?: string;
  textAlignment?: 'left' | 'center' | 'right';
  theme?: 'light' | 'dark';
  isActive: boolean;
  sortOrder?: number;
  displayOrder?: number; // Compatibility alias
  startDate?: string;
  endDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Backward Compatibility Alias for legacy code
export type Banner = HeroBanner;

// ==========================================
// 2. HOMEPAGE BUILDER MODULE TYPES
// Dedicated Firestore Collection: 'homepageSections'
// (Hero Banner fields are strictly excluded)
// ==========================================
export type HomepageSectionType =
  | 'categories'
  | 'best_sellers'
  | 'new_arrivals'
  | 'featured_products'
  | 'featured'
  | 'product_grid'
  | 'flash_sale'
  | 'promotional_banner'
  | 'promo_banner'
  | 'trust_features'
  | 'reviews'
  | 'brand_story'
  | 'newsletter'
  | 'custom_collection'
  | 'hero';

export interface HomepageSectionSettings {
  categoryIds?: string[];
  productIds?: string[];
  productLimit?: number;
  layoutStyle?: 'grid' | 'slider' | 'carousel' | 'masonry' | 'banner_split';
  columnsDesktop?: 2 | 3 | 4 | 5 | 6;
  columnsMobile?: 1 | 2;
  backgroundColor?: string;
  textColor?: string;
  showPrice?: boolean;
  showRating?: boolean;
  showDiscountBadge?: boolean;
  // Specific to 'promotional_banner' section (NOT hero banner)
  promoImageUrl?: string;
  promoImageAlt?: string;
  promoLink?: string;
  promoButtonText?: string;
  // Specific to 'flash_sale'
  timerEndTime?: string;
  flashSaleDiscountText?: string;
  // Specific to 'brand_story' or custom content
  storyText?: string;
  storyImageUrl?: string;
  storyButtonText?: string;
  storyButtonLink?: string;
  // Specific to 'trust_features'
  badgeItems?: Array<{
    id?: string;
    icon: string;
    title: string;
    description: string;
  }>;
}

export interface HomepageSection {
  id: string;
  sectionType?: HomepageSectionType;
  type?: HomepageSectionType; // Legacy alias
  title: string;
  subtitle?: string;
  isActive?: boolean;
  enabled?: boolean; // Legacy alias
  sortOrder?: number;
  displayOrder?: number; // Legacy alias
  settings?: HomepageSectionSettings;
  config?: Record<string, any>; // Legacy alias
  createdAt?: string;
  updatedAt?: string;
}

// Marketing, Pixels & Analytics Tracking Configuration
export interface MarketingPixelsConfig {
  // 1. Meta / Facebook Pixel
  metaPixelId: string;
  metaPixelName?: string;
  metaPixelEnabled: boolean;
  metaAdvancedMatching?: boolean;
  metaTestEventCode?: string;

  // 2. Google Analytics 4 (GA4)
  ga4MeasurementId: string;
  ga4PropertyId?: string;
  ga4DataStreamId?: string;
  ga4StreamName?: string;
  ga4WebsiteUrl?: string;
  ga4Currency?: string; // Default: 'BDT'
  ga4EnhancedMeasurement?: boolean;
  ga4DebugMode?: boolean;
  ga4Enabled: boolean;

  // 3. Google Tag Manager (GTM)
  gtmContainerId: string;
  gtmContainerName?: string;
  gtmEnabled: boolean;

  // 4. Google Ads Conversion Tracking
  googleAdsConversionId?: string;
  googleAdsConversionLabel?: string;
  googleAdsConversionName?: string;
  googleAdsEnabled?: boolean;

  // 5. TikTok Pixel
  tiktokPixelId: string;
  tiktokPixelName?: string;
  tiktokEnabled: boolean;

  // 6. Microsoft Clarity
  clarityProjectId?: string;
  clarityProjectName?: string;
  clarityEnabled?: boolean;

  // 7. Custom Tracking Scripts
  customHeaderScript?: string;
  customBodyScript?: string;
  customScriptEnabled?: boolean;

  // Global & Diagnostics
  testModeEnabled: boolean;
  lastTestedAt?: string;
}

// Comprehensive Global SEO Settings Configuration
export interface SeoConfig {
  // Brand & Defaults
  brandName: string;
  homepageTitle: string;
  homepageDescription: string;
  siteKeywords: string;
  canonicalBaseUrl: string;

  // Social Sharing & Open Graph Defaults
  defaultOgTitle?: string;
  defaultOgDescription?: string;
  defaultOgImage: string;
  defaultTwitterCard: 'summary' | 'summary_large_image';
  defaultTwitterTitle?: string;
  defaultTwitterDescription?: string;
  defaultTwitterImage?: string;

  // Search Engine & Robots Directives
  robotsIndex: boolean;
  robotsFollow: boolean;
  allowSearchEngines: boolean;
  customRobotsTxt?: string;

  // Organization & Local Business Structured Data
  orgName?: string;
  orgLegalName?: string;
  orgUrl?: string;
  orgLogo?: string;
  orgPhone?: string;
  orgEmail?: string;
  orgAddressStreet?: string;
  orgAddressLocality?: string;
  orgAddressRegion?: string;
  orgPostalCode?: string;
  orgCountry?: string;
  socialFacebookUrl?: string;
  socialInstagramUrl?: string;
  socialYoutubeUrl?: string;
  socialTiktokUrl?: string;
  socialPinterestUrl?: string;

  // Sitemap configuration
  sitemapEnabled?: boolean;
  sitemapLastGenerated?: string;
}

// Individual Page SEO Configuration
export interface PageSeoItem {
  id: string; // e.g. 'home', 'shop', 'about', 'contact', 'cart', 'wishlist', 'account'
  pageName: string;
  path: string;
  title: string;
  description: string;
  primaryKeyword?: string;
  secondaryKeywords?: string[];
  canonicalUrl?: string;
  indexStatus: 'index' | 'noindex';
  followStatus: 'follow' | 'nofollow';
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterCard?: 'summary' | 'summary_large_image';
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  schemaType?: 'WebPage' | 'AboutPage' | 'ContactPage' | 'CollectionPage' | 'CheckoutPage';
  updatedAt?: string;
}

// SEO Audit Metrics
export interface SeoAuditIssue {
  id: string;
  type: 'error' | 'warning' | 'notice';
  category: 'technical' | 'content' | 'images' | 'social' | 'schema';
  title: string;
  message: string;
  targetType: 'page' | 'product' | 'category' | 'global';
  targetId?: string;
  targetName?: string;
  actionText?: string;
}

export interface SeoAuditSummary {
  overallScore: number;
  totalIndexablePages: number;
  optimizedCount: number;
  warningsCount: number;
  errorsCount: number;
  missingTitlesCount: number;
  missingDescriptionsCount: number;
  missingOgImagesCount: number;
  missingImageAltCount: number;
  issues: SeoAuditIssue[];
}

// Discount Coupon & Promotional Offers
export type CouponApplicableType = 'all' | 'single_product' | 'multiple_products' | 'categories';

export interface Coupon {
  id: string;
  code: string;
  title?: string;
  description?: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  discountAmount?: number; // Backward compatibility alias
  maxDiscountAmount?: number;
  maxDiscount?: number; // Backward compatibility alias

  // Applicable Targets
  applicableType?: CouponApplicableType;
  applicableProductIds?: string[];
  applicableCategoryIds?: string[];

  // Conditions
  minOrderAmount?: number;
  minSpend?: number; // Backward compatibility alias
  minQuantity?: number;
  isFreeShipping?: boolean;

  // Usage Controls
  globalUsageLimit?: number;
  usageLimit?: number; // Backward compatibility alias
  totalUsedCount?: number;
  usageCount: number; // Maintained for backward compatibility
  perUserLimit?: number; // e.g., 1 = One successful use per customer
  usedByUsers?: string[]; // Array of customer userIds or phone numbers

  // Validity Dates & Status
  startDate?: string;
  endDate?: string;
  expiryDate?: string; // Backward compatibility alias
  isActive: boolean;

  createdAt?: string;
  updatedAt?: string;
}

// User-Level Coupon Usage Tracking Record
export interface CouponUsageRecord {
  id: string;
  couponId: string;
  couponCode: string;
  userId: string;
  customerPhone?: string;
  customerEmail?: string;
  orderId: string;
  orderTotal: number;
  discountAmount: number;
  isFreeShippingApplied: boolean;
  usedAt: string;
}

// Detailed Result from Coupon Validation Engine
export interface CouponValidationResult {
  isValid: boolean;
  errorMessage?: string;
  discountAmount: number;
  isFreeShipping: boolean;
  coupon?: Coupon;
}

// General Store Settings
export interface StoreSettings {
  storeName: string;
  phone: string;
  email: string;
  address: string;
  currency: string;
  currencySymbol: string;
  shippingInsideDhaka: number;
  shippingOutsideDhaka: number;
  freeShippingThreshold: number;
  lowStockThreshold?: number;
  announcementText: string;
  announcementEnabled: boolean;
  announcementBgColor: string;
  announcementTextColor: string;
  facebookUrl?: string;
  instagramUrl?: string;
  youtubeUrl?: string;
  whatsappNumber?: string;
}

// Admin Role & User
export interface AdminUser {
  id: string;
  username: string;
  name: string;
  email: string;
  role: 'super_admin' | 'store_manager' | 'order_manager' | 'product_manager' | 'analyst';
  avatar?: string;
}

// Analytics Summary Data
export type DashboardTimeFilter = 'today' | '7days' | '30days' | 'month' | 'all';

export interface DashboardAnalytics {
  todaySales: number;
  todayOrders: number;
  totalCustomers: number;
  totalProductsSold: number;
  averageOrderValue: number;
  cartAbandonmentRate: number;
  conversionRate: number;
  ordersByStatus: Record<OrderStatus, number>;
  lowStockCount: number;
  outOfStockCount: number;
  salesData7Days: { date: string; sales: number; orders: number }[];
  topSellingProducts: Product[];
  highDemandProducts: Product[];
}

// Business Health KPI Metrics
export interface DashboardStoreHealthMetrics {
  timeFilter: DashboardTimeFilter;
  netSales: number;
  grossSales: number;
  totalOrders: number;
  pendingOrders: number;
  confirmedOrders: number;
  processingOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  refundedOrders: number;
  averageOrderValue: number;
  totalCustomers: number;
  totalCatalogProducts: number;
  activeProductsCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  lowStockThreshold: number;
  salesChartData: {
    label: string;
    date: string;
    sales: number;
    orders: number;
    aov: number;
  }[];
}

// Demand Analysis & Inventory Restock Intelligence
export type RestockPriority = 'CRITICAL' | 'MONITOR' | 'HEALTHY' | 'SLOW_MOVING';
export type DemandLevel = 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface ProductDemandIntelligence {
  product: Product;
  unitsSold: number;
  ordersCount: number;
  revenueGenerated: number;
  currentStock: number;
  demandScore: number;
  demandLevel: DemandLevel;
  restockPriority: RestockPriority;
  salesVelocityPerDay: number;
  stockRunoutDays: number | null; // estimated days until stock reaches 0
}

export interface CategoryDemandAnalysis {
  categoryId: string;
  categoryName: string;
  unitsSold: number;
  ordersCount: number;
  revenue: number;
  productCount: number;
  marketSharePercentage: number;
  topProduct?: Product;
}

// Courier Service Management & Automatic Assignment Types
export type CourierProviderId = 'steadfast' | 'pathao' | 'redx' | 'paperfly' | 'ecourier' | 'sundarban' | 'custom';

export interface CourierServiceConfig {
  id: string;
  name: string;
  provider: CourierProviderId;
  isActive: boolean;
  isDefault: boolean;
  priority: number; // 1 = highest priority, 2, 3...
  apiKey: string;
  secretKey?: string;
  apiBaseUrl?: string;
  merchantId?: string;
  webhookSecret?: string;
  senderName?: string;
  senderPhone?: string;
  senderAddress?: string;
  autoAssignOnConfirm: boolean;
  notes?: string;
  lastTestedAt?: string;
  lastTestStatus?: 'success' | 'failed';
  lastTestMessage?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CourierBookingPayload {
  orderId: string;
  orderNumber: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  recipientDistrict: string;
  recipientThana?: string;
  codAmount: number; // 0 if prepaid, otherwise total order amount
  parcelWeightKg?: number;
  parcelNote?: string;
  itemCount?: number;
}

export interface CourierBookingResult {
  success: boolean;
  provider: CourierProviderId;
  courierName: string;
  consignmentId?: string;
  trackingCode?: string;
  trackingUrl?: string;
  status: 'booked' | 'failed' | 'pending';
  errorMessage?: string;
  rawResponse?: any;
}

export interface CourierTrackingResult {
  success: boolean;
  provider: CourierProviderId;
  trackingCode: string;
  consignmentId?: string;
  currentStatus: string;
  statusDetails?: string;
  location?: string;
  lastUpdated?: string;
  history?: {
    status: string;
    timestamp: string;
    note?: string;
  }[];
}

// ==========================================
// 3. PAYMENT GATEWAY & TRANSACTION MANAGEMENT TYPES
// Collections: 'payment_methods', 'payments'
// ==========================================
export type PaymentGatewayType = 'bkash' | 'nagad' | 'card' | 'cod' | 'manual' | 'sslcommerz' | 'amarpay' | 'stripe' | string;
export type PaymentMethodType = 'automated_gateway' | 'manual_mfs' | 'cash_on_delivery' | 'custom';

export interface PaymentMethodConfig {
  id: string; // 'bkash' | 'nagad' | 'card' | 'cod' or custom id
  name: string; // e.g. "bKash"
  displayName: string; // Display title e.g. "bKash Online Payment" / "bKash Personal Send Money"
  type: PaymentMethodType;
  provider: PaymentGatewayType;
  accountType?: 'merchant' | 'personal' | 'agent';
  accountNumber?: string;
  accountName?: string;
  isEnabled: boolean;
  isSandbox: boolean;
  displayOrder?: number;
  sortOrder?: number;
  badge?: string; // e.g. "Instant 5% Cashback", "Popular", "Manual MFS"
  iconUrl?: string;
  logoUrl?: string;
  description?: string;
  instructionText?: string;
  instructions?: string;
  minOrderAmount?: number;
  maxOrderAmount?: number;
  chargePercentage?: number; // Gateway fee e.g. 1.5%
  fixedCharge?: number;
  isConfigured?: boolean; // Computed or flags if required API keys/merchant IDs are present
  credentialsNotice?: string;
  credentials?: Record<string, string>;
  requiresTransactionId?: boolean;
  requiresSenderNumber?: boolean;
  supportedCurrencies?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface PaymentTransaction {
  id: string;
  orderId: string;
  orderNumber?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  method?: PaymentGatewayType;
  gateway?: string;
  paymentMethodName?: string;
  type?: PaymentMethodType;
  provider?: string;
  amount: number;
  currency: 'BDT' | string;
  status: 'pending' | 'processing' | 'paid' | 'verified' | 'completed' | 'failed' | 'rejected' | 'cancelled' | 'refunded';
  transactionId?: string;
  senderNumber?: string;
  gatewayPaymentId?: string;
  paymentId?: string;
  paymentUrl?: string;
  initiatedAt?: string;
  paidAt?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  refundedAt?: string;
  refundAmount?: number;
  refundReason?: string;
  notes?: string;
  ipAddress?: string;
  errorMessage?: string;
  rawGatewayResponse?: any;
  createdAt?: any;
  updatedAt?: any;
  metadata?: Record<string, any>;
}

export interface PaymentInitiationRequest {
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: 'BDT' | string;
  paymentMethod: PaymentGatewayType;
  paymentMethodId?: string;
  customer: {
    name: string;
    phone: string;
    email?: string;
    address: string;
  };
  callbackUrl?: string;
  senderNumber?: string;
  transactionId?: string;
}

export interface PaymentInitiationResponse {
  success: boolean;
  paymentId?: string;
  paymentUrl?: string;
  gatewayPaymentId?: string;
  status: 'pending' | 'redirect_required' | 'completed' | 'failed';
  message?: string;
  errorMessage?: string;
  isSandbox?: boolean;
}

export interface PaymentVerificationRequest {
  orderId: string;
  paymentId?: string;
  gatewayPaymentId?: string;
  transactionId?: string;
  paymentMethod: PaymentGatewayType;
  senderNumber?: string;
}

export interface PaymentVerificationResponse {
  success: boolean;
  isPaid: boolean;
  status: 'paid' | 'verified' | 'failed' | 'cancelled' | 'pending' | 'rejected';
  transactionId?: string;
  amount: number;
  currency: string;
  paidAt?: string;
  message?: string;
  errorMessage?: string;
  rawResponse?: any;
}

export interface PaymentRefundRequest {
  paymentId: string;
  orderId: string;
  transactionId: string;
  amount: number;
  reason: string;
  paymentMethod: PaymentGatewayType;
}

export interface PaymentRefundResponse {
  success: boolean;
  refundTrxId?: string;
  refundedAmount: number;
  message: string;
  errorMessage?: string;
}

