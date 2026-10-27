import React, { useState, useMemo } from 'react';
import { Heart, ShoppingBag } from 'lucide-react';
import { Product } from '../types';
import { getOptimizedCloudinaryUrl } from '../firebase/cloudinaryService';

interface ProductCardProps {
  product: Product;
  isWishlisted: boolean;
  onToggleWishlist: (id: string) => void;
  onAddToCart: (p: Product) => void;
  onBuyNow: (p: Product) => void;
  onQuickView: (p: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  isWishlisted,
  onToggleWishlist,
  onAddToCart,
  onBuyNow,
  onQuickView
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  // Compute optimized responsive image URL to drastically reduce payload and boost PageSpeed
  const optimizedImageSrc = useMemo(() => {
    if (!product.image) return '';
    if (product.image.includes('cloudinary.com')) {
      return getOptimizedCloudinaryUrl(product.image, { 
        width: 450, 
        height: 450, 
        crop: 'fill', 
        quality: 'auto' 
      });
    }
    if (product.image.includes('images.unsplash.com')) {
      return product.image.replace(/w=\d+/, 'w=450');
    }
    return product.image;
  }, [product.image]);

  return (
    <div className="bg-[#FAF7F2] rounded-xl border border-[#E8DFC2]/80 overflow-hidden shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-300 ease-out flex flex-col justify-between group motion-reduce:hover:translate-y-0 motion-reduce:transition-none">
      <div>
        {/* Product Image & Wishlist Button */}
        <div className="relative aspect-square overflow-hidden bg-slate-100">
          <a 
            href={`/product/${encodeURIComponent(product.id)}`}
            onClick={(e) => {
              // Open modal for smooth SPA UX on primary click without modifiers
              if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
                e.preventDefault();
                onQuickView(product);
              }
            }}
            className="block w-full h-full"
            aria-label={`View ${product.name}`}
          >
            <img 
              src={optimizedImageSrc} 
              alt={product.imageAlt || `${product.name} House of Mahi Bangladesh`} 
              onLoad={() => setImageLoaded(true)}
              className={`w-full h-full object-cover group-hover:scale-105 transition-all duration-500 ease-out cursor-pointer motion-reduce:group-hover:scale-100 motion-reduce:transition-none ${
                imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
              }`}
              referrerPolicy="no-referrer"
              loading="lazy"
              decoding="async"
              width={400}
              height={400}
            />
          </a>
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleWishlist(product.id);
            }}
            className="absolute top-2 right-2 w-7 h-7 sm:w-8 sm:h-8 bg-white/90 backdrop-blur-xs rounded-full flex items-center justify-center shadow-xs text-slate-600 hover:text-[#4A1525] active:scale-90 transition-all duration-150 z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A1525]/30 motion-reduce:active:scale-100"
            aria-label={isWishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
          >
            <Heart size={15} className={isWishlisted ? 'fill-[#4A1525] text-[#4A1525]' : ''} />
          </button>
        </div>

        {/* Info */}
        <div className="p-3">
          <h3 className="font-medium text-xs text-slate-900 line-clamp-1 hover:text-[#4A1525] transition-colors">
            <a 
              href={`/product/${encodeURIComponent(product.id)}`}
              onClick={(e) => {
                if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
                  e.preventDefault();
                  onQuickView(product);
                }
              }}
              className="hover:text-[#4A1525] block truncate focus-visible:underline focus-visible:outline-none"
            >
              {product.name}
            </a>
          </h3>
          
          <div className="flex items-baseline space-x-1.5 mt-1.5">
            <span className="font-bold text-sm text-[#4A1525]">৳ {product.price}</span>
            {product.originalPrice && (
              <span className="text-[11px] text-slate-400 line-through">৳ {product.originalPrice}</span>
            )}
          </div>
        </div>
      </div>

      {/* Dual Buttons (Add to Cart & Buy Now) */}
      <div className="p-2 pt-0 space-y-1.5">
        <button 
          type="button"
          onClick={() => onAddToCart(product)}
          className="w-full border border-[#4A1525] text-[#4A1525] hover:bg-[#4A1525] hover:text-white active:scale-[0.98] text-[11px] font-bold py-1.5 rounded-lg flex items-center justify-center space-x-1 transition-all duration-150 motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A1525]/30 cursor-pointer"
        >
          <ShoppingBag size={12} />
          <span>ADD TO CART</span>
        </button>
        <button 
          type="button"
          onClick={() => onBuyNow(product)}
          className="w-full bg-[#4A1525] hover:bg-[#360F1B] active:scale-[0.98] text-white text-[11px] font-bold py-1.5 rounded-lg transition-all duration-150 shadow-xs motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A1525]/30 cursor-pointer"
        >
          BUY NOW
        </button>
      </div>
    </div>
  );
};
