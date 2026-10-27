import React from 'react';
import { Crown, Sparkles, Heart, ShieldCheck, Gem, Clock, Truck, PackageCheck, PhoneCall } from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10">
      
      {/* 1. Hero Header */}
      <section className="bg-[#FAF5EF] rounded-2xl p-8 sm:p-10 border border-[#EBE1D4] text-center space-y-4 shadow-xs">
        <div className="w-14 h-14 bg-[#4A1525] text-amber-300 rounded-full flex items-center justify-center font-serif text-2xl font-bold mx-auto shadow-md">
          M
        </div>
        <h1 className="text-2xl sm:text-4xl font-serif font-bold text-[#4A1525] tracking-tight">
          About House of Mahi
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Curating celebratory artificial & semi-precious jewellery, bangles, and fashion accessories for women across Bangladesh since 2021.
        </p>
      </section>

      {/* 2. Brand Story & Heritage */}
      <section className="grid md:grid-cols-2 gap-8 items-center">
        <div className="space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#4A1525]">
            Our Story & Philosophy
          </h2>
          <p>
            At <strong>House of Mahi</strong>, we believe every piece of jewellery carries an emotion, a memorable celebration, and a touch of festive elegance. Founded in 2021, our store was created to offer women in Bangladesh thoughtfully curated artificial and semi-precious jewellery that complements traditional attire as well as contemporary festive wear.
          </p>
          <p>
            From wedding ceremonies and Eid festivities to everyday social gatherings, our designs embrace classic motifs. Our catalog features traditional Kundan choker sets, handcrafted Meenakari pearl jhumkas, sparkling crystal and CZ rings, rose gold tone bangles, and embroidered party potli bags.
          </p>
          <p>
            Each item in our collection is selected with close attention to design aesthetic, decorative finish, and visual appeal, offering celebration-ready jewelry for brides and jewelry lovers nationwide.
          </p>
        </div>

        <div className="space-y-3">
          <div className="aspect-4/3 rounded-2xl overflow-hidden shadow-md border-2 border-white relative group">
            <img 
              src="https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&q=80&w=800" 
              alt="Handcrafted Festive Jewellery House of Mahi" 
              className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
              loading="lazy"
            />
          </div>
          <p className="text-[11px] text-slate-500 italic text-center">
            Celebratory jewellery designs curated for weddings and festive occasions.
          </p>
        </div>
      </section>

      {/* 3. Our Curated Collections */}
      <section className="bg-white rounded-2xl p-6 sm:p-8 border border-[#E8DFC2] shadow-xs space-y-6">
        <div className="max-w-2xl">
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#4A1525] mb-2">
            Our Curated Collections
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            We focus on festive and wedding fashion jewelry that brings versatility, vibrant colors, and classic charm to your wardrobe.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-[#FAF7F2] p-5 rounded-xl border border-[#EFE8DE] space-y-2.5">
            <Crown size={22} className="text-[#4A1525]" />
            <h3 className="font-serif font-bold text-sm text-slate-900">Necklaces & Bridal Chokers</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Traditional gold-plated bridal choker sets studded with stones and pearl drops, designed for Holud, weddings, and formal receptions.
            </p>
          </div>

          <div className="bg-[#FAF7F2] p-5 rounded-xl border border-[#EFE8DE] space-y-2.5">
            <Gem size={22} className="text-[#4A1525]" />
            <h3 className="font-serif font-bold text-sm text-slate-900">Earrings & Jhumkas</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Pearl drops, handcrafted Meenakari jhumkas, and hanging ear accessories featuring filigree work and colorful enamel accents.
            </p>
          </div>

          <div className="bg-[#FAF7F2] p-5 rounded-xl border border-[#EFE8DE] space-y-2.5">
            <Sparkles size={22} className="text-[#4A1525]" />
            <h3 className="font-serif font-bold text-sm text-slate-900">Rings, Bangles & Bags</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Adjustable crystal stone rings, rose gold tone bangle bracelets, and embroidered silk potli bags for party and wedding ensembles.
            </p>
          </div>
        </div>
      </section>

      {/* 4. General Jewellery Care Guidelines */}
      <section className="bg-[#FAF5EF]/70 rounded-2xl p-6 sm:p-8 border border-[#EBE1D4] space-y-5">
        <div className="max-w-2xl">
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#4A1525] mb-2">
            General Jewellery Care Guidelines
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Fashion and artificial jewellery benefits from gentle handling and thoughtful storage. Here are practical care recommendations:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm text-slate-700">
          <div className="flex items-start space-x-3 bg-white p-4 rounded-xl border border-[#E8DFC2]">
            <Clock size={20} className="text-[#4A1525] shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-slate-900 mb-1">Apply Perfumes & Lotions First</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Allow perfumes, body sprays, and makeup to dry completely before putting on your jewellery to help protect the surface finish.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 bg-white p-4 rounded-xl border border-[#E8DFC2]">
            <ShieldCheck size={20} className="text-[#4A1525] shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-slate-900 mb-1">Keep Away From Moisture</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Avoid wearing jewellery while washing hands, swimming, or in heavy rain. If damp, gently dry with a clean, soft cloth.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 bg-white p-4 rounded-xl border border-[#E8DFC2]">
            <Crown size={20} className="text-[#4A1525] shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-slate-900 mb-1">Store in Separate Pouches</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Store individual pieces in separate soft pouches or airtight zip-lock bags to minimize tangling, friction, and dust exposure.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 bg-white p-4 rounded-xl border border-[#E8DFC2]">
            <Sparkles size={20} className="text-[#4A1525] shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-slate-900 mb-1">Dry Cloth Wiping</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                After wearing, gently wipe metal surfaces with a dry microfiber cloth before storing to remove perspiration and oils.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Customer Service & Delivery Commitment */}
      <section className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#4A1525] text-center">
          Delivery & Customer Support
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 text-center max-w-xl mx-auto">
          Committed to reliable service and responsive communication for all our customers in Bangladesh.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="bg-white p-6 rounded-2xl border border-[#E8DFC2] text-center space-y-2.5 shadow-xs">
            <Truck size={28} className="mx-auto text-[#4A1525]" />
            <h3 className="font-serif font-bold text-sm text-slate-900">Cash on Delivery</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Doorstep delivery across Dhaka, Chittagong, Sylhet, and all 64 districts in Bangladesh with cash on delivery.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-[#E8DFC2] text-center space-y-2.5 shadow-xs">
            <PackageCheck size={28} className="mx-auto text-[#4A1525]" />
            <h3 className="font-serif font-bold text-sm text-slate-900">Protective Packaging</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Every order is packaged with protective cushioning to help ensure your jewellery arrives safely.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-[#E8DFC2] text-center space-y-2.5 shadow-xs">
            <PhoneCall size={28} className="mx-auto text-[#4A1525]" />
            <h3 className="font-serif font-bold text-sm text-slate-900">Direct Support</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Reach our customer support team via phone (01400-031902) or WhatsApp for order and sizing assistance.
            </p>
          </div>
        </div>
      </section>

    </main>
  );
};
