import React from 'react';
import { Crown, ShieldCheck, Truck, RefreshCw, Headphones } from 'lucide-react';

export const FeatureBadges: React.FC = () => {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-2">
      <div className="bg-white rounded-xl border border-[#EFE8DE] p-4 grid grid-cols-2 md:grid-cols-5 gap-4 divide-y md:divide-y-0 md:divide-x divide-slate-100 shadow-xs">
        
        <div className="flex items-center space-x-3 p-1 sm:p-2">
          <div className="p-2.5 rounded-full bg-[#FAF7F2] text-[#4A1525] shrink-0">
            <Crown size={20} />
          </div>
          <div>
            <h4 className="font-bold text-xs text-[#2C221E]">Premium Quality</h4>
            <p className="text-[10px] text-slate-500">Finest craftsmanship</p>
          </div>
        </div>

        <div className="flex items-center space-x-3 p-1 sm:p-2 pt-3 md:pt-1">
          <div className="p-2.5 rounded-full bg-[#FAF7F2] text-[#4A1525] shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h4 className="font-bold text-xs text-[#2C221E]">Secure Payment</h4>
            <p className="text-[10px] text-slate-500">100% secure checkout</p>
          </div>
        </div>

        <div className="flex items-center space-x-3 p-1 sm:p-2 pt-3 md:pt-1">
          <div className="p-2.5 rounded-full bg-[#FAF7F2] text-[#4A1525] shrink-0">
            <Truck size={20} />
          </div>
          <div>
            <h4 className="font-bold text-xs text-[#2C221E]">Fast Delivery</h4>
            <p className="text-[10px] text-slate-500">Within 2-4 days</p>
          </div>
        </div>

        <div className="flex items-center space-x-3 p-1 sm:p-2 pt-3 md:pt-1">
          <div className="p-2.5 rounded-full bg-[#FAF7F2] text-[#4A1525] shrink-0">
            <RefreshCw size={20} />
          </div>
          <div>
            <h4 className="font-bold text-xs text-[#2C221E]">Easy Returns</h4>
            <p className="text-[10px] text-slate-500">Hassle free returns</p>
          </div>
        </div>

        <div className="flex items-center space-x-3 p-1 sm:p-2 pt-3 md:pt-1 col-span-2 md:col-span-1">
          <div className="p-2.5 rounded-full bg-[#FAF7F2] text-[#4A1525] shrink-0">
            <Headphones size={20} />
          </div>
          <div>
            <h4 className="font-bold text-xs text-[#2C221E]">24/7 Support</h4>
            <p className="text-[10px] text-slate-500">We're here to help</p>
          </div>
        </div>

      </div>
    </section>
  );
};
