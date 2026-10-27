import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, ShoppingBag } from 'lucide-react';
import { useAdminStore } from '../store/useAdminStore';
import { HeroBanner } from '../types';

interface HeroSliderProps {
  onShopClick: () => void;
}

export const HeroSlider: React.FC<HeroSliderProps> = ({ onShopClick }) => {
  const { heroBanners } = useAdminStore();

  // Filter only active and schedule-valid hero banners from Firestore
  const activeBanners = useMemo(() => {
    if (!heroBanners || heroBanners.length === 0) return [];

    const now = new Date();

    return heroBanners
      .filter((banner: HeroBanner) => {
        if (!banner.isActive) return false;

        // Verify schedule if startDate/endDate are defined
        if (banner.startDate) {
          const start = new Date(banner.startDate);
          if (!isNaN(start.getTime()) && now < start) return false;
        }

        if (banner.endDate) {
          const end = new Date(banner.endDate);
          if (!isNaN(end.getTime()) && now > end) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const orderA = a.sortOrder ?? a.displayOrder ?? 0;
        const orderB = b.sortOrder ?? b.displayOrder ?? 0;
        return orderA - orderB;
      });
  }, [heroBanners]);

  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (activeBanners.length === 0) {
      setCurrentSlide(0);
    } else if (currentSlide >= activeBanners.length) {
      setCurrentSlide(0);
    }
  }, [activeBanners.length, currentSlide]);

  // Autoplay slider when multiple active slides exist
  useEffect(() => {
    if (activeBanners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % activeBanners.length);
    }, 5500);
    return () => clearInterval(timer);
  }, [activeBanners.length]);

  const nextSlide = () => {
    if (activeBanners.length <= 1) return;
    setCurrentSlide((prev) => (prev + 1) % activeBanners.length);
  };

  const prevSlide = () => {
    if (activeBanners.length <= 1) return;
    setCurrentSlide((prev) => (prev - 1 + activeBanners.length) % activeBanners.length);
  };

  // If no active banners are present in Firestore, hide the hero section cleanly (no demo/mock fallbacks)
  if (activeBanners.length === 0) {
    return null;
  }

  const slide = activeBanners[currentSlide] || activeBanners[0];
  if (!slide) {
    return null;
  }

  const handleCtaClick = (url?: string) => {
    if (!url || url === '#' || url === '/#products' || url === 'shop') {
      onShopClick();
    } else if (url.startsWith('http://') || url.startsWith('https://')) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      onShopClick();
    }
  };

  return (
    <section className="relative bg-[#FBF8F3] overflow-hidden border-b border-[#EFE8DE]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 md:py-14">
        
        {/* Main Card Container */}
        <div className="relative rounded-2xl sm:rounded-3xl bg-[#FAF5EE] border border-[#E8DFC2] p-5 sm:p-8 md:p-12 shadow-xs overflow-hidden">
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-center">
            
            {/* Left Column: Text & Content */}
            <div className={`md:col-span-7 z-10 flex flex-col ${
              slide.textAlignment === 'center'
                ? 'items-center text-center'
                : slide.textAlignment === 'right'
                ? 'items-center md:items-end text-center md:text-right'
                : 'items-center md:items-start text-center md:text-left'
            }`}>
              
              {/* Badge / Tagline */}
              {slide.tagline && (
                <div className="inline-flex items-center space-x-1.5 bg-[#FFF2D6] text-[#8C6A2E] px-3.5 py-1 rounded-full text-[11px] sm:text-xs font-semibold mb-3 sm:mb-4 border border-[#E5D2A8]">
                  <Sparkles size={13} className="text-[#C5A059]" />
                  <span className="font-montserrat uppercase tracking-wider">{slide.tagline}</span>
                </div>
              )}

              {/* Title */}
              <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-[#4A1525] leading-[1.15] mb-2 sm:mb-3">
                {slide.title}
              </h1>

              {/* Subtitle / Description */}
              {(slide.subtitle || slide.description) && (
                <p className="text-xs sm:text-base text-stone-600 mb-5 sm:mb-7 max-w-lg leading-relaxed font-light">
                  {slide.subtitle || slide.description}
                </p>
              )}

              {/* CTA Buttons */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                <button
                  onClick={() => handleCtaClick(slide.buttonUrl)}
                  className="bg-[#4A1525] hover:bg-[#360F1B] text-amber-200 hover:text-amber-100 font-bold px-6 sm:px-8 py-2.5 sm:py-3 rounded-full text-xs sm:text-sm tracking-wider uppercase transition-all shadow-md active:scale-95 flex items-center space-x-2 cursor-pointer"
                >
                  <span>{slide.buttonText || 'SHOP NOW'}</span>
                  <ShoppingBag size={15} />
                </button>

                {slide.secondaryButtonText && slide.secondaryButtonUrl ? (
                  <button
                    onClick={() => handleCtaClick(slide.secondaryButtonUrl)}
                    className="bg-white hover:bg-amber-50 text-[#4A1525] border border-[#C5A059]/70 font-semibold px-4 sm:px-6 py-2.5 sm:py-3 rounded-full text-xs sm:text-sm transition-colors shadow-xs active:scale-95 cursor-pointer inline-flex items-center space-x-1.5"
                  >
                    <span>{slide.secondaryButtonText}</span>
                  </button>
                ) : (
                  <a
                    href="https://wa.me/8801400031902"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white hover:bg-amber-50 text-[#4A1525] border border-[#C5A059]/70 font-semibold px-4 sm:px-6 py-2.5 sm:py-3 rounded-full text-xs sm:text-sm transition-colors shadow-xs active:scale-95 cursor-pointer inline-flex items-center space-x-1.5"
                  >
                    <span>Order on WhatsApp</span>
                  </a>
                )}
              </div>
            </div>

            {/* Right Column: Featured Responsive Image with In-Frame Navigation Controls */}
            <div className="md:col-span-5 relative w-full flex items-center justify-center">
              <div className="relative w-full max-w-[320px] sm:max-w-md aspect-4/3 sm:aspect-square rounded-2xl overflow-hidden shadow-lg border-2 border-white/80 group bg-neutral-100">
                <picture className="w-full h-full">
                  {slide.mobileImage && (
                    <source media="(max-width: 640px)" srcSet={slide.mobileImage} />
                  )}
                  <img
                    src={slide.desktopImage || slide.mobileImage || ''}
                    alt={slide.imageAlt || `${slide.title} House of Mahi`}
                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out"
                    referrerPolicy="no-referrer"
                    loading="eager"
                    fetchPriority={currentSlide === 0 ? 'high' : 'auto'}
                  />
                </picture>
                <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent pointer-events-none"></div>

                {/* Floating Arrows inside/over image corners for seamless mobile design */}
                {activeBanners.length > 1 && (
                  <>
                    <button
                      onClick={prevSlide}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/90 backdrop-blur-xs text-[#4A1525] flex items-center justify-center shadow-md hover:bg-white active:scale-90 transition-all cursor-pointer z-20"
                      aria-label="Previous Slide"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <button
                      onClick={nextSlide}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/90 backdrop-blur-xs text-[#4A1525] flex items-center justify-center shadow-md hover:bg-white active:scale-90 transition-all cursor-pointer z-20"
                      aria-label="Next Slide"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </>
                )}
              </div>
            </div>

          </div>

          {/* Slider Pagination Dots */}
          {activeBanners.length > 1 && (
            <div className="flex justify-center items-center space-x-2 mt-5 sm:mt-6">
              {activeBanners.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                    currentSlide === idx ? 'w-7 bg-[#4A1525]' : 'w-2 bg-[#D1C2A5] hover:bg-[#A89675]'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          )}

        </div>

      </div>
    </section>
  );
};
