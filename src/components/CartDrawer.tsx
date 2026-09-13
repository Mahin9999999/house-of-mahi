import React from 'react';
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

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onViewCartPage,
  onProceedToCheckout
}) => {
  if (!isOpen) return null;

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end animate-fade-in">
      <div className="w-96 max-w-[90vw] bg-white h-full shadow-2xl flex flex-col justify-between">
        
        {/* Drawer Top Header */}
        <div className="bg-[#4A1525] text-white p-4 flex items-center justify-between border-b border-[#5C1B2E]">
          <div className="flex items-center space-x-2">
            <ShoppingBag size={20} className="text-amber-300" />
            <h3 className="font-serif font-bold text-base text-amber-200">Shopping Cart</h3>
            <span className="bg-amber-400 text-[#4A1525] text-xs font-black px-2 py-0.5 rounded-full">
              {cart.reduce((a, b) => a + b.quantity, 0)}
            </span>
          </div>
          <button 
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10"
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
                className="bg-[#FAF7F2] p-3 rounded-xl border border-[#E8DFC2]/80 flex items-center space-x-3"
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
                        className="px-1.5 py-0.5 text-slate-600 hover:text-[#4A1525]"
                      >
                        <Minus size={10} />
                      </button>
                      <span className="px-2 text-[11px] font-bold">{item.quantity}</span>
                      <button 
                        onClick={() => onUpdateQuantity(item.product.id, 1)}
                        className="px-1.5 py-0.5 text-slate-600 hover:text-[#4A1525]"
                      >
                        <Plus size={10} />
                      </button>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => onRemoveItem(item.product.id)}
                  className="text-slate-400 hover:text-red-600 p-1"
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
                className="w-full bg-[#4A1525] hover:bg-[#360F1B] text-white text-xs font-bold py-2.5 rounded-xl shadow-xs transition-colors flex items-center justify-center space-x-2"
              >
                <span>PROCEED TO CHECKOUT</span>
                <ArrowRight size={14} />
              </button>

              <button 
                onClick={() => { onClose(); onViewCartPage(); }}
                className="w-full border border-[#4A1525] text-[#4A1525] hover:bg-[#4A1525] hover:text-white text-xs font-bold py-2 rounded-xl transition-colors"
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
