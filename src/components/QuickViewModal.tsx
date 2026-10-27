import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  X, Heart, ShoppingBag, Star, MessageCircle, 
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Check, Sparkles 
} from 'lucide-react';
import { Product, Review, Order } from '../types';
import { ProductReviews } from './ProductReviews';
import { ProductCard } from './ProductCard';
import { useAdminStore } from '../store/useAdminStore';
import { lockBodyScroll, unlockBodyScroll } from './CartDrawer';

interface QuickViewModalProps {
  product: Product | null;
  onClose: () => void;
  isWishlisted?: boolean;
  isInWishlist?: boolean;
  onToggleWishlist: (id: string) => void;
  onAddToCart: (p: Product, finish?: string, size?: string) => void;
  onBuyNow: (p: Product, finish?: string, size?: string) => void;
  userOrders?: Order[];
  onAddReview?: (productId: string, review: Review) => void;
  onNavigateToAccountReviews?: () => void;
}

// Visual color palette map for jewelry and accessories finishes
const COLOR_PALETTE: Record<string, string> = {
  'red': '#DC2626',
  'wine red': '#6B1D2F',
  'maroon': '#800020',
  'green': '#15803D',
  'dark green': '#14532D',
  'sea green': '#2E8B57',
  'lime green': '#65A30D',
  'olive': '#708238',
  'blue': '#2563EB',
  'tea blue': '#4682B4',
  'black': '#0F172A',
  'white': '#F8FAFC',
  'pink': '#EC4899',
  'hot pink': '#FF1493',
  'magenta': '#C026D3',
  'lavender': '#B8A1D9',
  'levender': '#B8A1D9',
  'purple': '#9333EA',
  'dark purple': '#581C87',
  'gold': '#D97706',
  'amber gold': '#F59E0B',
  'silver': '#94A3B8',
  'yellow': '#EAB308',
  'orange': '#EA580C',
  'light orange': '#FB923C',
  'brown': '#78350F',
  'teal': '#0D9488',
  'rose gold': '#B76E79',
  'antique gold': '#C5A059',
  'multicolor': 'linear-gradient(135deg, #EF4444 0%, #F59E0B 25%, #10B981 50%, #3B82F6 75%, #8B5CF6 100%)',
  'pastel multicolor': 'linear-gradient(135deg, #FCA5A5 0%, #FCD34D 25%, #6EE7B7 50%, #93C5FD 75%, #C4B5FD 100%)'
};

export const QuickViewModal: React.FC<QuickViewModalProps> = ({
  product: initialProduct,
  onClose,
  isWishlisted = false,
  isInWishlist,
  onToggleWishlist,
  onAddToCart,
  onBuyNow,
  userOrders = [],
  onAddReview,
  onNavigateToAccountReviews
}) => {
  // Allow internal switching of product when clicking Related Products
  const [currentProduct, setCurrentProduct] = useState<Product | null>(initialProduct);
  const allProducts = useAdminStore((state) => state.products);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Modal open/close animation lifecycle
  const [isRendered, setIsRendered] = useState<boolean>(Boolean(initialProduct));
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isImageFading, setIsImageFading] = useState<boolean>(false);

  // Sync internal product state if initialProduct prop changes from outside
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (initialProduct) {
      setCurrentProduct(initialProduct);
      setIsRendered(true);
      const raf = requestAnimationFrame(() => {
        setIsVisible(true);
      });
      return () => cancelAnimationFrame(raf);
    } else if (isRendered) {
      setIsVisible(false);
      timer = setTimeout(() => {
        setIsRendered(false);
        setCurrentProduct(null);
      }, 220); // matches 220ms transition duration
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [initialProduct, isRendered]);

  // Handle ESC key to close modal smoothly
  useEffect(() => {
    if (!isRendered) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRendered, onClose]);

  // Body scroll lock while modal is open using shared lock manager
  useEffect(() => {
    if (!isRendered) return;
    lockBodyScroll();
    return () => {
      unlockBodyScroll();
    };
  }, [isRendered]);

  const product = currentProduct;

  // Variant States: Trim and case-insensitively deduplicate, preserving original display case
  const finishes = useMemo(() => {
    if (!Array.isArray(product?.finishes)) return [];
    const seen = new Set<string>();
    const unique: string[] = [];
    for (const f of product.finishes) {
      if (typeof f === 'string') {
        const trimmed = f.trim();
        const lower = trimmed.toLowerCase();
        if (trimmed.length > 0 && !seen.has(lower)) {
          seen.add(lower);
          unique.push(trimmed);
        }
      }
    }
    return unique;
  }, [product?.finishes]);

  const sizes = useMemo(() => {
    if (!Array.isArray(product?.sizes)) return [];
    const seen = new Set<string>();
    const unique: string[] = [];
    for (const s of product.sizes) {
      if (typeof s === 'string') {
        const trimmed = s.trim();
        const lower = trimmed.toLowerCase();
        if (trimmed.length > 0 && !seen.has(lower)) {
          seen.add(lower);
          unique.push(trimmed);
        }
      }
    }
    return unique;
  }, [product?.sizes]);

  const [selectedFinish, setSelectedFinish] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);

  // Initialize/Reset variants when product changes
  useEffect(() => {
    if (product) {
      setSelectedFinish(finishes[0] || '');
      setSelectedSize(sizes[0] || '');
      setQuantity(1);
    }
  }, [product?.id, finishes, sizes]);

  // Verified Rating calculation (Never fabricate 5.0 or assume ratings when reviewsCount is 0)
  const ratingData = useMemo(() => {
    const reviewsList = Array.isArray(product?.reviews) ? product!.reviews : [];
    if (reviewsList.length > 0) {
      const validRatings = reviewsList
        .map(r => Number(r.rating))
        .filter(r => !isNaN(r) && r > 0);
      if (validRatings.length > 0) {
        const sum = validRatings.reduce((acc, val) => acc + val, 0);
        const avg = sum / validRatings.length;
        return {
          hasReviews: true,
          count: reviewsList.length,
          rating: avg,
          displayRating: avg.toFixed(1)
        };
      }
    }
    // Fallback: If product has verified reviewsCount > 0 and positive rating in product document
    if (
      typeof product?.reviewsCount === 'number' && 
      product.reviewsCount > 0 && 
      typeof product?.rating === 'number' && 
      product.rating > 0
    ) {
      return {
        hasReviews: true,
        count: product.reviewsCount,
        rating: product.rating,
        displayRating: product.rating.toFixed(1)
      };
    }
    // 0 reviews or unverified: explicit empty state
    return {
      hasReviews: false,
      count: 0,
      rating: 0,
      displayRating: null
    };
  }, [product?.reviews, product?.reviewsCount, product?.rating]);

  // Color-aware Gallery state
  const gallery = useMemo(() => {
    if (!product) return [];

    // 1. Check if the currently selected color/finish has explicitly assigned photos
    if (selectedFinish && product.colorImages) {
      let matchedImages: string[] | undefined = undefined;
      // Direct exact key match
      if (Array.isArray(product.colorImages[selectedFinish])) {
        matchedImages = product.colorImages[selectedFinish];
      } else {
        // Case-insensitive & trimmed key match fallback
        const selectedNormalized = selectedFinish.toLowerCase().trim();
        const foundKey = Object.keys(product.colorImages).find(
          k => k.toLowerCase().trim() === selectedNormalized
        );
        if (foundKey && Array.isArray(product.colorImages[foundKey])) {
          matchedImages = product.colorImages[foundKey];
        }
      }

      if (matchedImages && matchedImages.length > 0) {
        const validColorImgs = matchedImages.filter(
          (img) => typeof img === 'string' && img.trim().length > 0
        );
        if (validColorImgs.length > 0) {
          return validColorImgs;
        }
      }
    }

    // 2. Safe Fallback: General product gallery with primary image
    if (product.galleryImages && product.galleryImages.length > 0) {
      const unique = [product.image, ...product.galleryImages.filter(img => img !== product.image)];
      return unique;
    }

    return [product.image];
  }, [product?.id, product?.image, product?.galleryImages, product?.colorImages, selectedFinish]);

  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);

  // Reset selected image index when product changes or when selected color changes
  useEffect(() => {
    setSelectedImageIndex(0);
  }, [product?.id, selectedFinish]);

  // Render-time safe image index to prevent out-of-bounds micro-frame flicker during color switching
  const safeImageIndex = gallery.length > 0 && selectedImageIndex < gallery.length ? selectedImageIndex : 0;

  const activeImage = gallery[safeImageIndex] || product?.image || '';

  // Accordion toggle states
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    description: true,
    specifications: false,
    features: false,
    shipping: false,
    reviews: false,
    faqs: false
  });

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Related / Recommended Products
  const relatedProducts = useMemo(() => {
    if (!product || !allProducts || allProducts.length === 0) return [];

    const activeList = allProducts.filter((p: any) => {
      if (p.id === product.id) return false;
      if (p.isActive === false || p.isPublished === false) return false;
      if (p.status === 'inactive' || p.status === 'draft') return false;
      return true;
    });

    // 1. Same category first
    const sameCat = activeList.filter(p => p.category === product.category);
    // 2. Other categories as backfill
    const otherCat = activeList.filter(p => p.category !== product.category);

    return [...sameCat, ...otherCat].slice(0, 8);
  }, [allProducts, product?.id, product?.category]);

  // Handle switching to a related product smoothly
  const handleSwitchProduct = (newProduct: Product) => {
    setCurrentProduct(newProduct);
    setSelectedImageIndex(0);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    // Sync browser URL to /product/:slug for deep-link consistency
    if (typeof window !== 'undefined') {
      const slug = (newProduct as any).seo?.slug || (newProduct as any).seoSlug || (newProduct as any).slug || newProduct.id;
      window.history.pushState(null, '', `/product/${encodeURIComponent(slug)}`);
    }
  };

  if (!product) return null;

  const effectiveIsWishlisted = isInWishlist !== undefined ? isInWishlist : isWishlisted;
  const hasFinishes = finishes.length > 0;
  const hasSizes = sizes.length > 0;
  const productReviews = product.reviews || [];

  // Filtered valid key features (exclude empty items; SEO tags are strictly not treated as features)
  const validKeyFeatures = useMemo(() => {
    if (!Array.isArray(product?.seo?.keyFeatures)) return [];
    return product!.seo!.keyFeatures.filter(
      (f): f is string => typeof f === 'string' && f.trim().length > 0
    );
  }, [product?.seo?.keyFeatures]);

  // Filtered valid FAQs (only include if both question and answer are non-empty)
  const validFaqs = useMemo(() => {
    if (!Array.isArray(product?.seo?.faqs)) return [];
    return product!.seo!.faqs.filter(
      (faq): faq is { question: string; answer: string } => 
        Boolean(faq && typeof faq.question === 'string' && faq.question.trim().length > 0 && typeof faq.answer === 'string' && faq.answer.trim().length > 0)
    );
  }, [product?.seo?.faqs]);

  // Check if product specifications have any valid field to display
  const hasSpecifications = Boolean(
    product.categoryLabel || 
    product.sku || 
    (hasFinishes && (selectedFinish || finishes[0])) || 
    (hasSizes && (selectedSize || sizes[0]))
  );

  // WhatsApp Order Link Generator
  const variantParts: string[] = [];
  if (hasFinishes && selectedFinish) variantParts.push(`Color: ${selectedFinish}`);
  if (hasSizes && selectedSize) variantParts.push(`Size: ${selectedSize}`);
  if (quantity > 1) variantParts.push(`Qty: ${quantity}`);
  const variantSummary = variantParts.length > 0 ? ` (${variantParts.join(', ')})` : '';

  const whatsappMsg = encodeURIComponent(
    `Hello! I would like to order "${product.name}"${variantSummary} for ৳${product.price * quantity} from Houseofmahi website.`
  );
  const whatsappUrl = `https://wa.me/8801400031902?text=${whatsappMsg}`;

  // Helper to resolve color preview style
  const getColorPreviewStyle = (finishName: string) => {
    const key = finishName.toLowerCase().trim();
    const hexOrGradient = COLOR_PALETTE[key];
    if (hexOrGradient) {
      if (hexOrGradient.startsWith('linear-gradient')) {
        return { background: hexOrGradient };
      }
      return { backgroundColor: hexOrGradient };
    }
    return { backgroundColor: '#C5A059' };
  };

  // Change image with subtle fade transition
  const handleSelectImageIndex = (idx: number) => {
    if (idx === safeImageIndex) return;
    setIsImageFading(true);
    setSelectedImageIndex(idx);
    setTimeout(() => {
      setIsImageFading(false);
    }, 150);
  };

  // Gallery Navigation Handlers
  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (gallery.length <= 1) return;
    const current = safeImageIndex;
    const targetIdx = current === 0 ? gallery.length - 1 : current - 1;
    handleSelectImageIndex(targetIdx);
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (gallery.length <= 1) return;
    const current = safeImageIndex;
    const targetIdx = current === gallery.length - 1 ? 0 : current + 1;
    handleSelectImageIndex(targetIdx);
  };

  // Quantity Stepper
  const handleDecreaseQuantity = () => {
    setQuantity(prev => (prev > 1 ? prev - 1 : 1));
  };

  const handleIncreaseQuantity = () => {
    setQuantity(prev => Math.min(prev + 1, product.stockQuantity || 99));
  };

  // Multi-item Add to Cart / Buy Now handler
  const handleAddToCartWithQuantity = () => {
    for (let i = 0; i < quantity; i++) {
      onAddToCart(
        product,
        hasFinishes ? (selectedFinish || finishes[0]) : undefined,
        hasSizes ? (selectedSize || sizes[0]) : undefined
      );
    }
    onClose();
  };

  const handleBuyNowWithQuantity = () => {
    for (let i = 0; i < quantity; i++) {
      onBuyNow(
        product,
        hasFinishes ? (selectedFinish || finishes[0]) : undefined,
        hasSizes ? (selectedSize || sizes[0]) : undefined
      );
    }
    onClose();
  };

  if (!isRendered || !product) return null;

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto transition-opacity duration-200 ease-out motion-reduce:transition-none ${
        isVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
      role="dialog"
      aria-modal="true"
      aria-label={`${product.name} Quick View`}
    >
      {/* Background Overlay with smooth fade */}
      <div 
        className="fixed inset-0 bg-black/65 backdrop-blur-xs transition-opacity duration-200 ease-out motion-reduce:transition-none"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog with smooth scale-up & fade */}
      <div 
        className={`bg-white w-full max-w-4xl lg:max-w-5xl rounded-2xl shadow-2xl border border-[#E8DFC2] overflow-hidden my-auto relative max-h-[96vh] sm:max-h-[92vh] flex flex-col z-10 transform transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none motion-reduce:transform-none ${
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        
        {/* Top Header Bar */}
        <div className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 py-3 border-b border-stone-100 bg-[#FAF7F2]/95 backdrop-blur-md">
          <div className="flex items-center space-x-2 truncate">
            <span className="text-[10px] sm:text-xs font-semibold tracking-wider text-amber-900 uppercase bg-amber-100/60 px-2.5 py-0.5 rounded-full border border-amber-200/60 shrink-0">
              {product.categoryLabel || 'Jewelry'}
            </span>
            <span className="text-xs text-stone-300 hidden sm:inline">•</span>
            <span className="text-xs font-serif font-semibold text-[#4A1525] truncate hidden sm:inline">
              {product.name}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button 
              onClick={() => onToggleWishlist(product.id)}
              className="w-8 h-8 rounded-full bg-white hover:bg-amber-50 text-stone-600 hover:text-[#4A1525] border border-stone-200/80 flex items-center justify-center active:scale-90 transition-all cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-amber-300/50"
              title="Add to Wishlist"
              aria-label="Toggle Wishlist"
            >
              <Heart size={16} className={effectiveIsWishlisted ? 'fill-[#4A1525] text-[#4A1525]' : ''} />
            </button>
            <button 
              onClick={onClose} 
              className="w-8 h-8 rounded-full bg-white hover:bg-stone-100 text-stone-700 border border-stone-200/80 shadow-xs flex items-center justify-center active:scale-90 transition-all cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-amber-300/50"
              aria-label="Close dialog"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div ref={scrollContainerRef} className="p-4 sm:p-6 lg:p-8 overflow-y-auto space-y-8">
          
          {/* Main 2-Column Product Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-10 items-start">
            
            {/* LEFT COLUMN: Modern Image Gallery */}
            <div className="space-y-3">
              {/* Primary Image Viewport */}
              <div className="relative aspect-square sm:aspect-[4/5] rounded-2xl overflow-hidden bg-[#FAF7F2] border border-[#E8DFC2]/80 group shadow-inner">
                <img 
                  src={activeImage} 
                  alt={product.imageAlt || `${product.name} House of Mahi Bangladesh`} 
                  className={`w-full h-full object-cover transition-all duration-200 group-hover:scale-105 motion-reduce:transition-none ${
                    isImageFading ? 'opacity-70 scale-[0.99]' : 'opacity-100 scale-100'
                  }`}
                  referrerPolicy="no-referrer"
                  loading="eager"
                />

                {/* Subtle Image Counter Badge */}
                {gallery.length > 1 && (
                  <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-white text-[10px] font-mono font-medium px-2.5 py-0.5 rounded-full shadow-md pointer-events-none">
                    {safeImageIndex + 1} / {gallery.length}
                  </div>
                )}

                {/* Prev / Next Arrows */}
                {gallery.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={handlePrevImage}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/90 hover:bg-white text-stone-800 flex items-center justify-center shadow-md transition-all active:scale-95 cursor-pointer"
                      aria-label="Previous image"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={handleNextImage}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/90 hover:bg-white text-stone-800 flex items-center justify-center shadow-md transition-all active:scale-95 cursor-pointer"
                      aria-label="Next image"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </>
                )}
              </div>

              {/* Gallery Thumbnails Strip */}
              {gallery.length > 1 && (
                <div className="flex items-center space-x-2 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin">
                  {gallery.map((imgUrl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectImageIndex(idx)}
                      className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                        safeImageIndex === idx 
                          ? 'border-[#4A1525] ring-2 ring-[#4A1525]/25 scale-102 opacity-100 shadow-xs' 
                          : 'border-stone-200 opacity-60 hover:opacity-100 hover:border-stone-300'
                      }`}
                      aria-label={`View image ${idx + 1}`}
                    >
                      <img 
                        src={imgUrl} 
                        alt={`Thumbnail ${idx + 1}`} 
                        className="w-full h-full object-cover" 
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: Product Information, Variants & Actions */}
            <div className="space-y-5 flex flex-col justify-between">
              
              <div className="space-y-4">
                
                {/* Status & Stock Badges */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                    {product.isNew && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white tracking-wide uppercase">
                        New Arrival
                      </span>
                    )}
                    {product.isFeatured && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#4A1525] text-amber-200 tracking-wide uppercase">
                        Featured
                      </span>
                    )}
                  </div>

                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full shrink-0 ${
                    product.inStock 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}>
                    {product.inStock ? '● In Stock' : '○ Out of Stock'}
                  </span>
                </div>

                {/* Product Title */}
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-serif font-bold text-stone-900 leading-tight">
                  {product.name}
                </h1>

                {/* Rating & Review Counter */}
                <div className="flex items-center space-x-2 text-xs flex-wrap gap-y-1">
                  {ratingData.hasReviews ? (
                    <>
                      <div className="flex text-amber-400" aria-label={`Rating: ${ratingData.displayRating} out of 5 stars`}>
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            size={14} 
                            className={i < Math.round(ratingData.rating) ? "fill-amber-400 text-amber-400" : "text-stone-300"} 
                          />
                        ))}
                      </div>
                      <span className="font-bold text-stone-800">{ratingData.displayRating}</span>
                      <span className="text-stone-300">•</span>
                      <button 
                        type="button"
                        onClick={() => {
                          setOpenSections(prev => ({ ...prev, reviews: true }));
                          const reviewsEl = document.getElementById('product-reviews-section');
                          if (reviewsEl) reviewsEl.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="text-stone-500 hover:text-[#4A1525] hover:underline cursor-pointer"
                      >
                        {ratingData.count} {ratingData.count === 1 ? 'review' : 'reviews'}
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center space-x-1.5">
                      <div className="flex text-stone-300">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={13} className="text-stone-300" />
                        ))}
                      </div>
                      <span className="text-stone-500 text-xs font-medium">No reviews yet</span>
                      <span className="text-stone-300">•</span>
                      <button 
                        type="button"
                        onClick={() => {
                          setOpenSections(prev => ({ ...prev, reviews: true }));
                          const reviewsEl = document.getElementById('product-reviews-section');
                          if (reviewsEl) reviewsEl.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="text-[#4A1525] hover:underline text-xs font-medium cursor-pointer"
                      >
                        Write first review
                      </button>
                    </div>
                  )}

                  {product.sku && (
                    <>
                      <span className="text-stone-300">•</span>
                      <span className="text-stone-400 font-mono text-[11px]">SKU: {product.sku}</span>
                    </>
                  )}
                </div>

                {/* Price Display */}
                <div className="p-3.5 bg-[#FAF7F2] rounded-xl border border-[#E8DFC2]/70 flex items-baseline space-x-3">
                  <span className="text-2xl sm:text-3xl font-bold text-[#4A1525]">
                    ৳ {product.price.toLocaleString()}
                  </span>
                  {product.originalPrice && product.originalPrice > product.price && (
                    <>
                      <span className="text-sm text-stone-400 line-through">
                        ৳ {product.originalPrice.toLocaleString()}
                      </span>
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md border border-emerald-300/60">
                        SAVE ৳ {(product.originalPrice - product.price).toLocaleString()}
                      </span>
                    </>
                  )}
                </div>

                {/* COLOR / FINISH SELECTOR (Clean Swatches / Chips for 20-25+ Colors) */}
                {hasFinishes && (
                  <div className="space-y-2 pt-1 border-t border-stone-100">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-stone-700 uppercase tracking-wider text-[11px]">
                        Color / Polish:
                      </span>
                      <span className="font-bold text-[#4A1525] bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                        {selectedFinish || finishes[0]}
                      </span>
                    </div>

                    {/* Responsive Compact Swatch Grid */}
                    <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1 pr-2 scrollbar-thin">
                      {finishes.map((finish) => {
                        const isSelected = selectedFinish === finish;
                        const swatchStyle = getColorPreviewStyle(finish);

                        return (
                          <button
                            key={finish}
                            type="button"
                            onClick={() => setSelectedFinish(finish)}
                            title={finish}
                            className={`group relative flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-amber-50/90 border-[#4A1525] text-[#4A1525] ring-1 ring-[#4A1525] shadow-xs'
                                : 'bg-white border-stone-200 text-stone-700 hover:border-stone-300 hover:bg-stone-50'
                            }`}
                          >
                            {/* Color Dot Swatch */}
                            <span 
                              className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/15 shadow-xs flex items-center justify-center"
                              style={swatchStyle}
                            >
                              {isSelected && (
                                <Check size={9} className="text-white drop-shadow-xs stroke-[3]" />
                              )}
                            </span>
                            <span className="truncate max-w-[120px] text-[11px] font-semibold">{finish}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* SIZE / FITTING SELECTOR */}
                {hasSizes && (
                  <div className="space-y-2 pt-1 border-t border-stone-100">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-stone-700 uppercase tracking-wider text-[11px]">
                        Size / Fitting:
                      </span>
                      <span className="font-bold text-[#4A1525] bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                        {selectedSize || sizes[0]}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {sizes.map((sz) => {
                        const isSelected = selectedSize === sz;
                        return (
                          <button
                            key={sz}
                            type="button"
                            onClick={() => setSelectedSize(sz)}
                            className={`min-w-[42px] px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[#4A1525] text-white border-[#4A1525] shadow-xs scale-102'
                                : 'bg-stone-50 text-stone-700 border-stone-200 hover:border-stone-300 hover:bg-stone-100'
                            }`}
                          >
                            {sz}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* QUANTITY SELECTOR */}
                <div className="flex items-center space-x-4 pt-1 border-t border-stone-100">
                  <span className="text-[11px] font-bold text-stone-700 uppercase tracking-wider">
                    Quantity:
                  </span>
                  <div className="flex items-center border border-stone-300 rounded-lg bg-white overflow-hidden shadow-xs">
                    <button
                      type="button"
                      onClick={handleDecreaseQuantity}
                      className="w-8 h-8 flex items-center justify-center hover:bg-stone-100 text-stone-700 font-bold transition-colors cursor-pointer"
                      aria-label="Decrease quantity"
                    >
                      -
                    </button>
                    <span className="w-10 text-center font-bold text-xs text-stone-800">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={handleIncreaseQuantity}
                      className="w-8 h-8 flex items-center justify-center hover:bg-stone-100 text-stone-700 font-bold transition-colors cursor-pointer"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                </div>

              </div>

              {/* ACTION BUTTONS (ADD TO CART, BUY NOW, WHATSAPP) */}
              <div className="space-y-2.5 pt-4 border-t border-stone-200 mt-2">
                <div className="grid grid-cols-2 gap-2.5">
                  <button 
                    onClick={handleAddToCartWithQuantity}
                    className="border-2 border-[#4A1525] text-[#4A1525] hover:bg-[#4A1525] hover:text-white font-bold text-xs py-3 rounded-xl transition-all flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer active:scale-98"
                  >
                    <ShoppingBag size={16} />
                    <span>ADD TO CART</span>
                  </button>

                  <button 
                    onClick={handleBuyNowWithQuantity}
                    className="bg-[#4A1525] hover:bg-[#360F1B] text-white font-bold text-xs py-3 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-98 cursor-pointer flex items-center justify-center space-x-1.5"
                  >
                    <span>BUY NOW</span>
                  </button>
                </div>

                {/* Instant WhatsApp Order */}
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl shadow-xs transition-colors flex items-center justify-center space-x-2"
                >
                  <MessageCircle size={16} />
                  <span>ORDER VIA WHATSAPP (INSTANT)</span>
                </a>
              </div>

            </div>

          </div>

          {/* ACCORDION INFORMATION SECTIONS (Description, Details, Features, Reviews) */}
          <div className="border-t border-stone-200 pt-6 space-y-3">
            
            {/* 1. Description Accordion (Only rendered if description is non-empty) */}
            {Boolean(product.description && product.description.trim().length > 0) && (
              <div className="border border-stone-200 rounded-xl overflow-hidden bg-white shadow-xs">
                <button
                  type="button"
                  onClick={() => toggleSection('description')}
                  className="w-full flex items-center justify-between px-4 py-3 bg-[#FAF7F2] text-left font-serif font-bold text-sm text-[#4A1525] transition-colors cursor-pointer"
                >
                  <span>Product Description</span>
                  {openSections.description ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {openSections.description && (
                  <div className="p-4 text-xs sm:text-sm text-stone-700 leading-relaxed space-y-2 border-t border-stone-100">
                    <p className="whitespace-pre-line">{product.description}</p>
                    {product.shortDescription && product.shortDescription.trim() !== product.description.trim() && (
                      <p className="text-stone-500 italic pt-1">{product.shortDescription}</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 2. Specifications & Details Accordion (Only rendered if authentic specifications exist) */}
            {hasSpecifications && (
              <div className="border border-stone-200 rounded-xl overflow-hidden bg-white shadow-xs">
                <button
                  type="button"
                  onClick={() => toggleSection('specifications')}
                  className="w-full flex items-center justify-between px-4 py-3 bg-[#FAF7F2] text-left font-serif font-bold text-sm text-[#4A1525] transition-colors cursor-pointer"
                >
                  <span>Product Specifications & Details</span>
                  {openSections.specifications ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {openSections.specifications && (
                  <div className="p-4 border-t border-stone-100">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-stone-700">
                      {product.categoryLabel && (
                        <div className="flex justify-between py-1 border-b border-stone-100">
                          <span className="text-stone-500">Category:</span>
                          <span className="font-semibold">{product.categoryLabel}</span>
                        </div>
                      )}
                      {product.sku && (
                        <div className="flex justify-between py-1 border-b border-stone-100">
                          <span className="text-stone-500">SKU:</span>
                          <span className="font-mono font-semibold">{product.sku}</span>
                        </div>
                      )}
                      {hasFinishes && (
                        <div className="flex justify-between py-1 border-b border-stone-100">
                          <span className="text-stone-500">Selected Color:</span>
                          <span className="font-semibold text-[#4A1525]">{selectedFinish || finishes[0]}</span>
                        </div>
                      )}
                      {hasSizes && (
                        <div className="flex justify-between py-1 border-b border-stone-100">
                          <span className="text-stone-500">Selected Size:</span>
                          <span className="font-semibold text-[#4A1525]">{selectedSize || sizes[0]}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. Features Accordion (Only rendered if actual key features exist; SEO tags are strictly not treated as features) */}
            {validKeyFeatures.length > 0 && (
              <div className="border border-stone-200 rounded-xl overflow-hidden bg-white shadow-xs">
                <button
                  type="button"
                  onClick={() => toggleSection('features')}
                  className="w-full flex items-center justify-between px-4 py-3 bg-[#FAF7F2] text-left font-serif font-bold text-sm text-[#4A1525] transition-colors cursor-pointer"
                >
                  <span>Features & Craftsmanship</span>
                  {openSections.features ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {openSections.features && (
                  <div className="p-4 border-t border-stone-100 space-y-3">
                    <ul className="space-y-1.5 text-xs text-stone-700">
                      {validKeyFeatures.map((feat, idx) => (
                        <li key={idx} className="flex items-center space-x-2">
                          <Sparkles size={13} className="text-[#C5A059] shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* 4. Frequently Asked Questions (Only rendered if authentic FAQs exist on product) */}
            {validFaqs.length > 0 && (
              <div className="border border-stone-200 rounded-xl overflow-hidden bg-white shadow-xs">
                <button
                  type="button"
                  onClick={() => toggleSection('faqs')}
                  className="w-full flex items-center justify-between px-4 py-3 bg-[#FAF7F2] text-left font-serif font-bold text-sm text-[#4A1525] transition-colors cursor-pointer"
                >
                  <span>Frequently Asked Questions</span>
                  {openSections.faqs ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {openSections.faqs && (
                  <div className="p-4 border-t border-stone-100 space-y-3 text-xs text-stone-700">
                    {validFaqs.map((faq, idx) => (
                      <div key={idx} className="space-y-1 pb-2 border-b border-stone-100 last:border-0 last:pb-0">
                        <p className="font-bold text-stone-900">Q: {faq.question}</p>
                        <p className="text-stone-600 pl-3">A: {faq.answer}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 5. Verified Customer Reviews Accordion */}
            <div id="product-reviews-section" className="border border-stone-200 rounded-xl overflow-hidden bg-white shadow-xs">
              <button
                type="button"
                onClick={() => toggleSection('reviews')}
                className="w-full flex items-center justify-between px-4 py-3 bg-[#FAF7F2] text-left font-serif font-bold text-sm text-[#4A1525] transition-colors cursor-pointer"
              >
                <span>Verified Customer Reviews {ratingData.hasReviews ? `(${ratingData.count})` : ''}</span>
                {openSections.reviews ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {openSections.reviews && (
                <div className="p-4 border-t border-stone-100">
                  <ProductReviews
                    productId={product.id}
                    initialReviews={product.reviews}
                    onNavigateToAccountReviews={() => {
                      onClose();
                      if (onNavigateToAccountReviews) {
                        onNavigateToAccountReviews();
                      }
                    }}
                  />
                </div>
              )}
            </div>

          </div>

          {/* 6. YOU MAY ALSO LIKE (Related Products Section) */}
          {relatedProducts.length > 0 && (
            <div className="border-t border-stone-200 pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif font-bold text-lg text-stone-900 flex items-center space-x-2">
                    <span>You May Also Like</span>
                    <span className="w-8 h-0.5 bg-[#C5A059] rounded-full inline-block"></span>
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Similar handcrafted pieces from {product.categoryLabel}
                  </p>
                </div>
              </div>

              {/* Mobile Swipeable Carousel & Desktop Grid */}
              <div className="flex sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 overflow-x-auto pb-2 scrollbar-thin snap-x">
                {relatedProducts.map((relProd) => (
                  <div key={relProd.id} className="w-[160px] sm:w-auto shrink-0 snap-start">
                    <ProductCard
                      product={relProd}
                      isWishlisted={false}
                      onToggleWishlist={onToggleWishlist}
                      onAddToCart={(p) => onAddToCart(p)}
                      onBuyNow={(p) => onBuyNow(p)}
                      onQuickView={handleSwitchProduct}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
