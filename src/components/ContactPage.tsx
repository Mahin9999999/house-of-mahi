import React from 'react';
import { PhoneCall, Mail, MapPin, MessageCircle, Facebook, Instagram, Youtube } from 'lucide-react';

const TikTokIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
  </svg>
);

export const ContactPage: React.FC = () => {
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8 animate-fade-in">
      
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-[#4A1525]">Contact Us</h1>
        <p className="text-xs sm:text-sm text-stone-600 max-w-lg mx-auto leading-relaxed">
          Have questions regarding jewelry, bridal sets, ring sizing, or custom orders? We're always here to assist you!
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 sm:gap-5">
        
        {/* WhatsApp & Call */}
        <a 
          href="https://wa.me/8801400031902"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white p-5 rounded-2xl border border-[#E8DFC2] flex items-start space-x-4 hover:border-[#4A1525] transition-all shadow-xs block group"
        >
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl shrink-0 group-hover:scale-105 transition-transform">
            <MessageCircle size={24} />
          </div>
          <div>
            <h4 className="font-bold text-sm text-stone-900">WhatsApp & Direct Call</h4>
            <p className="text-sm font-bold text-[#4A1525] mt-1">01400-031902</p>
            <p className="text-xs text-emerald-600 font-semibold mt-1">💬 Tap for Instant Chat / Order</p>
          </div>
        </a>

        {/* Email Address */}
        <a 
          href="mailto:mahimamahi456789@gmail.com"
          className="bg-white p-5 rounded-2xl border border-[#E8DFC2] flex items-start space-x-4 hover:border-[#4A1525] transition-all shadow-xs block group"
        >
          <div className="p-3 bg-[#FAF7F2] text-[#4A1525] rounded-xl shrink-0 group-hover:scale-105 transition-transform">
            <Mail size={24} />
          </div>
          <div>
            <h4 className="font-bold text-sm text-stone-900">Email Address</h4>
            <p className="text-xs text-stone-700 font-medium mt-1 break-all">mahimamahi456789@gmail.com</p>
            <p className="text-xs text-stone-500 mt-1">Send your inquiries anytime</p>
          </div>
        </a>

        {/* Studio & Address */}
        <div className="bg-white p-5 rounded-2xl border border-[#E8DFC2] flex items-start space-x-4 shadow-xs sm:col-span-2">
          <div className="p-3 bg-[#FAF7F2] text-[#4A1525] rounded-xl shrink-0">
            <MapPin size={24} />
          </div>
          <div>
            <h4 className="font-bold text-sm text-stone-900">Studio & Address</h4>
            <p className="text-xs sm:text-sm text-stone-700 font-medium mt-1">E-76 Jalkuri Majpara, Jalkuri 1420</p>
            <p className="text-xs text-stone-500 mt-0.5">Siddirganj, Narayanganj, Bangladesh</p>
          </div>
        </div>

        {/* Social Profiles Grid */}
        <div className="bg-[#4A1525] text-white p-5 sm:p-6 rounded-2xl border border-[#6E2439] shadow-xs sm:col-span-2">
          <h4 className="text-xs sm:text-sm font-bold text-amber-200 uppercase tracking-wider mb-3">Official Social Channels & Messenger</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            <a 
              href="https://www.facebook.com/houseofmahi" 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-3 bg-[#5C1B2E] hover:bg-[#1877F2] rounded-xl flex items-center justify-center space-x-2 text-white transition-colors"
              title="Facebook"
            >
              <Facebook size={18} />
              <span className="text-xs font-semibold">Facebook</span>
            </a>
            <a 
              href="https://www.instagram.com/houseof_._mahi" 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-3 bg-[#5C1B2E] hover:bg-[#E4405F] rounded-xl flex items-center justify-center space-x-2 text-white transition-colors"
              title="Instagram"
            >
              <Instagram size={18} />
              <span className="text-xs font-semibold">Instagram</span>
            </a>
            <a 
              href="https://www.tiktok.com/@houseof_._mahi" 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-3 bg-[#5C1B2E] hover:bg-black rounded-xl flex items-center justify-center space-x-2 text-white transition-colors"
              title="TikTok"
            >
              <TikTokIcon className="w-4 h-4" />
              <span className="text-xs font-semibold">TikTok</span>
            </a>
            <a 
              href="https://www.youtube.com/@mahimamahi9498" 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-3 bg-[#5C1B2E] hover:bg-[#FF0000] rounded-xl flex items-center justify-center space-x-2 text-white transition-colors"
              title="YouTube"
            >
              <Youtube size={18} />
              <span className="text-xs font-semibold">YouTube</span>
            </a>
          </div>
        </div>

      </div>

    </main>
  );
};
