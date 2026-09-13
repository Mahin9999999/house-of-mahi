import React from 'react';
import { Home, Store, Heart, ShoppingBag, User } from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  wishlistCount: number;
  cartCount: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  wishlistCount,
  cartCount
}) => {
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#4A1525] text-white border-t border-[#5C1B2E] shadow-2xl">
      <div className="grid grid-cols-5 py-2 px-1 text-center items-center">
        
        {/* Home Tab */}
        <button 
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center justify-center py-1 transition-all ${
            activeTab === 'home' ? 'text-amber-300 font-bold scale-105' : 'text-white/70 hover:text-white'
          }`}
        >
          <Home size={19} />
          <span className="text-[10px] mt-0.5">Home</span>
        </button>

        {/* Shop Tab */}
        <button 
          onClick={() => setActiveTab('shop')}
          className={`flex flex-col items-center justify-center py-1 transition-all ${
            activeTab === 'shop' ? 'text-amber-300 font-bold scale-105' : 'text-white/70 hover:text-white'
          }`}
        >
          <Store size={19} />
          <span className="text-[10px] mt-0.5">Shop</span>
        </button>

        {/* Wishlist Tab */}
        <button 
          onClick={() => setActiveTab('wishlist')}
          className={`relative flex flex-col items-center justify-center py-1 transition-all ${
            activeTab === 'wishlist' ? 'text-amber-300 font-bold scale-105' : 'text-white/70 hover:text-white'
          }`}
        >
          <div className="relative">
            <Heart size={19} className={wishlistCount > 0 ? 'fill-amber-300 text-amber-300' : ''} />
            {wishlistCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-amber-400 text-[#4A1525] text-[9px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center border border-[#4A1525]">
                {wishlistCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5">Wishlist</span>
        </button>

        {/* Cart Tab */}
        <button 
          onClick={() => setActiveTab('cart')}
          className={`relative flex flex-col items-center justify-center py-1 transition-all ${
            activeTab === 'cart' ? 'text-amber-300 font-bold scale-105' : 'text-white/70 hover:text-white'
          }`}
        >
          <div className="relative">
            <ShoppingBag size={19} />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-amber-400 text-[#4A1525] text-[9px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center border border-[#4A1525]">
                {cartCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5">Cart</span>
        </button>

        {/* Account Tab */}
        <button 
          onClick={() => setActiveTab('account')}
          className={`flex flex-col items-center justify-center py-1 transition-all ${
            activeTab === 'account' ? 'text-amber-300 font-bold scale-105' : 'text-white/70 hover:text-white'
          }`}
        >
          <User size={19} />
          <span className="text-[10px] mt-0.5">Account</span>
        </button>

      </div>
    </div>
  );
};

