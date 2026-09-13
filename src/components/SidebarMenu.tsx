import React, { useState } from 'react';
import { 
  Home, ShoppingBag, Heart, User, PackageCheck, ShieldCheck, 
  PhoneCall, X, ChevronRight, ChevronDown, Facebook, Instagram, Youtube, HelpCircle, MessageCircle, MapPin 
} from 'lucide-react';
import logoImg from '../assets/images/houseofmahi_logo_1786477060132.jpg';
import { useAdminStore } from '../store/useAdminStore';

// Custom TikTok Icon
const TikTokIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
  </svg>
);

interface SidebarMenuProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  setActiveTab: (tab: 'home' | 'shop' | 'wishlist' | 'cart' | 'account' | 'about' | 'contact' | 'faq') => void;
  selectedCategory?: string;
  setSelectedCategory: (cat: string) => void;
  wishlistCount?: number;
  cartCount?: number;
  onOpenTrackOrder?: () => void;
}

export const SidebarMenu: React.FC<SidebarMenuProps> = ({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  selectedCategory,
  setSelectedCategory,
  wishlistCount,
  cartCount,
  onOpenTrackOrder
}) => {
  const categories = useAdminStore((state) => state.categories);
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  // Filter top level categories (those without parentCategory)
  const topCategories = categories
    .filter(c => !c.parentCategory)
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

  // Helper to get subcategories for a given top category
  const getSubcategories = (parentSlugOrId: string) => {
    return categories
      .filter(c => c.parentCategory === parentSlugOrId || c.parentCategory === parentSlugOrId.toLowerCase())
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  };

  const toggleExpand = (catKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedCats(prev => ({ ...prev, [catKey]: !prev[catKey] }));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex animate-fade-in">
      <div className="w-80 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto">
        <div>
          {/* Header Banner */}
          <div className="bg-[#4A1525] text-white p-4 sm:p-5 flex items-center justify-between border-b border-[#5C1B2E]">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-full border border-amber-300 bg-white overflow-hidden shrink-0">
                <img src={logoImg} alt="Houseofmahi Logo" className="w-full h-full object-cover" />
              </div>
              <div>
                <h2 className="font-cormorant font-bold text-xl text-amber-200 tracking-[0.04em] uppercase leading-tight">
                  house <span className="font-playfair italic font-normal text-amber-400 lowercase text-base">of</span> mahi
                </h2>
                <p className="text-[8px] text-amber-300/80 font-montserrat font-semibold uppercase tracking-[0.25em] mt-0.5">Beauty Studio & Jewelry</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 cursor-pointer"
              aria-label="Close menu"
            >
              <X size={22} />
            </button>
          </div>

          {/* Navigation Links List */}
          <div className="p-3 sm:p-4 space-y-1 text-sm font-semibold text-[#2C221E]">
            
            <button 
              onClick={() => { setActiveTab('home'); onClose(); }}
              className={`w-full flex items-center space-x-3 p-2.5 sm:p-3 rounded-xl transition-colors cursor-pointer ${activeTab === 'home' ? 'bg-[#FAF7F2] text-[#4A1525] font-bold' : 'hover:bg-[#FAF7F2]'}`}
            >
              <Home size={18} className="text-[#4A1525]" />
              <span>Home</span>
            </button>

            <button 
              onClick={() => { setActiveTab('shop'); setSelectedCategory('all'); onClose(); }}
              className={`w-full flex items-center space-x-3 p-2.5 sm:p-3 rounded-xl transition-colors cursor-pointer ${activeTab === 'shop' && (!selectedCategory || selectedCategory === 'all') ? 'bg-[#FAF7F2] text-[#4A1525] font-bold' : 'hover:bg-[#FAF7F2]'}`}
            >
              <ShoppingBag size={18} className="text-[#4A1525]" />
              <span>Shop All</span>
            </button>

            {/* Dynamic Top Categories Hierarchy */}
            <div className="pl-3 pr-1 py-2 space-y-1 text-xs border-l-2 border-[#E8DFC2] my-1">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold px-2 mb-1">Top Categories</p>
              {topCategories.map((item) => {
                const subCats = getSubcategories(item.slug || item.id);
                const hasSubs = subCats.length > 0;
                const isExpanded = !!expandedCats[item.slug || item.id];
                const isSelected = selectedCategory === item.slug || selectedCategory === item.id;

                return (
                  <div key={item.id} className="space-y-0.5">
                    <div 
                      className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors cursor-pointer ${isSelected ? 'bg-amber-50 text-[#4A1525] font-bold' : 'text-slate-700 hover:text-[#4A1525] hover:bg-slate-50'}`}
                      onClick={() => {
                        setSelectedCategory(item.slug || item.id);
                        setActiveTab('shop');
                        onClose();
                      }}
                    >
                      <span className="truncate pr-1">{item.name}</span>
                      <div className="flex items-center space-x-1 shrink-0">
                        {hasSubs && (
                          <button
                            type="button"
                            onClick={(e) => toggleExpand(item.slug || item.id, e)}
                            className="p-1 hover:bg-amber-100 rounded text-slate-500 hover:text-[#4A1525] transition-colors"
                            title={isExpanded ? "Collapse subcategories" : "Expand subcategories"}
                          >
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                        )}
                        {!hasSubs && <ChevronRight size={13} className="text-slate-300" />}
                      </div>
                    </div>

                    {/* Subcategories Accordion */}
                    {hasSubs && isExpanded && (
                      <div className="pl-4 pr-1 py-1 space-y-1 border-l border-amber-200/60 ml-2 bg-amber-50/40 rounded-r-lg">
                        {subCats.map((sub) => {
                          const isSubSelected = selectedCategory === sub.slug || selectedCategory === sub.id;
                          return (
                            <button
                              key={sub.id}
                              onClick={() => {
                                setSelectedCategory(sub.slug || sub.id);
                                setActiveTab('shop');
                                onClose();
                              }}
                              className={`w-full text-left px-2 py-1 text-xs rounded transition-colors flex items-center justify-between cursor-pointer ${isSubSelected ? 'text-[#4A1525] font-bold bg-amber-100/70' : 'text-slate-600 hover:text-[#4A1525] hover:bg-amber-50'}`}
                            >
                              <span className="truncate">• {sub.name}</span>
                              <span className="text-[10px] text-slate-400">({sub.productCount || 0})</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button 
              onClick={() => { setActiveTab('wishlist'); onClose(); }}
              className={`w-full flex items-center justify-between p-2.5 sm:p-3 rounded-xl transition-colors cursor-pointer ${activeTab === 'wishlist' ? 'bg-[#FAF7F2] text-[#4A1525] font-bold' : 'hover:bg-[#FAF7F2]'}`}
            >
              <div className="flex items-center space-x-3">
                <Heart size={18} className="text-[#4A1525]" />
                <span>Wishlist</span>
              </div>
              <span className="bg-[#4A1525] text-white text-xs px-2 py-0.5 rounded-full font-bold">{wishlistCount}</span>
            </button>

            <button 
              onClick={() => { setActiveTab('cart'); onClose(); }}
              className={`w-full flex items-center justify-between p-2.5 sm:p-3 rounded-xl transition-colors cursor-pointer ${activeTab === 'cart' ? 'bg-[#FAF7F2] text-[#4A1525] font-bold' : 'hover:bg-[#FAF7F2]'}`}
            >
              <div className="flex items-center space-x-3">
                <ShoppingBag size={18} className="text-[#4A1525]" />
                <span>Cart</span>
              </div>
              <span className="bg-[#4A1525] text-white text-xs px-2 py-0.5 rounded-full font-bold">{cartCount}</span>
            </button>

            <button 
              onClick={() => { setActiveTab('account'); onClose(); }}
              className={`w-full flex items-center space-x-3 p-2.5 sm:p-3 rounded-xl transition-colors cursor-pointer ${activeTab === 'account' ? 'bg-[#FAF7F2] text-[#4A1525] font-bold' : 'hover:bg-[#FAF7F2]'}`}
            >
              <User size={18} className="text-[#4A1525]" />
              <span>My Account</span>
            </button>

            <button 
              onClick={() => { 
                if (onOpenTrackOrder) onOpenTrackOrder(); 
                onClose(); 
              }}
              className="w-full flex items-center space-x-3 p-2.5 sm:p-3 rounded-xl hover:bg-[#FAF7F2] transition-colors cursor-pointer"
            >
              <PackageCheck size={18} className="text-[#4A1525]" />
              <span>Track Order</span>
            </button>

            <button 
              onClick={() => { setActiveTab('about'); onClose(); }}
              className={`w-full flex items-center space-x-3 p-2.5 sm:p-3 rounded-xl transition-colors cursor-pointer ${activeTab === 'about' ? 'bg-[#FAF7F2] text-[#4A1525] font-bold' : 'hover:bg-[#FAF7F2]'}`}
            >
              <ShieldCheck size={18} className="text-[#4A1525]" />
              <span>About Us</span>
            </button>

            <button 
              onClick={() => { setActiveTab('contact'); onClose(); }}
              className={`w-full flex items-center space-x-3 p-2.5 sm:p-3 rounded-xl transition-colors cursor-pointer ${activeTab === 'contact' ? 'bg-[#FAF7F2] text-[#4A1525] font-bold' : 'hover:bg-[#FAF7F2]'}`}
            >
              <PhoneCall size={18} className="text-[#4A1525]" />
              <span>Contact Us</span>
            </button>

            <button 
              onClick={() => { setActiveTab('faq'); onClose(); }}
              className={`w-full flex items-center space-x-3 p-2.5 sm:p-3 rounded-xl transition-colors cursor-pointer ${activeTab === 'faq' ? 'bg-[#FAF7F2] text-[#4A1525] font-bold' : 'hover:bg-[#FAF7F2]'}`}
            >
              <HelpCircle size={18} className="text-[#4A1525]" />
              <span>FAQs & Help</span>
            </button>

          </div>
        </div>

        {/* Bottom Contact & Social Card */}
        <div className="p-3.5 bg-[#4A1525] text-white m-3 rounded-2xl border border-[#6E2439]">
          <p className="text-[10px] text-amber-300 font-medium">Need Assistance / Direct Order?</p>
          <a href="tel:01400031902" className="text-sm font-bold mt-0.5 block hover:text-amber-200">
            📞 01400-031902
          </a>
          
          <p className="text-[9px] text-[#E0D5C5] mt-1 flex items-start space-x-1">
            <MapPin size={10} className="text-amber-400 shrink-0 mt-0.5" />
            <span className="line-clamp-2">E-76 Jalkuri Majpara, Siddirganj, Narayanganj</span>
          </p>

          <div className="flex items-center space-x-2.5 mt-3 text-amber-300">
            <a 
              href="https://www.facebook.com/houseofmahi" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="w-7 h-7 rounded-full bg-[#5C1B2E] border border-amber-300/40 flex items-center justify-center hover:bg-[#1877F2] hover:text-white transition-colors"
              title="Facebook"
            >
              <Facebook size={14} />
            </a>
            <a 
              href="https://www.instagram.com/houseof_._mahi" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="w-7 h-7 rounded-full bg-[#5C1B2E] border border-amber-300/40 flex items-center justify-center hover:bg-[#E4405F] hover:text-white transition-colors"
              title="Instagram"
            >
              <Instagram size={14} />
            </a>
            <a 
              href="https://www.tiktok.com/@houseof_._mahi" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="w-7 h-7 rounded-full bg-[#5C1B2E] border border-amber-300/40 flex items-center justify-center hover:bg-black hover:text-white transition-colors"
              title="TikTok"
            >
              <TikTokIcon className="w-3 h-3" />
            </a>
            <a 
              href="https://www.youtube.com/@mahimamahi9498" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="w-7 h-7 rounded-full bg-[#5C1B2E] border border-amber-300/40 flex items-center justify-center hover:bg-[#FF0000] hover:text-white transition-colors"
              title="YouTube"
            >
              <Youtube size={14} />
            </a>
            <a 
              href="https://wa.me/8801400031902" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="w-7 h-7 rounded-full bg-[#5C1B2E] border border-amber-300/40 flex items-center justify-center hover:bg-[#25D366] hover:text-white transition-colors"
              title="WhatsApp"
            >
              <MessageCircle size={14} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
