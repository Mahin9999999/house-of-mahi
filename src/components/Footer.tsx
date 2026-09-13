import React from 'react';
import { 
  Facebook, 
  Instagram, 
  Youtube, 
  Phone, 
  Mail, 
  MapPin, 
  ShieldCheck, 
  Truck, 
  RotateCcw, 
  Clock,
  MessageCircle
} from 'lucide-react';
import logoImg from '../assets/images/houseofmahi_logo_1786477060132.jpg';

// Custom TikTok Icon
const TikTokIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
  </svg>
);

interface FooterProps {
  setActiveTab: (tab: any) => void;
  setSelectedCategory?: (cat: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ setActiveTab, setSelectedCategory }) => {
  return (
    <footer className="bg-[#360F1B] text-[#F3E8DC] border-t-4 border-[#C5A059] pt-10 sm:pt-14 pb-8 sm:pb-10 font-sans">
      
      {/* 1. BRAND TRUST BADGES */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-10 pb-8 border-b border-[#5C1B2E]">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 text-center sm:text-left">
          
          <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-2 sm:space-y-0 sm:space-x-3 p-3 rounded-xl bg-[#4A1525]/60 border border-[#6E2439]">
            <div className="p-2 bg-[#C5A059]/20 text-[#E5D2A8] rounded-lg">
              <Truck size={20} />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-amber-200">Nationwide Delivery</h4>
              <p className="text-[10px] sm:text-xs text-[#D8C4B0]">All over Bangladesh</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-2 sm:space-y-0 sm:space-x-3 p-3 rounded-xl bg-[#4A1525]/60 border border-[#6E2439]">
            <div className="p-2 bg-[#C5A059]/20 text-[#E5D2A8] rounded-lg">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-amber-200">100% Authentic</h4>
              <p className="text-[10px] sm:text-xs text-[#D8C4B0]">Premium Quality Guarantee</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-2 sm:space-y-0 sm:space-x-3 p-3 rounded-xl bg-[#4A1525]/60 border border-[#6E2439]">
            <div className="p-2 bg-[#C5A059]/20 text-[#E5D2A8] rounded-lg">
              <RotateCcw size={20} />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-amber-200">Easy Return</h4>
              <p className="text-[10px] sm:text-xs text-[#D8C4B0]">Instant Delivery Replacement</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-2 sm:space-y-0 sm:space-x-3 p-3 rounded-xl bg-[#4A1525]/60 border border-[#6E2439]">
            <div className="p-2 bg-[#C5A059]/20 text-[#E5D2A8] rounded-lg">
              <Clock size={20} />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-amber-200">Support 24/7</h4>
              <p className="text-[10px] sm:text-xs text-[#D8C4B0]">Direct WhatsApp & Call</p>
            </div>
          </div>

        </div>
      </div>

      {/* 2. MAIN FOOTER CONTENT */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        
        {/* Column 1: Brand Info & Social Media */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2.5">
            <img src={logoImg} alt="House of Mahi Logo" className="w-10 h-10 rounded-full border border-[#C5A059]" />
            <div>
              <span className="text-lg font-serif font-bold text-amber-200 tracking-wider block leading-tight">HOUSE of MAHI</span>
              <span className="text-[9px] text-[#C5A059] tracking-[0.2em] font-semibold uppercase">Beauty Studio & Jewelry</span>
            </div>
          </div>
          <p className="text-xs text-[#D8C4B0] leading-relaxed">
            Your trusted destination for exquisite jewellery, royal adornments, and bridal beauty accessories in Bangladesh.
          </p>

          {/* Social Links */}
          <div>
            <h5 className="text-[11px] font-bold uppercase tracking-wider text-amber-300 mb-2.5">Follow Us</h5>
            <div className="flex items-center space-x-2.5">
              <a 
                href="https://www.facebook.com/houseofmahi" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="w-8 h-8 rounded-full bg-[#4A1525] border border-[#C5A059]/50 flex items-center justify-center hover:bg-[#1877F2] hover:border-transparent text-white transition-all transform hover:scale-110"
                aria-label="Facebook"
              >
                <Facebook size={15} />
              </a>
              <a 
                href="https://www.instagram.com/houseof_._mahi" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="w-8 h-8 rounded-full bg-[#4A1525] border border-[#C5A059]/50 flex items-center justify-center hover:bg-[#E4405F] hover:border-transparent text-white transition-all transform hover:scale-110"
                aria-label="Instagram"
              >
                <Instagram size={15} />
              </a>
              <a 
                href="https://www.youtube.com/@mahimamahi9498" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="w-8 h-8 rounded-full bg-[#4A1525] border border-[#C5A059]/50 flex items-center justify-center hover:bg-[#FF0000] hover:border-transparent text-white transition-all transform hover:scale-110"
                aria-label="YouTube"
              >
                <Youtube size={15} />
              </a>
              <a 
                href="https://www.tiktok.com/@houseof_._mahi" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="w-8 h-8 rounded-full bg-[#4A1525] border border-[#C5A059]/50 flex items-center justify-center hover:bg-black hover:border-transparent text-white transition-all transform hover:scale-110"
                aria-label="TikTok"
              >
                <TikTokIcon className="w-3.5 h-3.5" />
              </a>
              <a 
                href="https://wa.me/8801400031902" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="w-8 h-8 rounded-full bg-[#4A1525] border border-[#C5A059]/50 flex items-center justify-center hover:bg-[#25D366] hover:border-transparent text-white transition-all transform hover:scale-110"
                aria-label="WhatsApp"
              >
                <MessageCircle size={15} />
              </a>
            </div>
          </div>
        </div>

        {/* Column 2: Quick Links */}
        <div>
          <h4 className="text-sm font-bold text-amber-200 uppercase tracking-wider mb-3.5 pb-1 border-b border-[#5C1B2E]">Quick Links</h4>
          <ul className="space-y-2 text-xs text-[#D8C4B0]">
            <li>
              <button onClick={() => setActiveTab('home')} className="hover:text-amber-300 transition-colors cursor-pointer">Home Page</button>
            </li>
            <li>
              <button onClick={() => { setActiveTab('shop'); if(setSelectedCategory) setSelectedCategory('all'); }} className="hover:text-amber-300 transition-colors cursor-pointer">All Jewellery Collection</button>
            </li>
            <li>
              <button onClick={() => setActiveTab('wishlist')} className="hover:text-amber-300 transition-colors cursor-pointer">My Wishlist</button>
            </li>
            <li>
              <button onClick={() => setActiveTab('cart')} className="hover:text-amber-300 transition-colors cursor-pointer">View Cart & Checkout</button>
            </li>
            <li>
              <button onClick={() => setActiveTab('account')} className="hover:text-amber-300 transition-colors cursor-pointer">My Account & Orders</button>
            </li>
            <li>
              <button onClick={() => setActiveTab('about')} className="hover:text-amber-300 transition-colors cursor-pointer">About House of Mahi</button>
            </li>
          </ul>
        </div>

        {/* Column 3: Customer Care & Policies */}
        <div>
          <h4 className="text-sm font-bold text-amber-200 uppercase tracking-wider mb-3.5 pb-1 border-b border-[#5C1B2E]">Customer Support</h4>
          <ul className="space-y-2 text-xs text-[#D8C4B0]">
            <li>
              <button onClick={() => setActiveTab('contact')} className="hover:text-amber-300 transition-colors cursor-pointer">Contact Support</button>
            </li>
            <li>
              <a href="https://wa.me/8801400031902" target="_blank" rel="noopener noreferrer" className="hover:text-amber-300 transition-colors">Order via WhatsApp</a>
            </li>
            <li>
              <span className="text-stone-400">Delivery Information (Cash on Delivery)</span>
            </li>
            <li>
              <span className="text-stone-400">Return & Exchange Policy</span>
            </li>
            <li>
              <span className="text-stone-400">Privacy & Terms</span>
            </li>
          </ul>
        </div>

        {/* Column 4: Contact Info & Address */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-amber-200 uppercase tracking-wider mb-3.5 pb-1 border-b border-[#5C1B2E]">Get in Touch</h4>
          
          <div className="flex items-start space-x-2.5 text-xs text-[#D8C4B0]">
            <MapPin size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-snug">
              E-76 Jalkuri Majpara, Jalkuri 1420, Siddirganj, Narayanganj, Bangladesh
            </p>
          </div>

          <div className="flex items-center space-x-2.5 text-xs text-[#D8C4B0]">
            <Phone size={15} className="text-amber-400 shrink-0" />
            <a href="tel:01400031902" className="hover:text-amber-300 font-semibold">
              01400-031902
            </a>
          </div>

          <div className="flex items-center space-x-2.5 text-xs text-[#D8C4B0]">
            <MessageCircle size={15} className="text-[#25D366] shrink-0" />
            <a href="https://wa.me/8801400031902" target="_blank" rel="noopener noreferrer" className="hover:text-amber-300 font-semibold">
              01400-031902 (WhatsApp)
            </a>
          </div>

          <div className="flex items-center space-x-2.5 text-xs text-[#D8C4B0]">
            <Mail size={15} className="text-amber-400 shrink-0" />
            <a href="mailto:mahimamahi456789@gmail.com" className="hover:text-amber-300 break-all">
              mahimamahi456789@gmail.com
            </a>
          </div>
        </div>

      </div>

      {/* 3. COPYRIGHT & BOTTOM BAR */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-10 pt-6 border-t border-[#5C1B2E] text-center text-xs text-[#A89685] flex flex-col sm:flex-row items-center justify-between gap-2">
        <p>© {new Date().getFullYear()} HOUSE of MAHI. All Rights Reserved.</p>
        <p className="text-[11px] text-amber-300/80">Premium Jewelry & Beauty Studio • Narayanganj, Bangladesh</p>
      </div>

    </footer>
  );
};
