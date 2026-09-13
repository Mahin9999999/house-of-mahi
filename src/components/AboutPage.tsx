import React from 'react';
import { Crown, Sparkles, Heart, ShieldCheck, Award } from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      
      {/* Hero */}
      <div className="bg-[#FAF5EF] rounded-2xl p-8 border border-[#EBE1D4] text-center space-y-3">
        <div className="w-12 h-12 bg-[#4A1525] text-amber-300 rounded-full flex items-center justify-center font-serif text-2xl font-bold mx-auto">
          M
        </div>
        <h1 className="text-3xl font-serif font-bold text-[#4A1525]">About houseofmahi</h1>
        <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
          Crafting timeless elegance and celebratory artificial & semi-precious jewelry for women across Bangladesh since 2021.
        </p>
      </div>

      {/* Story Grid */}
      <div className="grid md:grid-cols-2 gap-6 items-center">
        <div className="space-y-3 text-xs sm:text-sm text-slate-700 leading-relaxed">
          <h2 className="text-xl font-serif font-bold text-[#4A1525]">Our Philosophy</h2>
          <p>
            At <strong>houseofmahi</strong>, we believe every piece of jewelry carries a emotion, a story, and a touch of royal heritage. Our collections combine traditional Bangladeshi and Mughal artistry with modern aesthetics.
          </p>
          <p>
            From handcrafted Kundan choker sets and delicate pearl jhumkas to sparkling CZ stone rings and embroidered silk potli bags, every item is curated with supreme attention to durability, luster, and design perfection.
          </p>
        </div>

        <div className="aspect-4/3 rounded-2xl overflow-hidden shadow-md border-2 border-white">
          <img 
            src="https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&q=80&w=800" 
            alt="Jewelry Artistry" 
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Trust Pillars */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E8DFC2] text-center space-y-2">
          <Crown size={28} className="mx-auto text-[#4A1525]" />
          <h3 className="font-serif font-bold text-sm text-slate-900">Authentic Designs</h3>
          <p className="text-xs text-slate-500">Exquisite craftsmanship and premium gold polish finish.</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E8DFC2] text-center space-y-2">
          <Heart size={28} className="mx-auto text-[#4A1525]" />
          <h3 className="font-serif font-bold text-sm text-slate-900">Loved by 10,000+</h3>
          <p className="text-xs text-slate-500">Happy customers across Dhaka, Chittagong, and all 64 districts.</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E8DFC2] text-center space-y-2">
          <ShieldCheck size={28} className="mx-auto text-[#4A1525]" />
          <h3 className="font-serif font-bold text-sm text-slate-900">100% Satisfaction</h3>
          <p className="text-xs text-slate-500">Inspected before dispatch with cash on delivery guarantee.</p>
        </div>
      </div>

    </main>
  );
};
