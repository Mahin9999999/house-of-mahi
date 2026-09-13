import React, { useState } from 'react';
import { X, Heart, ShoppingBag, Star, Shield, Truck, MessageCircle } from 'lucide-react';
import { Product, Review, Order } from '../types';
import { ProductReviews } from './ProductReviews';

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

export const QuickViewModal: React.FC<QuickViewModalProps> = ({
  product,
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
  if (!product) return null;

  const effectiveIsWishlisted = isInWishlist !== undefined ? isInWishlist : isWishlisted;

  // Dynamic Finish / Color & Size state
  const hasFinishes = Array.isArray(product.finishes) && product.finishes.length > 0;
  const hasSizes = Array.isArray(product.sizes) && product.sizes.length > 0;

  const finishes = hasFinishes ? product.finishes! : [];
  const sizes = hasSizes ? product.sizes! : [];

  const [selectedFinish, setSelectedFinish] = useState<string>(finishes[0] || '');
  const [selectedSize, setSelectedSize] = useState<string>(sizes[0] || '');

  // Gallery state
  const gallery = product.galleryImages && product.galleryImages.length > 0 
    ? product.galleryImages 
    : [product.image];
  const [selectedImage, setSelectedImage] = useState<string>(product.image || gallery[0]);

  // Tab state: 'details' | 'reviews'
  const [activeTab, setActiveTab] = useState<'details' | 'reviews'>('details');

  const productReviews = product.reviews || [];

  // WhatsApp Order Link Generator with dynamic variant text
  const variantParts: string[] = [];
  if (hasFinishes && selectedFinish) variantParts.push(`Color/Polish: ${selectedFinish}`);
  if (hasSizes && selectedSize) variantParts.push(`Size: ${selectedSize}`);
  const variantSummary = variantParts.length > 0 ? ` (${variantParts.join(', ')})` : '';

  const whatsappMsg = encodeURIComponent(
    `Hello! I would like to order "${product.name}"${variantSummary} for ৳${product.price} from your website.`
  );
  const whatsappUrl = `https://wa.me/8801400031902?text=${whatsappMsg}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-[#E8DFC2] overflow-hidden my-auto animate-scale-up relative max-h-[92vh] flex flex-col">
        
        {/* Header & Close Button */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-[#FAF7F2]">
          <span className="text-xs font-serif font-bold text-[#4A1525] flex items-center space-x-1.5">
            <span>✨ Product Details & Specifications</span>
          </span>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 text-slate-700 flex items-center justify-center shadow-xs transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          
          <div className="grid md:grid-cols-2 gap-6">
            
            {/* Gallery Section */}
            <div className="space-y-3">
              <div className="relative aspect-square rounded-xl overflow-hidden bg-[#FAF7F2] border border-[#E8DFC2] group shadow-inner">
                <img 
                  src={selectedImage} 
                  alt={product.imageAlt || `${product.name} Houseofmahi Bangladesh`} 
                  className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                
                {/* Wishlist Floating Button */}
                <button 
                  onClick={() => onToggleWishlist(product.id)}
                  className="absolute top-3 right-3 p-2.5 rounded-full bg-white/90 backdrop-blur-xs shadow-md text-slate-600 hover:text-[#4A1525] transition-transform active:scale-95"
                  title="Add to Wishlist"
                  aria-label="Toggle Wishlist"
                >
                  <Heart size={18} className={effectiveIsWishlisted ? 'fill-[#4A1525] text-[#4A1525]' : ''} />
                </button>
              </div>

              {/* Gallery Thumbnails */}
              {gallery.length > 1 && (
                <div className="flex items-center space-x-2 overflow-x-auto pb-1">
                  {gallery.map((imgUrl, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImage(imgUrl)}
                      className={`w-16 h-16 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${
                        selectedImage === imgUrl ? 'border-[#4A1525] ring-2 ring-[#4A1525]/20 scale-105' : 'border-slate-200 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={imgUrl} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Main Info Section */}
            <div className="space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#C5A059] uppercase tracking-widest bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                    {product.categoryLabel}
                  </span>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    product.inStock ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}>
                    {product.inStock ? 'In Stock' : 'Out of Stock'}
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-serif font-bold text-slate-900 mt-2 leading-tight">
                  {product.name}
                </h2>

                <div className="flex items-center space-x-2 mt-2 text-xs">
                  <div className="flex text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={14} className={i < Math.floor(product.rating) ? "fill-amber-400 text-amber-400" : "text-slate-300"} />
                    ))}
                  </div>
                  <span className="font-bold text-slate-700">{product.rating}</span>
                  <button 
                    onClick={() => setActiveTab('reviews')}
                    className="text-slate-400 hover:text-[#4A1525] hover:underline"
                  >
                    ({productReviews.length || product.reviewsCount} verified reviews)
                  </button>
                </div>

                <div className="flex items-baseline space-x-3 mt-3">
                  <span className="text-2xl sm:text-3xl font-bold text-[#4A1525]">৳ {product.price}</span>
                  {product.originalPrice && (
                    <span className="text-sm text-slate-400 line-through">৳ {product.originalPrice}</span>
                  )}
                  {product.originalPrice && (
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      SAVE ৳ {product.originalPrice - product.price}
                    </span>
                  )}
                </div>

                {/* Color / Polish Selection (Only rendered if enabled on the product) */}
                {hasFinishes && finishes.length > 0 && (
                  <div className="mt-4 space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                      Color / Polish: <span className="text-[#4A1525] font-extrabold">{selectedFinish || finishes[0]}</span>
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {finishes.map((finish) => (
                        <button
                          key={finish}
                          type="button"
                          onClick={() => setSelectedFinish(finish)}
                          className={`text-xs px-3 py-1.5 rounded-lg border font-semibold transition-all cursor-pointer ${
                            selectedFinish === finish
                              ? 'bg-[#4A1525] text-white border-[#4A1525] shadow-xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {finish}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Size / Fitting Option (Only rendered if enabled on the product) */}
                {hasSizes && sizes.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                      Size / Fitting: <span className="text-[#4A1525] font-extrabold">{selectedSize || sizes[0]}</span>
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {sizes.map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => setSelectedSize(sz)}
                          className={`text-xs px-3 py-1 rounded-lg border font-semibold transition-all cursor-pointer ${
                            selectedSize === sz
                              ? 'bg-[#C5A059] text-white border-[#C5A059] shadow-xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-xs text-slate-600 leading-relaxed mt-3">
                  {product.description}
                </p>

                <div className="space-y-2 pt-3 text-[11px] text-slate-600 border-t border-slate-100 mt-4">
                  <div className="flex items-center space-x-2">
                    <Truck size={14} className="text-[#4A1525] shrink-0" />
                    <span>Free shipping on orders over ৳ 2,000 in Bangladesh</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Shield size={14} className="text-[#4A1525] shrink-0" />
                    <span>100% Cash on Delivery available inside & outside Dhaka</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: BUY NOW, ADD TO CART, WHATSAPP ORDER */}
              <div className="space-y-2.5 pt-4">
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => { 
                      onAddToCart(
                        product, 
                        hasFinishes ? (selectedFinish || finishes[0]) : undefined, 
                        hasSizes ? (selectedSize || sizes[0]) : undefined
                      ); 
                      onClose(); 
                    }}
                    className="border-2 border-[#4A1525] text-[#4A1525] hover:bg-[#4A1525] hover:text-white font-bold text-xs py-3 rounded-xl transition-all flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer"
                  >
                    <ShoppingBag size={15} />
                    <span>ADD TO CART</span>
                  </button>

                  <button 
                    onClick={() => { 
                      onBuyNow(
                        product, 
                        hasFinishes ? (selectedFinish || finishes[0]) : undefined, 
                        hasSizes ? (selectedSize || sizes[0]) : undefined
                      ); 
                      onClose(); 
                    }}
                    className="bg-[#4A1525] hover:bg-[#360F1B] text-white font-bold text-xs py-3 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-98 cursor-pointer"
                  >
                    BUY NOW
                  </button>
                </div>

                {/* Direct WhatsApp Order Button */}
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

          {/* Nav Tabs for Specifications & Verified Reviews */}
          <div className="border-t border-slate-200 pt-5">
            <div className="flex items-center space-x-4 border-b border-slate-200 pb-2">
              <button
                onClick={() => setActiveTab('details')}
                className={`text-xs font-bold pb-2 border-b-2 transition-colors ${
                  activeTab === 'details' 
                    ? 'border-[#4A1525] text-[#4A1525]' 
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                PRODUCT SPECIFICATIONS
              </button>
              <button
                onClick={() => setActiveTab('reviews')}
                className={`text-xs font-bold pb-2 border-b-2 transition-colors flex items-center space-x-1.5 ${
                  activeTab === 'reviews' 
                    ? 'border-[#4A1525] text-[#4A1525]' 
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>VERIFIED REVIEWS</span>
              </button>
            </div>

            {/* Specifications Tab */}
            {activeTab === 'details' && (
              <div className="pt-4 text-xs text-slate-600 space-y-2 leading-relaxed">
                <div className="grid grid-cols-2 gap-2 bg-[#FAF7F2] p-3 rounded-xl border border-[#E8DFC2]/50">
                  <div><span className="font-bold text-slate-800">Material:</span> Premium Plating / Pearl / CZ</div>
                  <div><span className="font-bold text-slate-800">Category:</span> {product.categoryLabel}</div>
                  {hasFinishes && (
                    <div><span className="font-bold text-slate-800">Color/Polish:</span> {selectedFinish || finishes[0]}</div>
                  )}
                  {hasSizes && (
                    <div><span className="font-bold text-slate-800">Fitting Size:</span> {selectedSize || sizes[0]}</div>
                  )}
                  <div><span className="font-bold text-slate-800">Packaging:</span> Velvet Gift Pouch & Hard Box</div>
                  <div><span className="font-bold text-slate-800">Delivery:</span> 24 hrs Dhaka / 48 hrs All BD</div>
                </div>
              </div>
            )}

            {/* Real-time Customer Reviews Tab */}
            {activeTab === 'reviews' && (
              <div className="pt-4">
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

      </div>
    </div>
  );
};
