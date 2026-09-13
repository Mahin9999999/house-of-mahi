import { 
  Product, 
  Category, 
  Review, 
  Order, 
  UserProfile, 
  HeroBanner, 
  HomepageSection, 
  MarketingPixelsConfig, 
  SeoConfig,
  PageSeoItem,
  StoreSettings, 
  AdminUser, 
  DashboardAnalytics 
} from './types';

export const INITIAL_USER: UserProfile = {
  id: 'usr-001',
  name: 'Mahima Mahi',
  email: 'mahimamahi456789@gmail.com',
  phone: '01400-031902',
  address: 'E-76 Jalkuri Majpara, Jalkuri-1420',
  district: 'Narayanganj',
  thana: 'Siddirganj',
  totalOrders: 3,
  totalSpent: 3450,
  status: 'vip'
};

export const CATEGORIES: Category[] = [
  {
    id: 'cat-necklaces',
    name: 'Necklaces',
    slug: 'necklaces',
    description: 'Gold plated, Kundan & bridal choker necklace sets',
    image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&q=80&w=800',
    displayOrder: 1,
    productCount: 24
  },
  {
    id: 'cat-earrings',
    name: 'Earrings',
    slug: 'earrings',
    description: 'Pearl drop, Jhumka, stud & oxidized hanging earrings',
    image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&q=80&w=800',
    displayOrder: 2,
    productCount: 38
  },
  {
    id: 'cat-rings',
    name: 'Rings',
    slug: 'rings',
    description: 'Adjustable CZ stone, crystal & floral pattern rings',
    image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&q=80&w=800',
    displayOrder: 3,
    productCount: 19
  },
  {
    id: 'cat-bracelets',
    name: 'Bangles & Bracelets',
    slug: 'bangles-bracelets',
    description: 'Rose gold, cubic zirconia & openable bangles',
    image: 'https://images.unsplash.com/photo-1611591475140-13e7100b7d34?auto=format&fit=crop&q=80&w=800',
    displayOrder: 4,
    productCount: 15
  },
  {
    id: 'cat-bags',
    name: 'Bags & Accessories',
    slug: 'bags-accessories',
    description: 'Handbags, clutches, small bags & party accessories',
    image: 'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?auto=format&fit=crop&q=80&w=800',
    displayOrder: 5,
    productCount: 10
  },
  // Sample subcategories under Bags & Accessories
  {
    id: 'cat-sub-small-bags',
    name: 'Small Bags',
    slug: 'small-bags',
    parentCategory: 'bags-accessories',
    description: 'Compact clutches and small handheld bags',
    image: 'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?auto=format&fit=crop&q=80&w=800',
    displayOrder: 1,
    productCount: 4
  },
  {
    id: 'cat-sub-hand-bags',
    name: 'Hand Bags',
    slug: 'hand-bags',
    parentCategory: 'bags-accessories',
    description: 'Everyday and party wear handbags',
    image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&q=80&w=800',
    displayOrder: 2,
    productCount: 6
  }
];

export const PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'Elegant Pearl Drop Earrings',
    sku: 'HOM-EAR-001',
    category: 'earrings',
    categoryLabel: 'Earrings',
    price: 280,
    originalPrice: 350,
    rating: 4.9,
    reviewsCount: 48,
    image: 'https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&q=80&w=800',
    galleryImages: [
      'https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&q=80&w=800'
    ],
    description: 'Exquisite handcrafted pearl drop earrings with premium gold polish finish. Perfect for weddings, parties, and festive celebrations in Bangladesh.',
    shortDescription: 'Handcrafted pearl drop earrings with premium gold polish.',
    inStock: true,
    stockQuantity: 25,
    isBestSeller: true,
    isFeatured: true,
    tags: ['Best Seller', 'Pearl', 'Earrings'],
    viewsCount: 3420,
    addedToCartCount: 420,
    wishlistCount: 280,
    salesCount: 185,
    demandScore: 2450,
    reviews: [
      {
        id: 'r-p1-1',
        userName: 'Mahin Hossain',
        rating: 5,
        date: '3 days ago',
        comment: 'Absolutely stunning pearl quality! The polish is shiny and it looks very regal.',
        verifiedPurchase: true,
        status: 'approved'
      },
      {
        id: 'r-p1-2',
        userName: 'Subarna Rahman',
        rating: 5,
        date: '1 week ago',
        comment: 'Super lightweight and comfortable to wear. Fast delivery in Banani!',
        verifiedPurchase: true,
        status: 'approved'
      }
    ]
  },
  {
    id: 'p2',
    name: 'Gold Plated Bridal Choker Set',
    sku: 'HOM-NEC-002',
    category: 'necklaces',
    categoryLabel: 'Necklaces',
    price: 850,
    originalPrice: 1150,
    rating: 4.8,
    reviewsCount: 62,
    image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&q=80&w=800',
    galleryImages: [
      'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&q=80&w=800'
    ],
    description: 'Traditional gold plated bridal choker necklace studded with sparkling CZ stones and pearl drops. Comes with matching earrings.',
    shortDescription: 'Bridal choker set studded with CZ stones and pearls.',
    inStock: true,
    stockQuantity: 12,
    isBestSeller: true,
    isFeatured: true,
    tags: ['Bridal', 'Necklace', 'Gold Plated'],
    viewsCount: 2890,
    addedToCartCount: 310,
    wishlistCount: 195,
    salesCount: 140,
    demandScore: 1980,
    reviews: [
      {
        id: 'r-p2-1',
        userName: 'Nusrat Jahan',
        rating: 5,
        date: '5 days ago',
        comment: 'Received in pristine packaging. The set looks even better in real life!',
        verifiedPurchase: true,
        status: 'approved'
      }
    ]
  },
  {
    id: 'p3',
    name: 'Sparkling Crystal Stone Ring',
    sku: 'HOM-RNG-003',
    category: 'rings',
    categoryLabel: 'Rings',
    price: 320,
    originalPrice: 420,
    rating: 4.7,
    reviewsCount: 31,
    image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&q=80&w=800',
    description: 'Sparkling floral crystal ring crafted with high quality cubic zirconia stones on an adjustable gold tone band.',
    shortDescription: 'Adjustable floral crystal ring with CZ stones.',
    inStock: true,
    stockQuantity: 4, // Low stock for demand warning demo
    isBestSeller: true,
    tags: ['Adjustable', 'Ring', 'Crystal'],
    viewsCount: 1850,
    addedToCartCount: 240,
    wishlistCount: 160,
    salesCount: 98,
    demandScore: 1420
  },
  {
    id: 'p4',
    name: 'Royal Kundan Antique Choker',
    sku: 'HOM-SET-004',
    category: 'sets',
    categoryLabel: 'Bridal Jewelry Sets',
    price: 1250,
    originalPrice: 1600,
    rating: 4.9,
    reviewsCount: 84,
    image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&q=80&w=800',
    description: 'Royal Kundan antique choker set with pearl drop tassels. Designed for grand wedding events and party attire.',
    shortDescription: 'Antique Kundan choker set with pearl tassels.',
    inStock: true,
    stockQuantity: 8,
    isBestSeller: true,
    isFeatured: true,
    tags: ['Kundan', 'Choker', 'Royal'],
    viewsCount: 4100,
    addedToCartCount: 510,
    wishlistCount: 390,
    salesCount: 210,
    demandScore: 3150
  },
  {
    id: 'p5',
    name: 'Meenakari Pearl Jhumka',
    sku: 'HOM-EAR-005',
    category: 'earrings',
    categoryLabel: 'Earrings',
    price: 450,
    originalPrice: 600,
    rating: 4.8,
    reviewsCount: 53,
    image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&q=80&w=800',
    description: 'Classic handcrafted Meenakari Jhumka earrings adorned with pearl droplets and fine filigree detail work.',
    shortDescription: 'Handcrafted Meenakari Jhumka with pearls.',
    inStock: true,
    stockQuantity: 30,
    isBestSeller: true,
    tags: ['Jhumka', 'Meenakari', 'Pearl'],
    viewsCount: 2100,
    addedToCartCount: 290,
    wishlistCount: 180,
    salesCount: 130,
    demandScore: 1810
  },
  {
    id: 'p6',
    name: 'Rose Gold CZ Stone Bracelet',
    sku: 'HOM-BRC-006',
    category: 'bracelets',
    categoryLabel: 'Bracelets & Bangles',
    price: 380,
    originalPrice: 500,
    rating: 4.7,
    reviewsCount: 27,
    image: 'https://images.unsplash.com/photo-1611591475140-13e7100b7d34?auto=format&fit=crop&q=80&w=800',
    description: 'Luxury CZ stone embedded openable bangle bracelet with rose gold tone plating. Smooth edges and tarnish resistant.',
    shortDescription: 'Rose gold tone CZ embedded bangle bracelet.',
    inStock: true,
    stockQuantity: 18,
    isBestSeller: true,
    tags: ['Bracelet', 'Rose Gold', 'Party Wear'],
    viewsCount: 1650,
    addedToCartCount: 180,
    wishlistCount: 120,
    salesCount: 88,
    demandScore: 1210
  },
  {
    id: 'p7',
    name: 'Gold Polish Hanging Jhumka',
    sku: 'HOM-EAR-007',
    category: 'earrings',
    categoryLabel: 'Earrings',
    price: 350,
    originalPrice: 400,
    rating: 4.6,
    reviewsCount: 19,
    image: 'https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&q=80&w=800',
    description: 'Lightweight gold polish hanging jhumkas with delicate floral motifs. Ideal for daily casual or office wear.',
    shortDescription: 'Lightweight floral gold polish jhumka.',
    inStock: true,
    stockQuantity: 22,
    isNew: true,
    tags: ['Jhumka', 'Gold Plated'],
    viewsCount: 980,
    addedToCartCount: 95,
    wishlistCount: 60,
    salesCount: 42,
    demandScore: 680
  },
  {
    id: 'p8',
    name: 'Rajasthani Kundan Neckpiece',
    sku: 'HOM-NEC-008',
    category: 'necklaces',
    categoryLabel: 'Necklaces',
    price: 750,
    originalPrice: 850,
    rating: 4.8,
    reviewsCount: 45,
    image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&q=80&w=800',
    description: 'Gorgeous Rajasthani Kundan bridal neckpiece crafted with maroon enamel work and golden bead drops.',
    shortDescription: 'Rajasthani Kundan neckpiece with golden beads.',
    inStock: true,
    stockQuantity: 15,
    isNew: true,
    tags: ['Kundan', 'Bridal'],
    viewsCount: 1420,
    addedToCartCount: 160,
    wishlistCount: 110,
    salesCount: 76,
    demandScore: 1090
  },
  {
    id: 'p9',
    name: 'Zari Embroidered Silk Potli Bag',
    sku: 'HOM-BAG-009',
    category: 'bags',
    categoryLabel: 'Bags & Accessories',
    price: 1450,
    originalPrice: 1850,
    rating: 4.9,
    reviewsCount: 39,
    image: 'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?auto=format&fit=crop&q=80&w=800',
    description: 'Handcrafted Zari embroidered bridal potli clutch bag with pearl handle and drawstrings.',
    shortDescription: 'Embroidered silk potli bag with pearl handle.',
    inStock: true,
    stockQuantity: 10,
    isFeatured: true,
    tags: ['Potli', 'Bridal Bag', 'Zari'],
    viewsCount: 1950,
    addedToCartCount: 210,
    wishlistCount: 140,
    salesCount: 92,
    demandScore: 1390
  }
];

export const BANNERS: HeroBanner[] = [
  {
    id: 'banner-1',
    title: 'Timeless Beauty Just for You',
    subtitle: 'Discover Our Exclusive Women Jewelry & Accessories Collection',
    tagline: 'ROYAL FESTIVE 2026',
    desktopImage: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&q=80&w=1600',
    mobileImage: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&q=80&w=800',
    buttonText: 'SHOP NOW',
    buttonUrl: '/shop',
    isActive: true,
    displayOrder: 1
  },
  {
    id: 'banner-2',
    title: 'Shine Like You Mean It',
    subtitle: 'Handcrafted Kundan, Antique Gold & Pearl Bridal Sets',
    tagline: 'EXCLUSIVE BRIDAL',
    desktopImage: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&q=80&w=1600',
    mobileImage: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&q=80&w=800',
    buttonText: 'EXPLORE COLLECTIONS',
    buttonUrl: '/category/sets',
    isActive: true,
    displayOrder: 2
  }
];

export const HERO_SLIDES = BANNERS;

export const HOMEPAGE_SECTIONS: HomepageSection[] = [
  { id: 'sec-hero', type: 'hero', title: 'Hero Banners', enabled: true, displayOrder: 1 },
  { id: 'sec-categories', type: 'categories', title: 'Shop By Category', subtitle: 'Explore our wide range of jewelry', enabled: true, displayOrder: 2 },
  { id: 'sec-best-sellers', type: 'best_sellers', title: 'Best Sellers', subtitle: 'Most loved designs by our customers', enabled: true, displayOrder: 3 },
  { id: 'sec-promo', type: 'promo_banner', title: 'Promotional Banner', enabled: true, displayOrder: 4 },
  { id: 'sec-new-arrivals', type: 'new_arrivals', title: 'New Arrivals', subtitle: 'Freshly crafted jewelry collections', enabled: true, displayOrder: 5 },
  { id: 'sec-trust', type: 'trust_features', title: 'Why Shop With Us', enabled: true, displayOrder: 6 },
  { id: 'sec-reviews', type: 'reviews', title: 'Customer Reviews', subtitle: 'What our happy clients say', enabled: true, displayOrder: 7 }
];

export const INITIAL_REVIEWS: Review[] = [
  {
    id: 'r1',
    userName: 'Nusrat Jahan',
    rating: 5,
    date: '2 days ago',
    comment: 'Exquisite quality! Received the Kundan Choker in Dhaka within 24 hours. Exactly as shown in photos!',
    verifiedPurchase: true,
    status: 'approved'
  },
  {
    id: 'r2',
    userName: 'Subarna Rahman',
    rating: 5,
    date: '1 week ago',
    comment: 'The Pearl Earrings exceeded my expectations. So lightweight and comfortable to wear all evening.',
    verifiedPurchase: true,
    status: 'approved'
  },
  {
    id: 'r3',
    userName: 'Tanjila Akter',
    rating: 4,
    date: '2 weeks ago',
    comment: 'Cash on delivery was smooth and the packaging box was premium with a velvet pouch inside.',
    verifiedPurchase: true,
    status: 'approved'
  }
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'HOM-984210',
    orderNumber: 'HOM-984210',
    date: 'August 08, 2026',
    items: [
      { product: PRODUCTS[0], quantity: 1, selectedFinish: 'Gold' },
      { product: PRODUCTS[1], quantity: 1 }
    ],
    subtotal: 1130,
    shippingCharge: 80,
    discount: 0,
    total: 1210,
    status: 'Shipped',
    paymentMethod: 'cod',
    paymentStatus: 'unpaid',
    customer: {
      name: 'Nusrat Jahan',
      phone: '01711-882233',
      email: 'nusrat.jahan@gmail.com',
      address: 'House 42, Road 11, Banani',
      district: 'Dhaka',
      thana: 'Banani',
      note: 'Deliver during afternoon please'
    },
    trackingNumber: 'STEAD-984210-BD',
    utmSource: 'facebook',
    utmCampaign: 'eid_jewel_sale'
  },
  {
    id: 'HOM-984211',
    orderNumber: 'HOM-984211',
    date: 'August 10, 2026',
    items: [
      { product: PRODUCTS[3], quantity: 1 }
    ],
    subtotal: 1250,
    shippingCharge: 150,
    discount: 100,
    total: 1300,
    status: 'Processing',
    paymentMethod: 'bkash',
    paymentStatus: 'paid',
    customer: {
      name: 'Dr. Sharmin Akter',
      phone: '01822-990011',
      email: 'sharmin.doc@yahoo.com',
      address: 'Near Government College, Station Road',
      district: 'Chittagong',
      thana: 'Kotwali'
    },
    trackingNumber: 'STEAD-984211-BD',
    utmSource: 'instagram',
    utmCampaign: 'bridal_ad'
  }
];

export const MARKETING_PIXELS_CONFIG: MarketingPixelsConfig = {
  // 1. Meta / Facebook Pixel
  metaPixelId: '1029384756102938',
  metaPixelName: 'Houseofmahi Meta Pixel (Primary Dataset)',
  metaPixelEnabled: true,
  metaAdvancedMatching: true,
  metaTestEventCode: 'TEST12345',

  // 2. Google Analytics 4
  ga4MeasurementId: 'G-HOUSEOFMAHI2026',
  ga4PropertyId: '450912830',
  ga4DataStreamId: '984120392',
  ga4StreamName: 'Houseofmahi Web Storefront',
  ga4WebsiteUrl: 'https://houseofmahibd.com',
  ga4Currency: 'BDT',
  ga4EnhancedMeasurement: true,
  ga4DebugMode: false,
  ga4Enabled: true,

  // 3. Google Tag Manager
  gtmContainerId: 'GTM-MAHI999',
  gtmContainerName: 'Houseofmahi Production GTM',
  gtmEnabled: true,

  // 4. Google Ads Conversion Tracking
  googleAdsConversionId: 'AW-10948291029',
  googleAdsConversionLabel: 'xYzAbC9876543210',
  googleAdsConversionName: 'Houseofmahi Purchase Conversion',
  googleAdsEnabled: true,

  // 5. TikTok Pixel
  tiktokPixelId: 'C1234567890TIKTOK',
  tiktokPixelName: 'Houseofmahi TikTok Ads Pixel',
  tiktokEnabled: true,

  // 6. Microsoft Clarity
  clarityProjectId: 'mahi_clarity_8e9',
  clarityProjectName: 'Houseofmahi UX Heatmaps',
  clarityEnabled: false,

  // 7. Custom Tracking Scripts
  customHeaderScript: '',
  customBodyScript: '',
  customScriptEnabled: false,

  // Global & Diagnostics
  testModeEnabled: false,
  lastTestedAt: new Date().toISOString()
};

export const SEO_CONFIG: SeoConfig = {
  // Brand & Defaults
  brandName: 'Houseofmahi',
  homepageTitle: 'Houseofmahi | Premium Beauty Studio & Women Jewelry Bangladesh',
  homepageDescription: 'Shop handcrafted pearl drop earrings, Kundan bridal choker sets, crystal rings and luxury accessories with cash on delivery across Bangladesh.',
  siteKeywords: 'jewelry bangladesh, houseofmahi, bridal choker, pearl earrings, kundan set, online jewelry shop dhaka',
  canonicalBaseUrl: 'https://houseofmahibd.com',

  // Social Sharing & Open Graph Defaults
  defaultOgTitle: 'Houseofmahi | Premium Handcrafted Jewelry & Accessories',
  defaultOgDescription: 'Explore our latest collection of artisanal earrings, bridal choker necklaces, rings, and curated beauty sets.',
  defaultOgImage: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&q=80&w=1200',
  defaultTwitterCard: 'summary_large_image',
  defaultTwitterTitle: 'Houseofmahi | Premium Jewelry Bangladesh',
  defaultTwitterDescription: 'Elevate your everyday aesthetic with bespoke jewelry and premium bridal sets.',
  defaultTwitterImage: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&q=80&w=1200',

  // Search Engine & Robots Directives
  robotsIndex: true,
  robotsFollow: true,
  allowSearchEngines: true,
  customRobotsTxt: '',

  // Organization & Local Business Structured Data
  orgName: 'Houseofmahi',
  orgLegalName: 'Houseofmahi Bangladesh',
  orgUrl: 'https://houseofmahibd.com',
  orgLogo: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&q=80&w=400',
  orgPhone: '01400-031902',
  orgEmail: 'mahimamahi456789@gmail.com',
  orgAddressStreet: 'E-76 Jalkuri Majpara, Jalkuri-1420',
  orgAddressLocality: 'Siddirganj, Narayanganj',
  orgAddressRegion: 'Dhaka Division',
  orgPostalCode: '1420',
  orgCountry: 'BD',
  socialFacebookUrl: 'https://facebook.com/houseofmahi',
  socialInstagramUrl: 'https://instagram.com/houseofmahi',
  socialYoutubeUrl: '',
  socialTiktokUrl: '',
  socialPinterestUrl: '',

  // Sitemap configuration
  sitemapEnabled: true,
  sitemapLastGenerated: new Date().toISOString()
};

export const DEFAULT_PAGES_SEO: PageSeoItem[] = [
  {
    id: 'home',
    pageName: 'Home',
    path: '/',
    title: 'Houseofmahi | Premium Beauty Studio & Women Jewelry Bangladesh',
    description: 'Shop handcrafted pearl drop earrings, Kundan bridal choker sets, crystal rings and luxury accessories with cash on delivery across Bangladesh.',
    primaryKeyword: 'jewelry bangladesh',
    secondaryKeywords: ['bridal choker', 'pearl earrings', 'kundan jewelry'],
    canonicalUrl: 'https://houseofmahibd.com/',
    indexStatus: 'index',
    followStatus: 'follow',
    ogTitle: 'Houseofmahi | Handcrafted Jewelry & Bridal Collections',
    ogDescription: 'Shop handcrafted jewelry with cash on delivery nationwide across Bangladesh.',
    ogImage: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&q=80&w=1200',
    twitterCard: 'summary_large_image',
    schemaType: 'WebPage'
  },
  {
    id: 'shop',
    pageName: 'Shop / All Collections',
    path: '/shop',
    title: 'All Jewelry & Accessories Collections | Houseofmahi',
    description: 'Browse all categories of artisan jewelry including necklaces, jhumkas, bracelets, rings and bridal sets at Houseofmahi.',
    primaryKeyword: 'online jewelry shop',
    secondaryKeywords: ['jewelry collection', 'women accessories dhaka'],
    canonicalUrl: 'https://houseofmahibd.com/shop',
    indexStatus: 'index',
    followStatus: 'follow',
    ogTitle: 'Shop Exclusive Jewelry Online | Houseofmahi',
    ogDescription: 'Explore our complete collection of bespoke jewelry and designer pieces.',
    ogImage: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&q=80&w=1200',
    twitterCard: 'summary_large_image',
    schemaType: 'CollectionPage'
  },
  {
    id: 'about',
    pageName: 'About Us',
    path: '/about',
    title: 'Our Story & Craftsmanship | Houseofmahi Jewelry',
    description: 'Discover the artistry and passion behind Houseofmahi - crafting premium handcrafted jewelry and luxury accessories in Bangladesh.',
    primaryKeyword: 'houseofmahi brand',
    secondaryKeywords: ['handcrafted jewelry story', 'artisanal jewelry dhaka'],
    canonicalUrl: 'https://houseofmahibd.com/about',
    indexStatus: 'index',
    followStatus: 'follow',
    ogTitle: 'About Houseofmahi | Craftsmanship & Luxury',
    ogDescription: 'Learn about our journey in curating authentic, high-quality handcrafted jewelry.',
    ogImage: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&q=80&w=1200',
    twitterCard: 'summary_large_image',
    schemaType: 'AboutPage'
  },
  {
    id: 'contact',
    pageName: 'Contact & Support',
    path: '/contact',
    title: 'Customer Care & Contact Us | Houseofmahi',
    description: 'Get in touch with Houseofmahi customer support team for order inquiries, custom sizing, bridal consultation, and delivery assistance.',
    primaryKeyword: 'houseofmahi customer care',
    secondaryKeywords: ['jewelry support hotline', 'bangladesh jewelry order helpline'],
    canonicalUrl: 'https://houseofmahibd.com/contact',
    indexStatus: 'index',
    followStatus: 'follow',
    ogTitle: 'Contact Houseofmahi Support Team',
    ogDescription: 'We are here to assist you with order inquiries and styling assistance.',
    ogImage: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&q=80&w=1200',
    twitterCard: 'summary_large_image',
    schemaType: 'ContactPage'
  },
  {
    id: 'cart',
    pageName: 'Shopping Cart',
    path: '/cart',
    title: 'Your Shopping Bag | Houseofmahi',
    description: 'Review your selected jewelry pieces, apply promo discount codes, and proceed to secure checkout at Houseofmahi.',
    canonicalUrl: 'https://houseofmahibd.com/cart',
    indexStatus: 'noindex',
    followStatus: 'nofollow',
    schemaType: 'CheckoutPage'
  },
  {
    id: 'wishlist',
    pageName: 'My Wishlist',
    path: '/wishlist',
    title: 'Saved Favorites & Wishlist | Houseofmahi',
    description: 'Your curated list of favorite jewelry items and accessories saved for later on Houseofmahi.',
    canonicalUrl: 'https://houseofmahibd.com/wishlist',
    indexStatus: 'noindex',
    followStatus: 'nofollow',
    schemaType: 'WebPage'
  },
  {
    id: 'account',
    pageName: 'User Account Dashboard',
    path: '/account',
    title: 'My Profile & Order History | Houseofmahi',
    description: 'Manage your profile, track shipments, check verified reviews, and update delivery addresses.',
    canonicalUrl: 'https://houseofmahibd.com/account',
    indexStatus: 'noindex',
    followStatus: 'nofollow',
    schemaType: 'WebPage'
  }
];

export const STORE_SETTINGS: StoreSettings = {
  storeName: 'Houseofmahi',
  phone: '01400-031902',
  email: 'mahimamahi456789@gmail.com',
  address: 'E-76 Jalkuri Majpara, Jalkuri-1420, Siddirganj, Narayanganj',
  currency: 'BDT',
  currencySymbol: '৳',
  shippingInsideDhaka: 80,
  shippingOutsideDhaka: 150,
  freeShippingThreshold: 2500,
  announcementText: '✨ FREE EXPRESS SHIPPING ACROSS BANGLADESH ON ORDERS OVER ৳2,500! ✨',
  announcementEnabled: true,
  announcementBgColor: '#6B1228',
  announcementTextColor: '#FAF8F5',
  facebookUrl: 'https://facebook.com/houseofmahi',
  instagramUrl: 'https://instagram.com/houseofmahi',
  whatsappNumber: '8801400031902'
};

export const ADMIN_USERS: AdminUser[] = [
  {
    id: 'adm-01',
    username: 'mahi_admin',
    name: 'Mahima Mahi',
    email: 'mahimamahi456789@gmail.com',
    role: 'super_admin'
  },
  {
    id: 'adm-02',
    username: 'store_manager_1',
    name: 'Tanvir Hossain',
    email: 'tanvir@houseofmahi.com',
    role: 'store_manager'
  }
];

export const INITIAL_ANALYTICS: DashboardAnalytics = {
  todaySales: 12500,
  todayOrders: 14,
  totalCustomers: 480,
  totalProductsSold: 1240,
  averageOrderValue: 890,
  cartAbandonmentRate: 24.5,
  conversionRate: 3.8,
  ordersByStatus: {
    'Pending': 5,
    'Confirmed': 2,
    'Processing': 8,
    'Shipped': 4,
    'Delivered': 42,
    'Cancelled': 2,
    'Refunded': 1
  },
  lowStockCount: 2,
  outOfStockCount: 1,
  salesData7Days: [
    { date: 'Aug 05', sales: 9800, orders: 11 },
    { date: 'Aug 06', sales: 11200, orders: 13 },
    { date: 'Aug 07', sales: 14500, orders: 16 },
    { date: 'Aug 08', sales: 10400, orders: 12 },
    { date: 'Aug 09', sales: 16800, orders: 19 },
    { date: 'Aug 10', sales: 13200, orders: 15 },
    { date: 'Aug 11', sales: 12500, orders: 14 }
  ],
  topSellingProducts: PRODUCTS.slice(0, 5),
  highDemandProducts: PRODUCTS.slice(0, 4)
};
