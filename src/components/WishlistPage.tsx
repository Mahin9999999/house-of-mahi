import React from 'react';
import { Heart, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { Product } from '../types';

interface WishlistPageProps {
  wishlistIds: string[];
  allProducts: Product[];
  onRemoveFromWishlist: (id: string) => void;
  onAddToCart: (p: Product) => void;
  onBuyNow: (p: Product) => void;
  onQuickView: (p: Product) => void;
  onGoToShop: () => void;
}

export const WishlistPage: React.FC<WishlistPageProps> = ({
  wishlistIds,
  allProducts,
  onRemoveFromWishlist,
  onAddToCart,
  onBuyNow,
  onQuickView,
  onGoToShop
}) => {
  const wishlistedProducts = allProducts.filter((p) => wishlistIds.includes(p.id));

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#EFE8DE] mb-6">
        <div>
          <h2 className="text-2xl font-serif font-bold text-[#4A1525]">My Wishlist</h2>
          <p className="text-xs text-slate-500 mt-0.5">({wishlistedProducts.length} items saved)</p>
        </div>

        {wishlistedProducts.length > 0 && (
          <button 
            onClick={() => {
              wishlistedProducts.forEach(p => onAddToCart(p));
            }}
            className="hidden sm:flex items-center space-x-1.5 bg-[#4A1525] text-white text-xs font-bold px-4 py-2 rounded-full hover:bg-[#360F1B] transition-colors"
          >
            <ShoppingBag size={14} />
            <span>Add All To Cart</span>
          </button>
        )}
      </div>

      {wishlistedProducts.length > 0 ? (
        <div className="space-y-3">
          {wishlistedProducts.map((product) => (
            <div 
              key={product.id}
              className="bg-white rounded-xl border border-[#E8DFC2]/80 p-3.5 sm:p-4 flex items-center justify-between gap-4 shadow-xs hover:border-[#4A1525]/30 transition-colors"
            >
              <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                <img 
                  src={product.image} 
                  alt={product.name} 
                  className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg border border-slate-100 cursor-pointer shrink-0"
                  onClick={() => onQuickView(product)}
                />
                
                <div className="min-w-0 flex-1">
                  <h3 
                    onClick={() => onQuickView(product)}
                    className="font-bold text-xs sm:text-sm text-slate-900 line-clamp-1 cursor-pointer hover:text-[#4A1525]"
                  >
                    {product.name}
                  </h3>
                  
                  <div className="flex items-baseline space-x-2 mt-1">
                    <span className="font-bold text-xs sm:text-sm text-[#4A1525]">
                      ৳ {product.price}
                    </span>
                    {product.originalPrice && (
                      <span className="text-[11px] text-slate-400 line-through">
                        ৳ {product.originalPrice}
                      </span>
                    )}
                  </div>

                  <span className="inline-block text-[10px] text-emerald-600 font-semibold mt-1">
                    ● In Stock
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2 shrink-0">
                <button 
                  onClick={() => onAddToCart(product)}
                  className="bg-[#4A1525] hover:bg-[#360F1B] text-white text-xs font-bold px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg transition-colors flex items-center space-x-1"
                >
                  <ShoppingBag size={13} className="hidden sm:inline" />
                  <span>Add to Cart</span>
                </button>

                <button 
                  onClick={() => onRemoveFromWishlist(product.id)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  aria-label="Remove from wishlist"
                  title="Remove"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-2xl border border-[#EFE8DE] p-8">
          <div className="w-16 h-16 bg-[#FAF7F2] text-[#4A1525] rounded-full flex items-center justify-center mx-auto mb-4">
            <Heart size={32} />
          </div>
          <h3 className="font-serif font-bold text-lg text-slate-900">Your Wishlist is Empty</h3>
          <p className="text-xs text-slate-500 mt-1 mb-6">
            Explore our handcrafted jewelry collection and save your favorite items here!
          </p>
          <button 
            onClick={onGoToShop}
            className="bg-[#4A1525] text-white text-xs font-bold px-6 py-3 rounded-full flex items-center space-x-2 mx-auto hover:bg-[#360F1B] transition-colors"
          >
            <span>Explore Collection</span>
            <ArrowRight size={14} />
          </button>
        </div>
      )}

    </main>
  );
};
