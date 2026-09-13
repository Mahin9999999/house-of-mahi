import React, { useState } from 'react';
import { 
  ShoppingBag, Heart, Search, Menu, User, ChevronDown, ChevronRight, Globe, X, PhoneCall
} from 'lucide-react';
import logoImg from '../assets/images/houseofmahi_logo_1786477060132.jpg';
import { useAuth } from '../context/AuthContext';
import { trackingService } from '../services/trackingService';
import { useAdminStore } from '../store/useAdminStore';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  wishlistCount: number;
  cartCount: number;
  onOpenMobileMenu: () => void;
  onOpenCartDrawer: () => void;
  onOpenTrackOrder: () => void;
  onOpenAuthModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  selectedCategory,
  setSelectedCategory,
  searchQuery,
  setSearchQuery,
  wishlistCount,
  cartCount,
  onOpenMobileMenu,
  onOpenCartDrawer,
  onOpenTrackOrder,
  onOpenAuthModal
}) => {
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [selectedDropdownCat, setSelectedDropdownCat] = useState('All Categories');
  const [isAllCategoriesOpen, setIsAllCategoriesOpen] = useState(false);
  
  const { currentUser, userProfile } = useAuth();
  const categories = useAdminStore((state) => state.categories);

  const topCategories = categories
    .filter(c => !c.parentCategory)
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

  const getSubcategories = (parentSlugOrId: string) => {
    return categories
      .filter(c => c.parentCategory === parentSlugOrId || c.parentCategory === parentSlugOrId.toLowerCase())
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      trackingService.trackSearch(searchQuery.trim());
    }
    setActiveTab('shop');
    setIsMobileSearchOpen(false);
  };

  const handleAccountClick = () => {
    if (currentUser) {
      setActiveTab('account');
    } else if (onOpenAuthModal) {
      onOpenAuthModal();
    } else {
      setActiveTab('account');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#EFE8DE] shadow-xs">
      
      {/* 1. TOP ANNOUNCEMENT BAR (Clean & Compact on Mobile) */}
      <div className="bg-[#4A1525] text-[#F3E8DC] py-1.5 px-3 sm:px-4 border-b border-[#5C1B2E]">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-[10px] sm:text-xs">
          
          <div className="flex items-center space-x-1.5 truncate max-w-[200px] xs:max-w-[260px] sm:max-w-none">
            <span className="text-amber-400 shrink-0">🚚</span>
            <span className="font-medium truncate">Free Home Delivery all over Bangladesh</span>
          </div>

          <div className="hidden md:flex items-center space-x-3 text-[11px] text-[#D8C4B0]">
            <a href="tel:01400031902" className="flex items-center space-x-1 hover:text-amber-300 transition-colors">
              <PhoneCall size={12} className="text-amber-400" />
              <span>01400-031902</span>
            </a>
            <span>•</span>
            <span>Authentic Jewelry</span>
            <span>•</span>
            <span>Easy Returns</span>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            <button 
              onClick={onOpenTrackOrder}
              className="hover:text-amber-300 transition-colors font-medium cursor-pointer"
            >
              Track Order
            </button>
            <span className="opacity-40">|</span>
            <button 
              onClick={() => setActiveTab('contact')} 
              className="hover:text-amber-300 transition-colors font-medium cursor-pointer"
            >
              Help
            </button>
            <span className="opacity-40">|</span>
            <div className="flex items-center space-x-0.5 font-bold text-amber-300">
              <Globe size={11} />
              <span>EN</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. MAIN HEADER ROW */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 sm:py-3 flex items-center justify-between gap-1.5 sm:gap-4">
        
        {/* Left Side: Mobile Hamburger & Logo */}
        <div className="flex items-center space-x-1.5 sm:space-x-3">
          <button 
            onClick={onOpenMobileMenu}
            className="lg:hidden p-1.5 text-[#4A1525] hover:bg-[#FAF7F2] rounded-lg active:scale-95 transition-transform cursor-pointer"
            aria-label="Open Menu"
          >
            <Menu size={22} />
          </button>

          <div 
            onClick={() => { setActiveTab('home'); setSelectedCategory('all'); }} 
            className="cursor-pointer flex items-center space-x-2 sm:space-x-2.5 group"
          >
            <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-full border border-[#C5A059]/70 p-0.5 bg-white overflow-hidden shadow-xs flex shrink-0 group-hover:border-[#4A1525] transition-colors duration-300">
              <img src={logoImg} alt="House of Mahi Logo" className="w-full h-full object-cover rounded-full" />
            </div>
            <div className="flex flex-col justify-center">
              <div className="flex items-baseline space-x-1">
                <span className="text-base sm:text-2xl font-cormorant font-bold tracking-tight text-[#4A1525] uppercase leading-none">
                  HOUSE
                </span>
                <span className="text-xs sm:text-lg font-playfair italic font-normal text-[#C5A059] lowercase leading-none">
                  of
                </span>
                <span className="text-base sm:text-2xl font-cormorant font-bold tracking-tight text-[#4A1525] uppercase leading-none">
                  MAHI
                </span>
              </div>
              <p className="text-[6.5px] sm:text-[9px] text-[#8C6A2E] font-montserrat font-bold tracking-[0.22em] sm:tracking-[0.28em] uppercase mt-0.5 sm:mt-1">
                BEAUTY STUDIO & JEWELRY
              </p>
            </div>
          </div>
        </div>

        {/* Center: Desktop Search Bar with Category Dropdown */}
        <form 
          onSubmit={handleSearchSubmit}
          className="hidden md:flex flex-1 max-w-xl mx-4 border border-[#E0D5C5] rounded-full overflow-hidden bg-[#FAF7F2] focus-within:border-[#4A1525] focus-within:bg-white transition-all shadow-inner"
        >
          <div className="relative border-r border-[#E0D5C5] flex items-center bg-white px-3 text-xs font-semibold text-[#4A1525]">
            <select 
              value={selectedDropdownCat}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedDropdownCat(val);
                if (val === 'All Categories') setSelectedCategory('all');
                else setSelectedCategory(val.toLowerCase());
              }}
              className="bg-transparent pr-4 focus:outline-hidden cursor-pointer py-2 text-xs"
            >
              <option value="All Categories">All Categories</option>
              {topCategories.map(c => (
                <option key={c.id} value={c.slug || c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for jewelry, earrings, necklace..." 
            className="flex-1 px-4 text-xs bg-transparent focus:outline-hidden"
          />
          <button 
            type="submit"
            className="bg-[#4A1525] text-white px-5 flex items-center justify-center hover:bg-[#360F1B] transition-colors cursor-pointer"
          >
            <Search size={16} />
          </button>
        </form>

        {/* Right Side Header Icons (Search, Account, Wishlist, Cart) */}
        <div className="flex items-center space-x-1 sm:space-x-3">
          
          {/* Mobile Search Button */}
          <button 
            onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
            className="md:hidden p-1.5 text-[#4A1525] hover:bg-[#FAF7F2] rounded-full cursor-pointer"
            aria-label="Search"
          >
            <Search size={19} />
          </button>

          {/* Account Icon / Customer Status */}
          <button 
            onClick={handleAccountClick}
            className="p-1.5 text-[#2C221E] hover:text-[#4A1525] transition-colors flex items-center space-x-1.5 cursor-pointer"
            aria-label="Account"
          >
            <User size={19} className="sm:w-5 sm:h-5" />
            <div className="hidden lg:block text-left text-xs">
              <p className="text-[10px] text-stone-400 font-medium">
                {currentUser ? 'My Account' : 'Welcome'}
              </p>
              <p className="font-bold text-[#4A1525] -mt-0.5 truncate max-w-[90px]">
                {currentUser ? (userProfile?.displayName?.split(' ')[0] || 'Member') : 'Sign In ▾'}
              </p>
            </div>
          </button>

          {/* Wishlist Icon */}
          <button 
            onClick={() => setActiveTab('wishlist')}
            className="relative p-1.5 text-[#2C221E] hover:text-[#4A1525] transition-colors flex items-center space-x-1.5 cursor-pointer"
            aria-label="Wishlist"
          >
            <div className="relative">
              <Heart size={19} className={wishlistCount > 0 ? 'fill-[#4A1525] text-[#4A1525]' : ''} />
              {wishlistCount > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-[#4A1525] text-white text-[9px] font-bold w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full flex items-center justify-center">
                  {wishlistCount}
                </span>
              )}
            </div>
            <span className="hidden xl:inline text-xs font-semibold">Wishlist</span>
          </button>

          {/* Cart Icon */}
          <button 
            onClick={onOpenCartDrawer}
            className="relative p-1.5 text-[#2C221E] hover:text-[#4A1525] transition-colors flex items-center space-x-1.5 cursor-pointer"
            aria-label="Cart"
          >
            <div className="relative">
              <ShoppingBag size={19} />
              <span className="absolute -top-1.5 -right-2 bg-[#4A1525] text-white text-[9px] font-bold w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            </div>
            <span className="hidden xl:inline text-xs font-semibold">Cart</span>
          </button>

        </div>
      </div>

      {/* MOBILE QUICK SEARCH BAR EXPANDED */}
      {isMobileSearchOpen && (
        <div className="md:hidden bg-[#FAF7F2] border-t border-b border-[#E8DFC2] p-2.5 shadow-inner">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <div className="relative flex-1 bg-white border border-[#E0D5C5] rounded-full overflow-hidden flex items-center px-3 py-1.5">
              <Search size={15} className="text-slate-400 mr-2 shrink-0" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search jewelry, earrings..." 
                className="w-full text-xs focus:outline-hidden bg-transparent"
                autoFocus
              />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery('')} className="text-slate-400 p-0.5 cursor-pointer">
                  <X size={14} />
                </button>
              )}
            </div>
            <button 
              type="submit" 
              className="bg-[#4A1525] text-white text-xs font-bold px-3.5 py-1.5 rounded-full cursor-pointer"
            >
              Search
            </button>
          </form>

          {/* Quick Category Chips for Mobile Search */}
          <div className="flex items-center space-x-1.5 overflow-x-auto mt-2 pt-0.5 text-[10px] no-scrollbar">
            <span className="text-slate-500 font-medium shrink-0">Category:</span>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('all');
                setActiveTab('shop');
                setIsMobileSearchOpen(false);
              }}
              className={`px-2.5 py-0.5 rounded-full capitalize font-semibold cursor-pointer shrink-0 ${selectedCategory === 'all' ? 'bg-[#4A1525] text-white' : 'bg-white text-slate-700 border border-[#E0D5C5]'}`}
            >
              All
            </button>
            {topCategories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat.slug || cat.id);
                  setActiveTab('shop');
                  setIsMobileSearchOpen(false);
                }}
                className={`px-2.5 py-0.5 rounded-full capitalize font-semibold cursor-pointer shrink-0 ${selectedCategory === (cat.slug || cat.id) ? 'bg-[#4A1525] text-white' : 'bg-white text-slate-700 border border-[#E0D5C5]'}`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3. MAIN NAVIGATION BAR (DESKTOP) */}
      <nav className="bg-[#4A1525] text-white hidden lg:block border-t border-[#5C1B2E] relative">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between text-xs font-semibold">
          
          <div className="flex items-center space-x-1">
            {/* All Categories Dropdown Trigger */}
            <div className="relative">
              <button 
                onClick={() => setIsAllCategoriesOpen(!isAllCategoriesOpen)}
                onMouseEnter={() => setIsAllCategoriesOpen(true)}
                className="bg-[#360F1B] hover:bg-[#280B14] px-5 py-3 flex items-center space-x-2 text-amber-300 font-bold tracking-wide mr-4 transition-colors cursor-pointer"
              >
                <Menu size={16} />
                <span>All Categories</span>
                <ChevronDown size={14} className={`transition-transform duration-200 ${isAllCategoriesOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Mega Dropdown Menu */}
              {isAllCategoriesOpen && (
                <div 
                  onMouseLeave={() => setIsAllCategoriesOpen(false)}
                  className="absolute left-0 top-full w-72 bg-white text-slate-800 shadow-2xl rounded-b-xl border border-slate-200 z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-150"
                >
                  <button
                    onClick={() => {
                      setSelectedCategory('all');
                      setActiveTab('shop');
                      setIsAllCategoriesOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-amber-50 hover:text-[#4A1525] font-bold text-xs flex items-center justify-between border-b border-slate-100"
                  >
                    <span>Browse All Products</span>
                    <ChevronRight size={14} className="text-slate-400" />
                  </button>

                  {topCategories.map((top) => {
                    const subCats = getSubcategories(top.slug || top.id);
                    return (
                      <div key={top.id} className="group relative">
                        <button
                          onClick={() => {
                            setSelectedCategory(top.slug || top.id);
                            setActiveTab('shop');
                            setIsAllCategoriesOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-amber-50 hover:text-[#4A1525] text-xs flex items-center justify-between font-semibold"
                        >
                          <span>{top.name}</span>
                          {subCats.length > 0 && <ChevronRight size={14} className="text-slate-400 group-hover:text-[#4A1525]" />}
                        </button>

                        {/* Flyout for Subcategories */}
                        {subCats.length > 0 && (
                          <div className="hidden group-hover:block absolute left-full top-0 w-64 bg-white text-slate-800 shadow-2xl rounded-r-xl border border-slate-200 py-2">
                            <div className="px-3 py-1 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                              {top.name} Subcategories
                            </div>
                            {subCats.map((sub) => (
                              <button
                                key={sub.id}
                                onClick={() => {
                                  setSelectedCategory(sub.slug || sub.id);
                                  setActiveTab('shop');
                                  setIsAllCategoriesOpen(false);
                                }}
                                className="w-full text-left px-4 py-1.5 hover:bg-amber-50 hover:text-[#4A1525] text-xs flex items-center justify-between"
                              >
                                <span>{sub.name}</span>
                                <span className="text-[10px] text-slate-400">({sub.productCount || 0})</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Nav Items */}
            <button 
              onClick={() => { setActiveTab('home'); setSelectedCategory('all'); }} 
              className={`px-4 py-3 border-b-2 transition-colors cursor-pointer ${activeTab === 'home' ? 'border-amber-400 text-amber-300 font-bold' : 'border-transparent text-white/90 hover:text-amber-200'}`}
            >
              Home
            </button>
            <button 
              onClick={() => { setActiveTab('shop'); setSelectedCategory('all'); }} 
              className={`px-4 py-3 border-b-2 transition-colors cursor-pointer ${activeTab === 'shop' ? 'border-amber-400 text-amber-300 font-bold' : 'border-transparent text-white/90 hover:text-amber-200'}`}
            >
              Shop
            </button>
            <button 
              onClick={() => setActiveTab('wishlist')} 
              className={`px-4 py-3 border-b-2 transition-colors cursor-pointer ${activeTab === 'wishlist' ? 'border-amber-400 text-amber-300 font-bold' : 'border-transparent text-white/90 hover:text-amber-200'}`}
            >
              Wishlist
            </button>
            <button 
              onClick={() => setActiveTab('cart')} 
              className={`px-4 py-3 border-b-2 transition-colors cursor-pointer ${activeTab === 'cart' ? 'border-amber-400 text-amber-300 font-bold' : 'border-transparent text-white/90 hover:text-amber-200'}`}
            >
              Cart
            </button>
            <button 
              onClick={() => setActiveTab('account')} 
              className={`px-4 py-3 border-b-2 transition-colors cursor-pointer ${activeTab === 'account' ? 'border-amber-400 text-amber-300 font-bold' : 'border-transparent text-white/90 hover:text-amber-200'}`}
            >
              Account
            </button>
            <button 
              onClick={() => setActiveTab('about')} 
              className={`px-4 py-3 border-b-2 transition-colors cursor-pointer ${activeTab === 'about' ? 'border-amber-400 text-amber-300 font-bold' : 'border-transparent text-white/90 hover:text-amber-200'}`}
            >
              About Us
            </button>
            <button 
              onClick={() => setActiveTab('contact')} 
              className={`px-4 py-3 border-b-2 transition-colors cursor-pointer ${activeTab === 'contact' ? 'border-amber-400 text-amber-300 font-bold' : 'border-transparent text-white/90 hover:text-amber-200'}`}
            >
              Contact Us
            </button>
          </div>

          {/* Buy Now CTA Header Button */}
          <button 
            onClick={() => { setActiveTab('shop'); setSelectedCategory('all'); }}
            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-[#4A1525] font-bold px-5 py-2 rounded-full shadow-xs flex items-center space-x-1.5 transition-transform active:scale-95 cursor-pointer"
          >
            <ShoppingBag size={14} />
            <span>BUY NOW</span>
          </button>
        </div>
      </nav>

    </header>
  );
};
