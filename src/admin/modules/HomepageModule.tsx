import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Eye, 
  EyeOff, 
  ArrowUp, 
  ArrowDown, 
  X, 
  Save, 
  Layers,
  Upload,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Grid,
  Sparkles,
  Tag,
  Star,
  Clock,
  ShieldCheck,
  MessageSquare,
  BookOpen,
  Mail,
  Palette,
  Image as ImageIcon,
  Flame,
  RefreshCw,
  Search,
  Check,
  SlidersHorizontal,
  LayoutTemplate
} from 'lucide-react';
import { useAdminStore } from '../../store/useAdminStore';
import { 
  HomepageSection, 
  HomepageSectionType, 
  HomepageSectionSettings,
  Product,
  Category
} from '../../types';
import { uploadImageToCloudinary } from '../../firebase/cloudinaryService';
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  writeBatch 
} from 'firebase/firestore';
import { db } from '../../firebase/config';

// Unified Persistent Storage Key for Offline & Instant Refresh Recovery
const HOMEPAGE_SECTIONS_STORAGE_KEY = 'hom_homepage_sections_cache_v2';

// Helper to remove any undefined fields before sending to Firestore
function cleanPayload<T extends Record<string, any>>(obj: T): Record<string, any> {
  if (!obj || typeof obj !== 'object') return obj || {};
  const result: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const val = (obj as any)[key];
    if (val !== undefined) {
      if (val !== null && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
        result[key] = cleanPayload(val);
      } else if (Array.isArray(val)) {
        result[key] = val
          .filter((item: any) => item !== undefined)
          .map((item: any) => (item !== null && typeof item === 'object' && !(item instanceof Date)) ? cleanPayload(item) : item);
      } else {
        result[key] = val;
      }
    }
  }
  return result;
}

// Available section types metadata
const SECTION_TYPE_OPTIONS: Array<{
  type: HomepageSectionType;
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  defaultTitle: string;
}> = [
  {
    type: 'categories',
    label: 'Featured Categories',
    description: 'Display curated jewelry categories with round visual cards.',
    icon: Grid,
    defaultTitle: 'Shop By Category'
  },
  {
    type: 'best_sellers',
    label: 'Best Sellers',
    description: 'Dynamic grid or slider showcasing top-selling royal jewels.',
    icon: Sparkles,
    defaultTitle: 'Most Loved Best Sellers'
  },
  {
    type: 'new_arrivals',
    label: 'New Arrivals',
    description: 'Showcase newly crafted royal bridal and party jewellery.',
    icon: Tag,
    defaultTitle: 'Fresh New Arrivals'
  },
  {
    type: 'featured_products',
    label: 'Featured Products',
    description: 'Highlight specific handpicked jewellery pieces.',
    icon: Star,
    defaultTitle: 'Signature Heritage Picks'
  },
  {
    type: 'product_grid',
    label: 'Product Grid',
    description: 'Standard catalog grid layout with filters and limits.',
    icon: Grid,
    defaultTitle: 'Explore The Royal Showcase'
  },
  {
    type: 'flash_sale',
    label: 'Flash Sale & Countdown',
    description: 'Limited-time special offers with countdown timer and discount badge.',
    icon: Flame,
    defaultTitle: 'Limited Time Royal Flash Deals'
  },
  {
    type: 'promotional_banner',
    label: 'Promotional Banner Section',
    description: 'In-page banner with promotional imagery and call-to-action button.',
    icon: ImageIcon,
    defaultTitle: 'Exclusive Artisanal Showcase'
  },
  {
    type: 'trust_features',
    label: 'Trust & Value Badges',
    description: 'Showcase 100% hallmarked polish, fast delivery, and guarantees.',
    icon: ShieldCheck,
    defaultTitle: 'The House of Mahi Guarantee'
  },
  {
    type: 'reviews',
    label: 'Customer Reviews Showcase',
    description: 'Display authentic testimonials and verified buyer ratings.',
    icon: MessageSquare,
    defaultTitle: 'What Our Royalty Says'
  },
  {
    type: 'brand_story',
    label: 'Brand Heritage & Story',
    description: 'Rich narrative section with artisanal history and photograph.',
    icon: BookOpen,
    defaultTitle: 'Our Artisanal Heritage'
  },
  {
    type: 'newsletter',
    label: 'VIP Newsletter Signup',
    description: 'Lead capture banner for exclusive luxury royal announcements.',
    icon: Mail,
    defaultTitle: 'Join The House of Mahi Circle'
  },
  {
    type: 'custom_collection',
    label: 'Custom Collection',
    description: 'Custom curated collection for Eid, Weddings, or Festive Edit.',
    icon: Palette,
    defaultTitle: 'Bridal & Festive Edit'
  }
];

// Curated 7 Luxury Royal Default Sections for One-Click Seeding
const DEFAULT_ROYAL_SECTIONS: Omit<HomepageSection, 'id'>[] = [
  {
    sectionType: 'categories',
    type: 'categories',
    title: 'Shop By Category',
    subtitle: 'Curated Regal Collections for Every Celebration',
    isActive: true,
    enabled: true,
    sortOrder: 1,
    displayOrder: 1,
    settings: {
      layoutStyle: 'grid',
      columnsDesktop: 4,
      columnsMobile: 2
    }
  },
  {
    sectionType: 'best_sellers',
    type: 'best_sellers',
    title: 'Most Loved Best Sellers',
    subtitle: 'Signature Gold Plated & Kundan Masterpieces',
    isActive: true,
    enabled: true,
    sortOrder: 2,
    displayOrder: 2,
    settings: {
      layoutStyle: 'grid',
      columnsDesktop: 4,
      columnsMobile: 2,
      productLimit: 4,
      showPrice: true,
      showRating: true,
      showDiscountBadge: true
    }
  },
  {
    sectionType: 'promotional_banner',
    type: 'promotional_banner',
    title: 'Royal Bridal & Festive Showcase',
    subtitle: 'Limited Edition Heritage Collection',
    isActive: true,
    enabled: true,
    sortOrder: 3,
    displayOrder: 3,
    settings: {
      promoImageUrl: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&q=80&w=1600',
      promoImageAlt: 'Royal Bridal Showcase',
      promoLink: '/shop',
      promoButtonText: 'Explore Royal Jewels'
    }
  },
  {
    sectionType: 'new_arrivals',
    type: 'new_arrivals',
    title: 'Fresh New Arrivals',
    subtitle: 'Artisanal Perfection Crafted for Your Grace',
    isActive: true,
    enabled: true,
    sortOrder: 4,
    displayOrder: 4,
    settings: {
      layoutStyle: 'grid',
      columnsDesktop: 4,
      columnsMobile: 2,
      productLimit: 4,
      showPrice: true,
      showRating: true,
      showDiscountBadge: true
    }
  },
  {
    sectionType: 'trust_features',
    type: 'trust_features',
    title: 'The House of Mahi Guarantee',
    subtitle: 'Authenticity & Luxury in Every Detail',
    isActive: true,
    enabled: true,
    sortOrder: 5,
    displayOrder: 5,
    settings: {
      badgeItems: [
        { id: 'b1', icon: 'ShieldCheck', title: '100% Handcrafted Luxury', description: 'Authentic 22k gold micron plated artisanal designs' },
        { id: 'b2', icon: 'Truck', title: 'Fast Nationwide Delivery', description: 'Safe packaging with Cash on Delivery across Bangladesh' },
        { id: 'b3', icon: 'Sparkles', title: 'Velvet Presentation Box', description: 'Complimentary premium gift box with every order' },
        { id: 'b4', icon: 'RotateCcw', title: '7 Days Exchange Guarantee', description: 'Hassle-free replacement for complete peace of mind' }
      ]
    }
  },
  {
    sectionType: 'reviews',
    type: 'reviews',
    title: 'What Our Royalty Says',
    subtitle: 'Authentic Words from Discerning Brides & Clients',
    isActive: true,
    enabled: true,
    sortOrder: 6,
    displayOrder: 6,
    settings: {}
  },
  {
    sectionType: 'brand_story',
    type: 'brand_story',
    title: 'Our Artisanal Heritage',
    subtitle: 'Reviving Royal Bangladeshi Elegance',
    isActive: true,
    enabled: true,
    sortOrder: 7,
    displayOrder: 7,
    settings: {
      storyText: 'House of Mahi brings royal bridal jewellery, kundan sets, and timeless accessories crafted with premium polish and artisanal perfection for every memorable celebration in Bangladesh.',
      storyImageUrl: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&q=80&w=800',
      storyButtonText: 'Learn Our Story',
      storyButtonLink: '/about'
    }
  }
];

export const HomepageModule: React.FC = () => {
  // Use canonical homepageSections state and context from useAdminStore
  const {
    homepageSections,
    categories,
    products,
    isSyncing
  } = useAdminStore();

  const [isAddingSection, setIsAddingSection] = useState(false);
  const [editingSection, setEditingSection] = useState<HomepageSection | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Search & Filter state for product selector inside form
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [selectedProductCategory, setSelectedProductCategory] = useState<string>('all');

  // Cloudinary Upload States for Section Media (e.g. Promo Banner or Brand Story)
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    sectionType: HomepageSectionType;
    title: string;
    subtitle: string;
    isActive: boolean;
    sortOrder: number;
    settings: HomepageSectionSettings;
  }>({
    sectionType: 'categories',
    title: 'Shop By Category',
    subtitle: 'Explore our regal jewelry collection',
    isActive: true,
    sortOrder: (homepageSections?.length || 0) + 1,
    settings: {
      layoutStyle: 'grid',
      columnsDesktop: 4,
      columnsMobile: 2,
      productLimit: 8,
      showPrice: true,
      showRating: true,
      showDiscountBadge: true,
      categoryIds: [],
      productIds: [],
      promoImageUrl: '',
      promoImageAlt: '',
      promoLink: '/shop',
      promoButtonText: 'Discover Now',
      timerEndTime: '',
      flashSaleDiscountText: 'Up to 30% OFF',
      storyText: '',
      storyImageUrl: '',
      storyButtonText: 'Read Our Story',
      storyButtonLink: '/about'
    }
  });

  const showNotification = (type: 'success' | 'error', text: string) => {
    setFeedbackMessage({ type, text });
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 4500);
  };

  // -------------------------------------------------------------
  // REHYDRATION & REAL-TIME CLOUD FIRESTORE SYNCHRONIZATION
  // -------------------------------------------------------------
  useEffect(() => {
    let isMounted = true;

    // 1. Instant Cache Hydration: If Zustand is empty, load from localStorage immediately
    try {
      const cached = localStorage.getItem(HOMEPAGE_SECTIONS_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (useAdminStore.getState().homepageSections.length === 0) {
            useAdminStore.setState({ homepageSections: parsed });
          }
        }
      }
    } catch (e) {
      console.warn('LocalStorage hydration note:', e);
    }

    // 2. Real-time Firestore Listener on canonical collection 'homepageSections'
    const colRef = collection(db, 'homepageSections');
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      if (!isMounted) return;

      if (!snapshot.empty) {
        const remoteSections = snapshot.docs.map(docSnap => {
          const data = docSnap.data();
          const sortOrder = typeof data.sortOrder === 'number' 
            ? data.sortOrder 
            : (typeof data.displayOrder === 'number' ? data.displayOrder : 0);
          const isActive = data.isActive !== undefined 
            ? Boolean(data.isActive) 
            : (data.enabled !== undefined ? Boolean(data.enabled) : true);
          const secType = data.sectionType || data.type || 'categories';
          const settings = data.settings || data.config || {};

          return {
            ...data,
            id: docSnap.id,
            title: data.title || '',
            subtitle: data.subtitle || '',
            sectionType: secType,
            type: secType,
            sortOrder,
            displayOrder: sortOrder,
            isActive,
            enabled: isActive,
            settings,
            config: settings,
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString()
          } as HomepageSection;
        }).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

        // Update central store & local cache
        useAdminStore.setState({ homepageSections: remoteSections });
        try {
          localStorage.setItem(HOMEPAGE_SECTIONS_STORAGE_KEY, JSON.stringify(remoteSections));
        } catch (e) {
          console.warn('LocalStorage save note:', e);
        }
      } else {
        // If Firestore is empty, sync store and local cache to reflect real Cloud Firestore state
        useAdminStore.setState({ homepageSections: [] });
        try {
          localStorage.removeItem(HOMEPAGE_SECTIONS_STORAGE_KEY);
        } catch (e) {
          // ignore
        }
      }
    }, (error) => {
      console.warn('Firestore homepageSections onSnapshot warning:', error.message);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Manual Refresh Button Handler
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      const colRef = collection(db, 'homepageSections');
      const snap = await getDocs(colRef);
      if (!snap.empty) {
        const list = snap.docs.map(docSnap => {
          const data = docSnap.data();
          const sortOrder = typeof data.sortOrder === 'number' ? data.sortOrder : (typeof data.displayOrder === 'number' ? data.displayOrder : 0);
          const isActive = data.isActive !== undefined ? Boolean(data.isActive) : (data.enabled !== undefined ? Boolean(data.enabled) : true);
          const secType = data.sectionType || data.type || 'categories';
          const settings = data.settings || data.config || {};
          return {
            ...data,
            id: docSnap.id,
            title: data.title || '',
            subtitle: data.subtitle || '',
            sectionType: secType,
            type: secType,
            sortOrder,
            displayOrder: sortOrder,
            isActive,
            enabled: isActive,
            settings,
            config: settings,
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString()
          } as HomepageSection;
        }).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

        useAdminStore.setState({ homepageSections: list });
        localStorage.setItem(HOMEPAGE_SECTIONS_STORAGE_KEY, JSON.stringify(list));
        showNotification('success', `Refreshed ${list.length} sections from Cloud Firestore.`);
      } else {
        useAdminStore.setState({ homepageSections: [] });
        try {
          localStorage.removeItem(HOMEPAGE_SECTIONS_STORAGE_KEY);
        } catch (e) {
          // ignore
        }
        showNotification('success', 'Cloud Firestore layout is currently empty (0 sections).');
      }
    } catch (err: any) {
      console.error('Manual refresh error:', err);
      showNotification('error', `Refresh error: ${err?.message || 'Failed to fetch from Firestore'}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  // One-Click Royal Layout Seeding
  const handleSeedDefaultLayout = async () => {
    if (!window.confirm('Initialize royal storefront layout with 7 curated luxury sections (Categories, Best Sellers, Promo Banner, New Arrivals, Guarantee, Reviews, Story)?')) {
      return;
    }

    setIsSeeding(true);
    const now = new Date().toISOString();
    const preparedSections: HomepageSection[] = DEFAULT_ROYAL_SECTIONS.map((sec, idx) => ({
      ...sec,
      id: `sec_royal_${idx + 1}_${Date.now()}`,
      createdAt: now,
      updatedAt: now
    }));

    // 1. Immediately update Zustand Store and LocalStorage
    useAdminStore.setState({ homepageSections: preparedSections });
    try {
      localStorage.setItem(HOMEPAGE_SECTIONS_STORAGE_KEY, JSON.stringify(preparedSections));
    } catch (e) {
      console.warn('LocalStorage save note:', e);
    }

    // 2. Persist to Cloud Firestore
    try {
      const batch = writeBatch(db);
      preparedSections.forEach(s => {
        const docRef = doc(db, 'homepageSections', s.id);
        batch.set(docRef, cleanPayload(s), { merge: true });
      });
      await batch.commit();
      showNotification('success', 'Royal storefront layout initialized and synced to Cloud Firestore!');
    } catch (err: any) {
      console.warn('Batch seed note, persisting individually:', err);
      for (const s of preparedSections) {
        try {
          await setDoc(doc(db, 'homepageSections', s.id), cleanPayload(s), { merge: true });
        } catch (e) {
          // ignore
        }
      }
      showNotification('success', 'Royal storefront layout initialized and saved locally!');
    } finally {
      setIsSeeding(false);
    }
  };

  const handleOpenAddForm = () => {
    const defaultOption = SECTION_TYPE_OPTIONS[0];
    setFormData({
      sectionType: defaultOption.type,
      title: defaultOption.defaultTitle,
      subtitle: '',
      isActive: true,
      sortOrder: (homepageSections?.length || 0) + 1,
      settings: {
        layoutStyle: 'grid',
        columnsDesktop: 4,
        columnsMobile: 2,
        productLimit: 8,
        showPrice: true,
        showRating: true,
        showDiscountBadge: true,
        categoryIds: [],
        productIds: [],
        promoImageUrl: '',
        promoImageAlt: '',
        promoLink: '/shop',
        promoButtonText: 'Discover Now',
        timerEndTime: '',
        flashSaleDiscountText: 'Up to 30% OFF',
        storyText: '',
        storyImageUrl: '',
        storyButtonText: 'Read Our Story',
        storyButtonLink: '/about'
      }
    });
    setUploadError(null);
    setProductSearchQuery('');
    setSelectedProductCategory('all');
    setIsAddingSection(true);
    setEditingSection(null);
  };

  const handleOpenEditForm = (section: HomepageSection) => {
    const secType = section.sectionType || section.type || 'categories';
    setEditingSection(section);
    setFormData({
      sectionType: secType,
      title: section.title || '',
      subtitle: section.subtitle || '',
      isActive: section.isActive !== false && section.enabled !== false,
      sortOrder: section.sortOrder ?? section.displayOrder ?? 1,
      settings: {
        layoutStyle: section.settings?.layoutStyle || 'grid',
        columnsDesktop: section.settings?.columnsDesktop || 4,
        columnsMobile: section.settings?.columnsMobile || 2,
        productLimit: section.settings?.productLimit || 8,
        showPrice: section.settings?.showPrice !== false,
        showRating: section.settings?.showRating !== false,
        showDiscountBadge: section.settings?.showDiscountBadge !== false,
        categoryIds: section.settings?.categoryIds || [],
        productIds: section.settings?.productIds || [],
        promoImageUrl: section.settings?.promoImageUrl || '',
        promoImageAlt: section.settings?.promoImageAlt || '',
        promoLink: section.settings?.promoLink || '/shop',
        promoButtonText: section.settings?.promoButtonText || 'Discover Now',
        timerEndTime: section.settings?.timerEndTime || '',
        flashSaleDiscountText: section.settings?.flashSaleDiscountText || '',
        storyText: section.settings?.storyText || '',
        storyImageUrl: section.settings?.storyImageUrl || '',
        storyButtonText: section.settings?.storyButtonText || '',
        storyButtonLink: section.settings?.storyButtonLink || '',
        badgeItems: section.settings?.badgeItems || []
      }
    });
    setUploadError(null);
    setProductSearchQuery('');
    setSelectedProductCategory('all');
    setIsAddingSection(false);
  };

  const handleTypeChange = (newType: HomepageSectionType) => {
    const selectedOption = SECTION_TYPE_OPTIONS.find((opt) => opt.type === newType);
    setFormData((prev) => ({
      ...prev,
      sectionType: newType,
      title: prev.title === '' || SECTION_TYPE_OPTIONS.some((o) => o.defaultTitle === prev.title)
        ? (selectedOption?.defaultTitle || prev.title)
        : prev.title
    }));
  };

  const handleCloudinaryUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetField: 'promo' | 'story') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setUploadError('Image size exceeds 8MB limit. Please choose a smaller image.');
      return;
    }

    try {
      setIsUploadingImage(true);
      setUploadError(null);
      const url = await uploadImageToCloudinary(file, 'banners');
      
      setFormData((prev) => ({
        ...prev,
        settings: {
          ...prev.settings,
          ...(targetField === 'promo' 
            ? { promoImageUrl: url, promoImageAlt: prev.settings.promoImageAlt || prev.title } 
            : { storyImageUrl: url })
        }
      }));
      showNotification('success', 'Image uploaded to Cloudinary successfully.');
    } catch (err: any) {
      console.error('Cloudinary section upload error:', err);
      setUploadError(err?.message || 'Failed to upload image to Cloudinary.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleToggleCategorySelect = (catId: string) => {
    setFormData((prev) => {
      const current = prev.settings.categoryIds || [];
      const updated = current.includes(catId)
        ? current.filter((id) => id !== catId)
        : [...current, catId];
      return {
        ...prev,
        settings: {
          ...prev.settings,
          categoryIds: updated
        }
      };
    });
  };

  const handleToggleProductSelect = (prodId: string) => {
    setFormData((prev) => {
      const current = prev.settings.productIds || [];
      const updated = current.includes(prodId)
        ? current.filter((id) => id !== prodId)
        : [...current, prodId];
      return {
        ...prev,
        settings: {
          ...prev.settings,
          productIds: updated
        }
      };
    });
  };

  // Filtered products list for section selection
  const filteredProductOptions = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = !productSearchQuery.trim() || 
        p.name.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
        p.id.toLowerCase().includes(productSearchQuery.toLowerCase());
      const matchesCat = selectedProductCategory === 'all' || 
        p.category === selectedProductCategory || 
        (p.category && p.category.toLowerCase() === selectedProductCategory.toLowerCase());
      return matchesSearch && matchesCat;
    });
  }, [products, productSearchQuery, selectedProductCategory]);

  // -------------------------------------------------------------
  // SAVE / ADD / EDIT WITH DUAL CLOUD FIRESTORE & LOCAL RESILIENCE
  // -------------------------------------------------------------
  const handleSaveSection = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      setUploadError('Section title is required.');
      return;
    }

    if (formData.sectionType === 'promotional_banner' && !formData.settings.promoImageUrl?.trim()) {
      setUploadError('Promotional banner image is required.');
      return;
    }

    setIsSaving(true);
    setUploadError(null);

    const sectionId = editingSection ? editingSection.id : `sec_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const now = new Date().toISOString();

    const preparedSection: HomepageSection = {
      id: sectionId,
      sectionType: formData.sectionType,
      type: formData.sectionType,
      title: formData.title.trim(),
      subtitle: formData.subtitle.trim() || undefined,
      isActive: formData.isActive,
      enabled: formData.isActive,
      sortOrder: Number(formData.sortOrder) || 1,
      displayOrder: Number(formData.sortOrder) || 1,
      settings: cleanPayload({
        layoutStyle: formData.settings.layoutStyle || 'grid',
        columnsDesktop: Number(formData.settings.columnsDesktop) as any || 4,
        columnsMobile: Number(formData.settings.columnsMobile) as any || 2,
        productLimit: Number(formData.settings.productLimit) || undefined,
        showPrice: formData.settings.showPrice,
        showRating: formData.settings.showRating,
        showDiscountBadge: formData.settings.showDiscountBadge,
        categoryIds: formData.settings.categoryIds || [],
        productIds: formData.settings.productIds || [],
        promoImageUrl: formData.settings.promoImageUrl?.trim() || undefined,
        promoImageAlt: formData.settings.promoImageAlt?.trim() || undefined,
        promoLink: formData.settings.promoLink?.trim() || undefined,
        promoButtonText: formData.settings.promoButtonText?.trim() || undefined,
        timerEndTime: formData.settings.timerEndTime?.trim() || undefined,
        flashSaleDiscountText: formData.settings.flashSaleDiscountText?.trim() || undefined,
        storyText: formData.settings.storyText?.trim() || undefined,
        storyImageUrl: formData.settings.storyImageUrl?.trim() || undefined,
        storyButtonText: formData.settings.storyButtonText?.trim() || undefined,
        storyButtonLink: formData.settings.storyButtonLink?.trim() || undefined,
        badgeItems: formData.settings.badgeItems
      }),
      config: cleanPayload({
        layoutStyle: formData.settings.layoutStyle || 'grid',
        columnsDesktop: Number(formData.settings.columnsDesktop) as any || 4,
        columnsMobile: Number(formData.settings.columnsMobile) as any || 2,
        productLimit: Number(formData.settings.productLimit) || undefined,
        showPrice: formData.settings.showPrice,
        showRating: formData.settings.showRating,
        showDiscountBadge: formData.settings.showDiscountBadge,
        categoryIds: formData.settings.categoryIds || [],
        productIds: formData.settings.productIds || [],
        promoImageUrl: formData.settings.promoImageUrl?.trim() || undefined,
        promoImageAlt: formData.settings.promoImageAlt?.trim() || undefined,
        promoLink: formData.settings.promoLink?.trim() || undefined,
        promoButtonText: formData.settings.promoButtonText?.trim() || undefined,
        timerEndTime: formData.settings.timerEndTime?.trim() || undefined,
        flashSaleDiscountText: formData.settings.flashSaleDiscountText?.trim() || undefined,
        storyText: formData.settings.storyText?.trim() || undefined,
        storyImageUrl: formData.settings.storyImageUrl?.trim() || undefined,
        storyButtonText: formData.settings.storyButtonText?.trim() || undefined,
        storyButtonLink: formData.settings.storyButtonLink?.trim() || undefined,
        badgeItems: formData.settings.badgeItems
      }),
      createdAt: editingSection?.createdAt || now,
      updatedAt: now
    };

    // 1. Firestore MUST be the source of truth: Persist to Cloud Firestore FIRST
    try {
      const docRef = doc(db, 'homepageSections', sectionId);
      const sanitized = cleanPayload(preparedSection);
      await setDoc(docRef, sanitized, { merge: true });

      // 2. Only after Cloud Firestore write succeeds, update Zustand state and localStorage cache
      let nextList: HomepageSection[] = [];
      if (editingSection) {
        nextList = homepageSections.map(s => s.id === editingSection.id ? preparedSection : s);
      } else {
        nextList = [...homepageSections, preparedSection];
      }
      nextList.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

      useAdminStore.setState({ homepageSections: nextList });

      try {
        localStorage.setItem(HOMEPAGE_SECTIONS_STORAGE_KEY, JSON.stringify(nextList));
      } catch (e) {
        console.warn('LocalStorage save error:', e);
      }

      showNotification('success', `Homepage section "${formData.title}" saved successfully to Cloud Firestore!`);
      setEditingSection(null);
      setIsAddingSection(false);
    } catch (fsErr: any) {
      console.error('Firestore save section failed:', fsErr);
      const errorMsg = fsErr?.message || 'Permission denied, unauthenticated, or network issue';
      showNotification('error', `Firestore Save Failed: ${errorMsg}. Section was NOT saved.`);
    } finally {
      setIsSaving(false);
    }
  };

  // -------------------------------------------------------------
  // STATUS TOGGLE (ACTIVE / DISABLED)
  // -------------------------------------------------------------
  const handleToggleActive = async (section: HomepageSection) => {
    const currentActive = section.isActive !== false && section.enabled !== false;
    const nextStatus = !currentActive;
    const now = new Date().toISOString();

    // 1. Persist to Cloud Firestore FIRST
    try {
      const docRef = doc(db, 'homepageSections', section.id);
      await setDoc(docRef, { 
        isActive: nextStatus, 
        enabled: nextStatus, 
        updatedAt: now 
      }, { merge: true });

      // 2. Update local state & cache on success
      const updatedList = homepageSections.map(s => 
        s.id === section.id 
          ? { ...s, isActive: nextStatus, enabled: nextStatus, updatedAt: now } 
          : s
      );

      useAdminStore.setState({ homepageSections: updatedList });
      try {
        localStorage.setItem(HOMEPAGE_SECTIONS_STORAGE_KEY, JSON.stringify(updatedList));
      } catch (e) {
        console.warn('LocalStorage save error:', e);
      }

      showNotification('success', `Section status changed to ${nextStatus ? 'Active' : 'Disabled'} in Cloud Firestore.`);
    } catch (err: any) {
      console.error('Firestore toggle error:', err);
      showNotification('error', `Failed to update status in Firestore: ${err?.message || 'Error occurred'}`);
    }
  };

  // -------------------------------------------------------------
  // REORDERING (MOVE UP / MOVE DOWN)
  // -------------------------------------------------------------
  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === homepageSections.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const newSections = [...homepageSections];
    const temp = newSections[index];
    newSections[index] = newSections[targetIndex];
    newSections[targetIndex] = temp;

    const now = new Date().toISOString();
    const reorderedWithOrders = newSections.map((sec, idx) => ({
      ...sec,
      sortOrder: idx + 1,
      displayOrder: idx + 1,
      updatedAt: now
    }));

    // 1. Batch Update in Cloud Firestore FIRST
    try {
      const batch = writeBatch(db);
      reorderedWithOrders.forEach(item => {
        const docRef = doc(db, 'homepageSections', item.id);
        batch.set(docRef, { 
          sortOrder: item.sortOrder, 
          displayOrder: item.sortOrder, 
          updatedAt: item.updatedAt 
        }, { merge: true });
      });
      await batch.commit();

      // 2. Update local State & LocalStorage on success
      useAdminStore.setState({ homepageSections: reorderedWithOrders });
      try {
        localStorage.setItem(HOMEPAGE_SECTIONS_STORAGE_KEY, JSON.stringify(reorderedWithOrders));
      } catch (e) {
        console.warn('LocalStorage save error:', e);
      }
      showNotification('success', 'Homepage layout order updated & synced to Cloud Firestore!');
    } catch (bErr: any) {
      console.error('Batch order write failed:', bErr);
      showNotification('error', `Failed to save order to Cloud Firestore: ${bErr?.message || 'Error occurred'}`);
    }
  };

  // -------------------------------------------------------------
  // DELETE SECTION
  // -------------------------------------------------------------
  const handleDeleteSection = async (section: HomepageSection) => {
    if (!window.confirm(`Are you sure you want to delete section "${section.title}" from the storefront?`)) {
      return;
    }

    // 1. Delete from Cloud Firestore FIRST
    try {
      const docRef = doc(db, 'homepageSections', section.id);
      await deleteDoc(docRef);

      // 2. Update local state & cache on success
      const updatedList = homepageSections.filter((s) => s.id !== section.id);
      useAdminStore.setState({ homepageSections: updatedList });
      try {
        localStorage.setItem(HOMEPAGE_SECTIONS_STORAGE_KEY, JSON.stringify(updatedList));
      } catch (e) {
        console.warn('LocalStorage save error:', e);
      }
      showNotification('success', `Section "${section.title}" deleted from Cloud Firestore.`);
    } catch (err: any) {
      console.error('Firestore delete error:', err);
      showNotification('error', `Failed to delete from Firestore: ${err?.message || 'Permission or network error'}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification Alert Banner */}
      {feedbackMessage && (
        <div
          className={`p-3.5 rounded-xl border flex items-center space-x-2.5 text-xs font-semibold shadow-xs transition-all ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          {feedbackMessage.type === 'success' ? (
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle size={16} className="text-red-600 shrink-0" />
          )}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-serif font-bold text-neutral-900 flex items-center space-x-2">
              <LayoutTemplate size={22} className="text-[#4A1525]" />
              <span>Storefront Home Page Layout</span>
            </h2>
            {isSyncing && (
              <span className="flex items-center space-x-1 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-sans">
                <Loader2 size={12} className="animate-spin" />
                <span>Syncing Cloud...</span>
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Build, organize, reorder, and customize dynamic sections displayed on the public storefront. 
            All modifications synchronize in real-time and persist across browser reloads.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 border border-neutral-200 cursor-pointer disabled:opacity-50"
            title="Refresh layout from Cloud Firestore"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          {homepageSections.length === 0 && (
            <button
              onClick={handleSeedDefaultLayout}
              disabled={isSeeding}
              className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-[#4A1525] border border-amber-300 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
              title="Seed 7 curated royal storefront sections"
            >
              <Sparkles size={14} className={isSeeding ? 'animate-spin' : 'text-amber-600'} />
              <span>{isSeeding ? 'Seeding...' : 'Seed Royal Defaults'}</span>
            </button>
          )}

          <button
            onClick={handleOpenAddForm}
            className="px-4 py-2 bg-[#4A1525] text-amber-200 rounded-xl text-xs font-bold hover:bg-[#6B1228] transition flex items-center space-x-2 shadow-xs shrink-0 cursor-pointer"
          >
            <Plus size={16} />
            <span>Add Homepage Section</span>
          </button>
        </div>
      </div>

      {/* Add / Edit Section Form Modal / Panel */}
      {(isAddingSection || editingSection) && (
        <div className="bg-[#FAF7F2] rounded-2xl border-2 border-amber-300/80 p-6 shadow-md transition-all">
          <div className="flex items-center justify-between pb-4 border-b border-amber-200 mb-5">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#4A1525] text-amber-200 flex items-center justify-center">
                <Layers size={20} />
              </div>
              <div>
                <h3 className="font-serif font-bold text-base text-[#4A1525]">
                  {editingSection ? `Edit Section: ${editingSection.title}` : 'Add New Homepage Section'}
                </h3>
                <p className="text-[11px] text-stone-500">Configure content, aesthetics and layout parameters</p>
              </div>
            </div>
            <button
              onClick={() => {
                setIsAddingSection(false);
                setEditingSection(null);
              }}
              className="p-1.5 text-neutral-400 hover:text-neutral-800 rounded-lg hover:bg-amber-100 transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSaveSection} className="space-y-5">
            {uploadError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center space-x-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Basic Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Section Type Selector */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                  Section Type & Blueprint <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.sectionType}
                  onChange={(e) => handleTypeChange(e.target.value as HomepageSectionType)}
                  className="w-full px-3 py-2.5 text-xs bg-white border border-neutral-300 rounded-xl focus:ring-2 focus:ring-[#4A1525] focus:outline-hidden font-medium"
                >
                  {SECTION_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.type} value={opt.type}>
                      {opt.label} — {opt.description}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-neutral-500 mt-1">
                  {SECTION_TYPE_OPTIONS.find((o) => o.type === formData.sectionType)?.description}
                </p>
              </div>

              {/* Section Title */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                  Section Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Royal Bridal Choker Sets"
                  className="w-full px-3 py-2.5 text-xs bg-white border border-neutral-300 rounded-xl focus:ring-2 focus:ring-[#4A1525] focus:outline-hidden font-medium"
                  required
                />
              </div>

              {/* Subtitle */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                  Subtitle / Eyebrow Text (Optional)
                </label>
                <input
                  type="text"
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  placeholder="e.g. Handcrafted Kundan & 22k Gold Micron Polish"
                  className="w-full px-3 py-2.5 text-xs bg-white border border-neutral-300 rounded-xl focus:ring-2 focus:ring-[#4A1525] focus:outline-hidden"
                />
              </div>

              {/* Sort Order & Active Status Controls */}
              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                    Sort Order (Sequence)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2.5 text-xs bg-white border border-neutral-300 rounded-xl focus:ring-2 focus:ring-[#4A1525] focus:outline-hidden font-mono"
                  />
                </div>

                <div className="pt-5">
                  <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-4 h-4 text-[#4A1525] rounded-md border-neutral-300 focus:ring-[#4A1525]"
                    />
                    <span className="text-xs font-bold text-neutral-800">Show on Storefront</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Dynamic Configuration per Section Type */}
            <div className="border-t border-amber-200/80 pt-4">
              <h4 className="text-xs font-bold text-[#4A1525] uppercase tracking-wider mb-3 flex items-center space-x-1.5">
                <SlidersHorizontal size={14} />
                <span>Type-Specific Layout & Content Controls</span>
              </h4>

              {/* ----------------------------------------------- */}
              {/* 1. CATEGORIES SECTION SPECIFIC CONTROLS */}
              {/* ----------------------------------------------- */}
              {formData.sectionType === 'categories' && (
                <div className="space-y-3 bg-white p-4 rounded-xl border border-amber-200/60">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-neutral-700 mb-1">Layout Style</label>
                      <select
                        value={formData.settings.layoutStyle || 'grid'}
                        onChange={(e) => setFormData({
                          ...formData,
                          settings: { ...formData.settings, layoutStyle: e.target.value as any }
                        })}
                        className="w-full px-2.5 py-2 text-xs border border-neutral-300 rounded-lg bg-white"
                      >
                        <option value="grid">Grid Display</option>
                        <option value="slider">Horizontal Carousel</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-neutral-700 mb-1">Desktop Columns</label>
                      <select
                        value={formData.settings.columnsDesktop || 4}
                        onChange={(e) => setFormData({
                          ...formData,
                          settings: { ...formData.settings, columnsDesktop: parseInt(e.target.value) as any }
                        })}
                        className="w-full px-2.5 py-2 text-xs border border-neutral-300 rounded-lg bg-white font-mono"
                      >
                        <option value="2">2 Columns</option>
                        <option value="3">3 Columns</option>
                        <option value="4">4 Columns (Default)</option>
                        <option value="5">5 Columns</option>
                        <option value="6">6 Columns</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-neutral-700 mb-1">Mobile Columns</label>
                      <select
                        value={formData.settings.columnsMobile || 2}
                        onChange={(e) => setFormData({
                          ...formData,
                          settings: { ...formData.settings, columnsMobile: parseInt(e.target.value) as any }
                        })}
                        className="w-full px-2.5 py-2 text-xs border border-neutral-300 rounded-lg bg-white font-mono"
                      >
                        <option value="1">1 Column (Single Card)</option>
                        <option value="2">2 Columns (Default)</option>
                      </select>
                    </div>
                  </div>

                  {/* Category Multi-Selection */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-neutral-700">
                        Filter Categories to Display (Optional: Leave none selected to display all)
                      </label>
                      <span className="text-[11px] text-amber-800 font-semibold">
                        Selected: {formData.settings.categoryIds?.length || 0} / {categories.length}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 bg-neutral-50 rounded-xl border border-neutral-200">
                      {categories.map((cat) => {
                        const isSelected = formData.settings.categoryIds?.includes(cat.id) || formData.settings.categoryIds?.includes(cat.slug || '');
                        return (
                          <div
                            key={cat.id}
                            onClick={() => handleToggleCategorySelect(cat.id)}
                            className={`p-2 rounded-lg border text-xs cursor-pointer flex items-center space-x-2 transition ${
                              isSelected
                                ? 'bg-amber-100/70 border-amber-400 font-bold text-[#4A1525]'
                                : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-100'
                            }`}
                          >
                            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                              isSelected ? 'bg-[#4A1525] border-[#4A1525] text-white' : 'border-neutral-300'
                            }`}>
                              {isSelected && <Check size={10} />}
                            </div>
                            <span className="truncate">{cat.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ----------------------------------------------- */}
              {/* 2. PRODUCT-BASED SECTIONS CONTROLS */}
              {/* ----------------------------------------------- */}
              {['product_grid', 'featured_products', 'best_sellers', 'new_arrivals', 'flash_sale', 'custom_collection'].includes(formData.sectionType) && (
                <div className="space-y-4 bg-white p-4 rounded-xl border border-amber-200/60">
                  {/* Grid / Layout / Limits */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-neutral-700 mb-1">Product Limit</label>
                      <input
                        type="number"
                        min="1"
                        max="24"
                        value={formData.settings.productLimit || 8}
                        onChange={(e) => setFormData({
                          ...formData,
                          settings: { ...formData.settings, productLimit: parseInt(e.target.value) || 8 }
                        })}
                        className="w-full px-2.5 py-2 text-xs border border-neutral-300 rounded-lg bg-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-neutral-700 mb-1">Desktop Columns</label>
                      <select
                        value={formData.settings.columnsDesktop || 4}
                        onChange={(e) => setFormData({
                          ...formData,
                          settings: { ...formData.settings, columnsDesktop: parseInt(e.target.value) as any }
                        })}
                        className="w-full px-2.5 py-2 text-xs border border-neutral-300 rounded-lg bg-white font-mono"
                      >
                        <option value="2">2 Columns</option>
                        <option value="3">3 Columns</option>
                        <option value="4">4 Columns (Default)</option>
                        <option value="5">5 Columns</option>
                        <option value="6">6 Columns</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-neutral-700 mb-1">Mobile Columns</label>
                      <select
                        value={formData.settings.columnsMobile || 2}
                        onChange={(e) => setFormData({
                          ...formData,
                          settings: { ...formData.settings, columnsMobile: parseInt(e.target.value) as any }
                        })}
                        className="w-full px-2.5 py-2 text-xs border border-neutral-300 rounded-lg bg-white font-mono"
                      >
                        <option value="1">1 Column</option>
                        <option value="2">2 Columns</option>
                      </select>
                    </div>
                  </div>

                  {/* Card Feature Toggles */}
                  <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-neutral-700 pt-1">
                    <label className="flex items-center space-x-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.settings.showPrice !== false}
                        onChange={(e) => setFormData({
                          ...formData,
                          settings: { ...formData.settings, showPrice: e.target.checked }
                        })}
                        className="rounded-sm border-neutral-300 text-[#4A1525]"
                      />
                      <span>Show Price</span>
                    </label>

                    <label className="flex items-center space-x-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.settings.showRating !== false}
                        onChange={(e) => setFormData({
                          ...formData,
                          settings: { ...formData.settings, showRating: e.target.checked }
                        })}
                        className="rounded-sm border-neutral-300 text-[#4A1525]"
                      />
                      <span>Show Rating</span>
                    </label>

                    <label className="flex items-center space-x-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.settings.showDiscountBadge !== false}
                        onChange={(e) => setFormData({
                          ...formData,
                          settings: { ...formData.settings, showDiscountBadge: e.target.checked }
                        })}
                        className="rounded-sm border-neutral-300 text-[#4A1525]"
                      />
                      <span>Show Discount Badge</span>
                    </label>
                  </div>

                  {/* Flash Sale specific settings */}
                  {formData.sectionType === 'flash_sale' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-neutral-200">
                      <div>
                        <label className="block text-xs font-medium text-neutral-700 mb-1">Discount Tag Text</label>
                        <input
                          type="text"
                          value={formData.settings.flashSaleDiscountText || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            settings: { ...formData.settings, flashSaleDiscountText: e.target.value }
                          })}
                          placeholder="e.g. Flash Deal — Up to 30% OFF"
                          className="w-full px-2.5 py-2 text-xs border border-neutral-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-700 mb-1">Countdown End Date/Time</label>
                        <input
                          type="datetime-local"
                          value={formData.settings.timerEndTime || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            settings: { ...formData.settings, timerEndTime: e.target.value }
                          })}
                          className="w-full px-2.5 py-2 text-xs border border-neutral-300 rounded-lg"
                        />
                      </div>
                    </div>
                  )}

                  {/* Product Multi-Picker with Search */}
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <label className="text-xs font-bold text-neutral-700">
                        Pin Handpicked Products (Optional: Leave empty for automatic selection)
                      </label>
                      <span className="text-[11px] text-amber-800 font-semibold">
                        Selected: {formData.settings.productIds?.length || 0} / {products.length}
                      </span>
                    </div>

                    {/* Filter bar for products */}
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="relative flex-1">
                        <Search size={14} className="absolute left-2.5 top-2.5 text-neutral-400" />
                        <input
                          type="text"
                          value={productSearchQuery}
                          onChange={(e) => setProductSearchQuery(e.target.value)}
                          placeholder="Search product by title or ID..."
                          className="w-full pl-8 pr-3 py-1.5 text-xs border border-neutral-300 rounded-lg bg-white"
                        />
                      </div>
                      <select
                        value={selectedProductCategory}
                        onChange={(e) => setSelectedProductCategory(e.target.value)}
                        className="px-2 py-1.5 text-xs border border-neutral-300 rounded-lg bg-white"
                      >
                        <option value="all">All Categories</option>
                        {categories.map(c => (
                          <option key={c.id} value={c.slug || c.name}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-56 overflow-y-auto p-2 bg-neutral-50 rounded-xl border border-neutral-200">
                      {filteredProductOptions.map((prod) => {
                        const isSelected = formData.settings.productIds?.includes(prod.id);
                        return (
                          <div
                            key={prod.id}
                            onClick={() => handleToggleProductSelect(prod.id)}
                            className={`p-2 rounded-lg border text-xs cursor-pointer flex items-center space-x-2 transition ${
                              isSelected
                                ? 'bg-amber-100/80 border-amber-400 font-bold text-[#4A1525]'
                                : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                            }`}
                          >
                            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                              isSelected ? 'bg-[#4A1525] border-[#4A1525] text-white' : 'border-neutral-300'
                            }`}>
                              {isSelected && <Check size={10} />}
                            </div>
                            <img
                              src={prod.images?.[0] || prod.image || ''}
                              alt=""
                              className="w-8 h-8 rounded-md object-cover border border-neutral-200 shrink-0"
                            />
                            <div className="truncate flex-1 min-w-0">
                              <p className="truncate font-medium">{prod.name}</p>
                              <p className="text-[10px] text-neutral-400">৳{prod.price}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ----------------------------------------------- */}
              {/* 3. PROMOTIONAL BANNER CONTROLS */}
              {/* ----------------------------------------------- */}
              {formData.sectionType === 'promotional_banner' && (
                <div className="space-y-3 bg-white p-4 rounded-xl border border-amber-200/60">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Cloudinary Upload & Preview */}
                    <div>
                      <label className="block text-xs font-bold text-neutral-700 mb-1">
                        Promotional Banner Image <span className="text-red-500">*</span>
                      </label>
                      <div className="flex items-center space-x-2">
                        <label className="px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg text-xs font-semibold cursor-pointer border border-neutral-300 flex items-center space-x-1.5 transition">
                          {isUploadingImage ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                          <span>Upload via Cloudinary</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleCloudinaryUpload(e, 'promo')}
                            className="hidden"
                          />
                        </label>
                        <span className="text-[11px] text-neutral-400">or enter direct URL below</span>
                      </div>
                      <input
                        type="url"
                        value={formData.settings.promoImageUrl || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          settings: { ...formData.settings, promoImageUrl: e.target.value }
                        })}
                        placeholder="https://..."
                        className="w-full mt-2 px-2.5 py-2 text-xs border border-neutral-300 rounded-lg"
                      />
                    </div>

                    {/* Preview box */}
                    <div>
                      <label className="block text-xs font-medium text-neutral-700 mb-1">Image Preview</label>
                      <div className="w-full h-24 rounded-lg bg-neutral-100 border border-neutral-200 overflow-hidden flex items-center justify-center">
                        {formData.settings.promoImageUrl ? (
                          <img
                            src={formData.settings.promoImageUrl}
                            alt="Banner Preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[11px] text-neutral-400">No image specified yet</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-neutral-200">
                    <div>
                      <label className="block text-xs font-medium text-neutral-700 mb-1">Button Text</label>
                      <input
                        type="text"
                        value={formData.settings.promoButtonText || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          settings: { ...formData.settings, promoButtonText: e.target.value }
                        })}
                        placeholder="e.g. EXPLORE NOW"
                        className="w-full px-2.5 py-2 text-xs border border-neutral-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-neutral-700 mb-1">Target Link</label>
                      <input
                        type="text"
                        value={formData.settings.promoLink || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          settings: { ...formData.settings, promoLink: e.target.value }
                        })}
                        placeholder="e.g. /shop or https://..."
                        className="w-full px-2.5 py-2 text-xs border border-neutral-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-neutral-700 mb-1">Alt Description</label>
                      <input
                        type="text"
                        value={formData.settings.promoImageAlt || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          settings: { ...formData.settings, promoImageAlt: e.target.value }
                        })}
                        placeholder="e.g. Royal Bridal Campaign"
                        className="w-full px-2.5 py-2 text-xs border border-neutral-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ----------------------------------------------- */}
              {/* 4. BRAND STORY CONTROLS */}
              {/* ----------------------------------------------- */}
              {formData.sectionType === 'brand_story' && (
                <div className="space-y-3 bg-white p-4 rounded-xl border border-amber-200/60">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1">Brand Narrative Story Text</label>
                    <textarea
                      rows={3}
                      value={formData.settings.storyText || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        settings: { ...formData.settings, storyText: e.target.value }
                      })}
                      placeholder="Share the artisanal history of House of Mahi..."
                      className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-neutral-700 mb-1">Story Photograph</label>
                      <div className="flex items-center space-x-2">
                        <label className="px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg text-xs font-semibold cursor-pointer border border-neutral-300 flex items-center space-x-1.5 transition">
                          {isUploadingImage ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                          <span>Upload Photograph</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleCloudinaryUpload(e, 'story')}
                            className="hidden"
                          />
                        </label>
                      </div>
                      <input
                        type="url"
                        value={formData.settings.storyImageUrl || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          settings: { ...formData.settings, storyImageUrl: e.target.value }
                        })}
                        placeholder="https://..."
                        className="w-full mt-2 px-2.5 py-2 text-xs border border-neutral-300 rounded-lg"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-neutral-700 mb-1">Button Label</label>
                        <input
                          type="text"
                          value={formData.settings.storyButtonText || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            settings: { ...formData.settings, storyButtonText: e.target.value }
                          })}
                          placeholder="e.g. Learn Our Story"
                          className="w-full px-2.5 py-2 text-xs border border-neutral-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-700 mb-1">Button Link</label>
                        <input
                          type="text"
                          value={formData.settings.storyButtonLink || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            settings: { ...formData.settings, storyButtonLink: e.target.value }
                          })}
                          placeholder="e.g. /about"
                          className="w-full px-2.5 py-2 text-xs border border-neutral-300 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Form Action Buttons */}
            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-amber-200/80">
              <button
                type="button"
                onClick={() => {
                  setIsAddingSection(false);
                  setEditingSection(null);
                }}
                disabled={isSaving}
                className="px-4 py-2.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-200/60 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 bg-[#4A1525] text-amber-200 rounded-xl text-xs font-bold hover:bg-[#6B1228] transition flex items-center space-x-2 shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Saving to Cloud...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>{editingSection ? 'Update Section' : 'Save Section'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sections List */}
      {homepageSections.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-2xl p-12 text-center shadow-xs">
          <div className="w-16 h-16 bg-amber-50 border border-amber-200 rounded-full flex items-center justify-center mx-auto text-[#4A1525] mb-4">
            <Layers size={28} />
          </div>
          <h3 className="font-serif font-bold text-lg text-neutral-900">No Homepage Sections Active</h3>
          <p className="text-xs text-neutral-500 max-w-md mx-auto mt-1.5">
            Your storefront layout currently has no customized sections. You can add individual sections or instantly seed the 7 standard royal luxury sections.
          </p>
          <div className="flex items-center justify-center space-x-3 mt-5">
            <button
              onClick={handleSeedDefaultLayout}
              disabled={isSeeding}
              className="px-5 py-2.5 bg-amber-50 hover:bg-amber-100 text-[#4A1525] border border-amber-300 rounded-xl text-xs font-bold transition flex items-center space-x-2 shadow-xs cursor-pointer"
            >
              <Sparkles size={16} className="text-amber-600" />
              <span>{isSeeding ? 'Seeding...' : 'Seed Royal Defaults'}</span>
            </button>
            <button
              onClick={handleOpenAddForm}
              className="px-5 py-2.5 bg-[#4A1525] text-amber-200 rounded-xl text-xs font-bold hover:bg-[#6B1228] transition flex items-center space-x-2 shadow-xs cursor-pointer"
            >
              <Plus size={16} />
              <span>Add Your First Section</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {homepageSections.map((section, index) => {
            const secType = section.sectionType || section.type || 'categories';
            const optionInfo = SECTION_TYPE_OPTIONS.find((o) => o.type === secType);
            const Icon = optionInfo?.icon || Layers;
            const isSectionActive = section.isActive !== false && section.enabled !== false;

            return (
              <div
                key={section.id}
                className={`border rounded-2xl p-4 bg-white transition flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs ${
                  isSectionActive ? 'border-neutral-200' : 'border-dashed border-neutral-300 opacity-60 bg-neutral-50'
                }`}
              >
                {/* Order Controls & Details */}
                <div className="flex items-center space-x-4 w-full md:w-auto">
                  <div className="flex flex-col items-center space-y-1 bg-neutral-50 p-1.5 rounded-xl border border-neutral-200">
                    <button
                      onClick={() => handleMoveOrder(index, 'up')}
                      disabled={index === 0}
                      className="p-1 text-neutral-500 hover:text-neutral-900 disabled:opacity-20 cursor-pointer"
                      title="Move Up"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <span className="font-mono text-xs font-bold text-neutral-700">{index + 1}</span>
                    <button
                      onClick={() => handleMoveOrder(index, 'down')}
                      disabled={index === homepageSections.length - 1}
                      className="p-1 text-neutral-500 hover:text-neutral-900 disabled:opacity-20 cursor-pointer"
                      title="Move Down"
                    >
                      <ArrowDown size={14} />
                    </button>
                  </div>

                  <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-[#4A1525] shrink-0">
                    <Icon size={20} />
                  </div>

                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-serif font-bold text-sm text-neutral-900">{section.title}</h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-[#4A1525]">
                        {optionInfo?.label || secType}
                      </span>
                      {isSectionActive ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-200 text-neutral-600">
                          Disabled
                        </span>
                      )}
                    </div>
                    {section.subtitle && (
                      <p className="text-xs text-neutral-500 line-clamp-1 mt-0.5">{section.subtitle}</p>
                    )}
                    <div className="text-[11px] text-neutral-400 font-mono mt-1 flex items-center space-x-3">
                      <span>Layout: <strong>{section.settings?.layoutStyle || 'grid'}</strong></span>
                      <span>Desktop: <strong>{section.settings?.columnsDesktop || 4} cols</strong></span>
                      {section.settings?.productLimit && (
                        <span>Limit: <strong>{section.settings.productLimit} items</strong></span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 w-full md:w-auto justify-end border-t md:border-t-0 pt-2 md:pt-0">
                  <button
                    onClick={() => handleToggleActive(section)}
                    className={`p-2 rounded-xl text-xs font-bold border flex items-center space-x-1.5 transition cursor-pointer ${
                      isSectionActive 
                        ? 'bg-amber-50 text-[#4A1525] border-amber-200 hover:bg-amber-100' 
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                    }`}
                    title={isSectionActive ? 'Disable section on homepage' : 'Enable section on homepage'}
                  >
                    {isSectionActive ? <EyeOff size={14} /> : <Eye size={14} />}
                    <span className="hidden sm:inline">{isSectionActive ? 'Hide' : 'Show'}</span>
                  </button>

                  <button
                    onClick={() => handleOpenEditForm(section)}
                    className="p-2 text-neutral-700 hover:text-[#4A1525] hover:bg-amber-50 rounded-xl border border-neutral-200 transition flex items-center space-x-1 cursor-pointer"
                    title="Edit Section Configuration"
                  >
                    <Edit3 size={14} />
                    <span className="text-xs font-bold hidden sm:inline">Edit</span>
                  </button>

                  <button
                    onClick={() => handleDeleteSection(section)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-xl border border-neutral-200 hover:border-red-200 transition cursor-pointer"
                    title="Delete Section"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
