import React from 'react';
import { Home, Search } from 'lucide-react';

interface NotFoundPageProps {
  onGoHome: () => void;
  onGoShop: () => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ onGoHome, onGoShop }) => {
  return (
    <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="text-7xl font-serif font-bold text-[#4A1525]">404</div>
        <h1 className="text-2xl font-serif font-bold text-stone-900">Page Not Found</h1>
        <p className="text-sm text-stone-600">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button
            onClick={onGoHome}
            className="px-5 py-2.5 rounded-xl bg-[#800020] text-white text-xs font-semibold hover:bg-[#600018] transition-colors flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" /> Go Home
          </button>
          <button
            onClick={onGoShop}
            className="px-5 py-2.5 rounded-xl border border-stone-300 text-stone-700 text-xs font-semibold hover:bg-stone-50 transition-colors flex items-center justify-center gap-2"
          >
            <Search className="w-4 h-4" /> Browse Shop
          </button>
        </div>
      </div>
    </div>
  );
};
