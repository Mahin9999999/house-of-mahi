import React from 'react';
import { Heart, ShoppingBag } from 'lucide-react';
import { Product } from '../types';

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
  return (
    <div className="bg-[#FAF7F2] rounded-xl border border-[#E8DFC2]/80 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group">
      <div>
        {/* Product Image & Wishlist Button */}
        <div className="relative aspect-square overflow-hidden bg-white">
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
              src={product.image} 
              alt={product.imageAlt || `${product.name} House of Mahi Bangladesh`} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
              referrerPolicy="no-referrer"
              loading="lazy"
            />
          </a>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onToggleWishlist(product.id);
            }}
            className="absolute top-2 right-2 w-7 h-7 sm:w-8 sm:h-8 bg-white/90 backdrop-blur-xs rounded-full flex items-center justify-center shadow-xs text-slate-600 hover:text-[#4A1525] transition-colors z-10"
            aria-label="Wishlist"
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
              className="hover:text-[#4A1525] block truncate"
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
          onClick={() => onAddToCart(product)}
          className="w-full border border-[#4A1525] text-[#4A1525] hover:bg-[#4A1525] hover:text-white text-[11px] font-bold py-1.5 rounded-lg flex items-center justify-center space-x-1 transition-colors"
        >
          <ShoppingBag size={12} />
          <span>ADD TO CART</span>
        </button>
        <button 
          onClick={() => onBuyNow(product)}
          className="w-full bg-[#4A1525] hover:bg-[#360F1B] text-white text-[11px] font-bold py-1.5 rounded-lg transition-colors shadow-xs"
        >
          BUY NOW
        </button>
      </div>
    </div>
  );
};
