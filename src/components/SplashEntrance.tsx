import React, { useState, useEffect } from 'react';
import logoImg from '../assets/images/houseofmahi_logo_1786477060132.jpg';

interface SplashEntranceProps {
  onComplete?: () => void;
}

export const SplashEntrance: React.FC<SplashEntranceProps> = ({ onComplete }) => {
  // If user prefers reduced motion, skip splash entirely
  const prefersReducedMotion = typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const [isRendered, setIsRendered] = useState(!prefersReducedMotion);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion) {
      if (onComplete) onComplete();
      return;
    }

    // Phase 1: Entrance display for ~750ms
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, 750);

    // Phase 2: Fade-out transition completes in 220ms (total ~970ms lifecycle)
    const exitTimer = setTimeout(() => {
      setIsRendered(false);
      if (onComplete) onComplete();
    }, 970);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(exitTimer);
    };
  }, [prefersReducedMotion, onComplete]);

  if (!isRendered) return null;

  return (
    <div 
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#FFFDF9] transition-opacity duration-200 ease-out select-none pointer-events-none ${
        isFadingOut ? 'opacity-0' : 'opacity-100'
      }`}
      aria-hidden="true"
    >
      <div className="flex flex-col items-center justify-center text-center px-4">
        {/* Circular Gold & Maroon Logo Badge */}
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-[#C5A059] p-1 bg-white shadow-lg overflow-hidden mb-4 transform transition-all duration-500 ease-out animate-scale-up">
          <img 
            src={logoImg} 
            alt="House of Mahi" 
            className="w-full h-full object-cover rounded-full"
            loading="eager"
            onError={() => {
              // Failsafe: if image fails to load, expedite transition
              setIsFadingOut(true);
            }}
          />
        </div>

        {/* Brand Typography */}
        <div className="animate-fade-slide-up flex flex-col items-center">
          <div className="flex items-baseline space-x-1.5 justify-center">
            <span className="text-2xl sm:text-3xl font-cormorant font-bold tracking-tight text-[#4A1525] uppercase leading-none">
              HOUSE
            </span>
            <span className="text-base sm:text-xl font-playfair italic font-normal text-[#C5A059] lowercase leading-none">
              of
            </span>
            <span className="text-2xl sm:text-3xl font-cormorant font-bold tracking-tight text-[#4A1525] uppercase leading-none">
              MAHI
            </span>
          </div>

          <div className="w-12 h-px bg-gradient-to-r from-transparent via-[#C5A059] to-transparent my-2" />

          <p className="text-[8px] sm:text-[10px] text-[#8C6A2E] font-montserrat font-bold tracking-[0.28em] sm:tracking-[0.32em] uppercase">
            BEAUTY STUDIO & JEWELRY
          </p>
        </div>
      </div>
    </div>
  );
};
