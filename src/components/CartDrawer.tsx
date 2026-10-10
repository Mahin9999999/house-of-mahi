import React, { useEffect, useState } from 'react';
import { X, Plus, Minus, Trash2, ArrowRight, ShoppingBag } from 'lucide-react';
import { CartItem } from '../types';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
  onViewCartPage: () => void;
  onProceedToCheckout: () => void;
}

// Module-scoped scroll-lock manager shared across overlay components
let activeScrollLocks = 0;
let savedBodyOverflow = '';

export const lockBodyScroll = (): void => {
  if (typeof document === 'undefined') return;
  if (activeScrollLocks === 0) {
    savedBodyOverflow = document.body.style.overflow || '';
    document.body.style.overflow = 'hidden';
  }
  activeScrollLocks++;
};

export const unlockBodyScroll = (): void => {
  if (typeof document === 'undefined') return;
  activeScrollLocks = Math.max(0, activeScrollLocks - 1);
  if (activeScrollLocks === 0) {
    document.body.style.overflow = savedBodyOverflow;
    savedBodyOverflow = '';
  }
};

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onViewCartPage,
  onProceedToCheckout
}) => {
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);

  // Synchronize enter and exit animation lifecycle with isOpen prop
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (isOpen) {
      setIsRendered(true);
      // Next tick / animation frame to guarantee CSS transition triggers from initial off-screen state
      const raf = requestAnimationFrame(() => {
        setIsVisible(true);
      });
      return () => cancelAnimationFrame(raf);
    } else if (isRendered) {
      // Begin exit transition
      setIsVisible(false);
      timer = setTimeout(() => {
        setIsRendered(false);
      }, 300); // matches transition duration (300ms)
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isOpen, isRendered]);

  // Handle ESC key to dismiss drawer smoothly
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent background scroll while cart drawer is open using shared lock manager
  useEffect(() => {
    if (!isRendered) return;
    lockBodyScroll();
    return () => {
      unlockBodyScroll();
    };
  }, [isRendered]);

  if (!isRendered) return null;

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  return (
    <div 
      className={`fixed inset-0 z-50 flex justify-end transition-opacity duration-300 ease-out motion-reduce:transition-none ${
        isVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
      role="dialog"
      aria-modal="true"
      aria-label="Shopping Cart Drawer"
    >
      {/* Background Overlay with smooth fade */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 ease-out motion-reduce:transition-none"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Cart Drawer Panel with smooth slide-in from right */}
      <div 
        className={`relative w-96 max-w-[90vw] bg-white h-full shadow-2xl flex flex-col justify-between z-10 transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none motion-reduce:transform-none ${
          isVisible ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        
        {/* Drawer Top Header */}
        <div className="bg-[#4A1525] text-white p-4 flex items-center justify-between border-b border-[#5C1B2E]">
          <div className="flex items-center space-x-2">
            <ShoppingBag size={20} className="text-amber-300" />
            <h3 className="font-serif font-bold text-base text-amber-200">Shopping Cart</h3>
            <span className="bg-amber-400 text-[#4A1525] text-xs font-black px-2 py-0.5 rounded-full transition-transform active:scale-95">
              {cart.reduce((a, b) => a + b.quantity, 0)}
            </span>
          </div>
          <button 
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 active:scale-90 transition-all cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-amber-300/50"
            aria-label="Close cart drawer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length > 0 ? (
            cart.map((item, index) => (
              <div 
                key={`cart-drawer-item-${item.product.id}-${item.selectedFinish || ''}-${item.selectedSize || ''}-${index}`}
                className="bg-[#FAF7F2] p-3 rounded-xl border border-[#E8DFC2]/80 flex items-center space-x-3 transition-colors hover:border-[#D5C29A]"
              >
                <img 
                  src={item.product.image} 
                  alt={item.product.name} 
                  className="w-14 h-14 object-cover rounded-lg border border-white shrink-0"
                />
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-xs text-slate-900 line-clamp-1">{item.product.name}</h4>
                  
                  {(item.selectedFinish || item.selectedSize) && (
                    <div className="text-[10px] text-slate-500 font-medium">
                      {item.selectedFinish && <span>Finish: {item.selectedFinish}</span>}
                      {item.selectedFinish && item.selectedSize && <span> • </span>}
                      {item.selectedSize && <span>Size: {item.selectedSize}</span>}
                    </div>
                  )}

                  <p className="font-bold text-xs text-[#4A1525] mt-0.5">৳ {item.product.price}</p>
                  
                  {/* Quantity Selector */}
                  <div className="flex items-center space-x-2 mt-1.5">
                    <div className="flex items-center border border-slate-200 rounded-md bg-white">
                      <button 
                        onClick={() => onUpdateQuantity(item.product.id, -1)}
                        className="px-1.5 py-0.5 text-slate-600 hover:text-[#4A1525] active:scale-90 transition-transform cursor-pointer"
                        aria-label="Decrease quantity"
                      >
                        <Minus size={10} />
                      </button>
                      <span className="px-2 text-[11px] font-bold">{item.quantity}</span>
                      <button 
                        onClick={() => onUpdateQuantity(item.product.id, 1)}
                        className="px-1.5 py-0.5 text-slate-600 hover:text-[#4A1525] active:scale-90 transition-transform cursor-pointer"
                        aria-label="Increase quantity"
                      >
                        <Plus size={10} />
                      </button>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => onRemoveItem(item.product.id)}
                  className="text-slate-400 hover:text-red-600 active:scale-90 transition-transform p-1 cursor-pointer"
                  aria-label={`Remove ${item.product.name} from cart`}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-slate-500">
              <ShoppingBag size={40} className="mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-semibold">Your cart is empty</p>
            </div>
          )}
        </div>

        {/* Footer Subtotal & Action Buttons */}
        {cart.length > 0 && (
          <div className="p-4 bg-[#FAF7F2] border-t border-[#E8DFC2] space-y-3">
            <div className="flex items-center justify-between text-sm font-bold">
              <span className="text-slate-700">Subtotal:</span>
              <span className="text-[#4A1525] text-base">৳ {subtotal}</span>
            </div>

            <div className="space-y-2">
              <button 
                onClick={() => { onClose(); onProceedToCheckout(); }}
                className="w-full bg-[#4A1525] hover:bg-[#360F1B] active:scale-[0.99] text-white text-xs font-bold py-2.5 rounded-xl shadow-xs transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <span>PROCEED TO CHECKOUT</span>
                <ArrowRight size={14} />
              </button>

              <button 
                onClick={() => { onClose(); onViewCartPage(); }}
                className="w-full border border-[#4A1525] text-[#4A1525] hover:bg-[#4A1525] hover:text-white active:scale-[0.99] text-xs font-bold py-2 rounded-xl transition-all cursor-pointer"
              >
                VIEW CART PAGE
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

