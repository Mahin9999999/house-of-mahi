import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Package, 
  FolderTree, 
  ImageIcon, 
  Home, 
  Tag, 
  Users, 
  Star, 
  TrendingUp, 
  Share2, 
  Globe, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  ChevronRight,
  Truck,
  CreditCard,
  ArrowUpRight,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type AdminTab = 
  | 'dashboard' 
  | 'orders' 
  | 'couriers' 
  | 'payments' 
  | 'products' 
  | 'categories' 
  | 'banners' 
  | 'homepage' 
  | 'coupons' 
  | 'customers' 
  | 'reviews' 
  | 'analytics' 
  | 'marketing' 
  | 'seo' 
  | 'settings';

interface AdminLayoutProps {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
  children: React.ReactNode;
  onExitAdmin?: () => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  activeTab,
  setActiveTab,
  children,
  onExitAdmin
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { currentUser, userProfile, logout } = useAuth();

  const navItems: { id: AdminTab; label: string; icon: React.FC<any>; badge?: string }[] = [
    { id: 'dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
    { id: 'orders', label: 'Order Processing', icon: ShoppingBag },
    { id: 'couriers', label: 'Courier Dispatch', icon: Truck },
    { id: 'payments', label: 'Payment Gateways & Trx', icon: CreditCard },
    { id: 'products', label: 'Product Catalog', icon: Package },
    { id: 'categories', label: 'Category Hierarchy', icon: FolderTree },
    { id: 'banners', label: 'Hero & Promo Banners', icon: ImageIcon },
    { id: 'homepage', label: 'Homepage Layout', icon: Home },
    { id: 'coupons', label: 'Coupons & Deals', icon: Tag },
    { id: 'customers', label: 'Customer Relations', icon: Users },
    { id: 'reviews', label: 'Product Reviews', icon: Star },
    { id: 'analytics', label: 'Demand & Analytics', icon: TrendingUp },
    { id: 'marketing', label: 'Pixel & Marketing', icon: Share2 },
    { id: 'seo', label: 'SEO Optimization', icon: Globe },
    { id: 'settings', label: 'Store Settings', icon: Settings }
  ];

  const handleTabClick = (tab: AdminTab) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#FBFBFB] flex flex-col md:flex-row text-stone-800 font-sans antialiased selection:bg-[#800020] selection:text-white">
      {/* Mobile Top App Bar */}
      <div className="md:hidden flex items-center justify-between bg-stone-900 text-white px-5 py-4 border-b border-stone-800 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#800020] text-white flex items-center justify-center font-serif font-bold text-sm tracking-wider shadow-md">
            M
          </div>
          <div>
            <span className="font-serif font-bold tracking-wide text-sm block leading-none">HOUSE OF MAHI</span>
            <span className="text-[10px] text-stone-400 uppercase tracking-widest font-mono">Control Center</span>
          </div>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-stone-400 hover:text-white hover:bg-stone-800 rounded-lg transition-colors"
          aria-label="Toggle Navigation Menu"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Desktop & Mobile Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-stone-950 text-stone-300 border-r border-stone-800/80 flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 md:static ${
          isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-6 border-b border-stone-800/60 hidden md:flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#800020] to-[#5C0017] text-white flex items-center justify-center font-serif font-bold text-lg shadow-inner ring-1 ring-white/10">
              M
            </div>
            <div>
              <h1 className="font-serif font-bold tracking-wider text-white text-base leading-tight">HOUSE OF MAHI</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[10px] font-mono uppercase tracking-widest text-stone-400">Enterprise Admin</span>
              </div>
            </div>
          </div>
        </div>

        {/* User Identity Pill */}
        <div className="px-5 py-4 border-b border-stone-800/40 bg-stone-900/40 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-stone-800 border border-stone-700 text-stone-300 flex items-center justify-center font-semibold text-xs shrink-0">
            {userProfile?.name ? userProfile.name.charAt(0).toUpperCase() : currentUser?.email ? currentUser.email.charAt(0).toUpperCase() : 'A'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate">{userProfile?.name || 'Administrator'}</p>
            <p className="text-[10px] text-stone-400 font-mono truncate">{currentUser?.email || 'admin@houseofmahi.com'}</p>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/50 text-[9px] font-semibold tracking-wide uppercase">
            Root
          </span>
        </div>

        {/* Navigation Item List */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-stone-500 font-mono">
            Navigation Menu
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                  isActive
                    ? 'bg-[#800020] text-white font-semibold shadow-lg shadow-[#800020]/20'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900/80'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-stone-400'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {item.badge && (
                    <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {item.badge}
                    </span>
                  )}
                  {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-80" />}
                </div>
              </button>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="p-4 border-t border-stone-800/60 bg-stone-950 space-y-2">
          {onExitAdmin && (
            <button
              onClick={onExitAdmin}
              className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-stone-300 bg-stone-900 hover:bg-stone-800 border border-stone-800 transition-colors group"
            >
              <span>Back to Storefront</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-stone-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>
          )}

          <button
            onClick={() => logout()}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium text-rose-400/90 hover:text-rose-300 hover:bg-rose-950/30 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out Session</span>
          </button>
        </div>
      </aside>

      {/* Backdrop for Mobile Navigation */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
        />
      )}

      {/* Main Content Viewport */}
      <main className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Top Operational Bar */}
        <header className="bg-white border-b border-stone-200/80 px-6 py-4 hidden md:flex items-center justify-between sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-serif font-bold text-stone-900 capitalize">
              {navItems.find(i => i.id === activeTab)?.label || activeTab}
            </h2>
            <span className="h-4 w-px bg-stone-200"></span>
            <span className="text-xs text-stone-500 font-medium">House of Mahi Operations & Control</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-stone-50 border border-stone-200 text-stone-600 text-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>TLS / AES-256 Secured</span>
            </div>
          </div>
        </header>

        {/* Tab Content Container */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};
