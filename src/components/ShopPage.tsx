import React, { useState, useMemo } from 'react';
import { SlidersHorizontal, ArrowUpDown, X, Search, ChevronRight, Sparkles, ShieldCheck, Truck } from 'lucide-react';
import { Product } from '../types';
import { ProductCard } from './ProductCard';
import { useAdminStore } from '../store/useAdminStore';

interface ShopPageProps {
  products: Product[];
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  wishlist: string[];
  onToggleWishlist: (id: string) => void;
  onAddToCart: (p: Product) => void;
  onBuyNow: (p: Product) => void;
  onQuickView: (p: Product) => void;
}

export const ShopPage: React.FC<ShopPageProps> = ({
  products,
  selectedCategory,
  setSelectedCategory,
  searchQuery,
  setSearchQuery,
  wishlist,
  onToggleWishlist,
  onAddToCart,
  onBuyNow,
  onQuickView
}) => {
  const [sortBy, setSortBy] = useState<'featured' | 'low-high' | 'high-low' | 'rating'>('featured');
  const categories = useAdminStore((state) => state.categories);

  // Top level categories (no parentCategory)
  const topCategories = useMemo(() => {
    return categories
      .filter(c => !c.parentCategory)
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  }, [categories]);

  // Determine current active top category and active subcategory
  const activeCategoryObj = useMemo(() => {
    return categories.find(c => c.slug === selectedCategory || c.id === selectedCategory);
  }, [categories, selectedCategory]);

  const currentTopCat = useMemo(() => {
    if (!activeCategoryObj) return null;
    if (!activeCategoryObj.parentCategory) return activeCategoryObj;
    return categories.find(c => c.slug === activeCategoryObj.parentCategory || c.id === activeCategoryObj.parentCategory) || null;
  }, [categories, activeCategoryObj]);

  // Subcategories for the current top category
  const currentSubcategories = useMemo(() => {
    if (!currentTopCat) return [];
    return categories
      .filter(c => c.parentCategory === currentTopCat.slug || c.parentCategory === currentTopCat.id)
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  }, [categories, currentTopCat]);

  const filteredAndSortedProducts = useMemo(() => {
    let list = products.filter((p) => {
      // If 'all', match everything
      let matchesCat = selectedCategory === 'all' || !selectedCategory;

      if (!matchesCat) {
        // If current selection is a top category, match products in this category OR any of its subcategories
        if (currentTopCat && (selectedCategory === currentTopCat.slug || selectedCategory === currentTopCat.id)) {
          const validSlugsOrIds = [
            currentTopCat.slug,
            currentTopCat.id,
            ...currentSubcategories.map(s => s.slug),
            ...currentSubcategories.map(s => s.id)
          ].filter(Boolean);
          
          matchesCat = validSlugsOrIds.includes(p.category) || 
                       p.category === currentTopCat.slug ||
                       p.category === currentTopCat.id ||
                       (p.tags && p.tags.some(t => validSlugsOrIds.includes(t.toLowerCase())));
        } else {
          // Specific subcategory selected
          matchesCat = p.category === selectedCategory || 
                       (p.tags && p.tags.some(t => t.toLowerCase() === selectedCategory.toLowerCase()));
        }
      }

      const matchesSearch = 
        !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCat && matchesSearch;
    });

    if (sortBy === 'low-high') {
      list = [...list].sort((a, b) => a.price - b.price);
    } else if (sortBy === 'high-low') {
      list = [...list].sort((a, b) => b.price - a.price);
    } else if (sortBy === 'rating') {
      list = [...list].sort((a, b) => b.rating - a.rating);
    }

    return list;
  }, [products, selectedCategory, currentTopCat, currentSubcategories, searchQuery, sortBy]);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      
      {/* Header Bar with Semantic H1 for Search Engine Discovery */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EFE8DE] mb-6">
        <div>
          <h2 className="flex items-center flex-wrap gap-2 text-2xl font-serif font-bold text-[#4A1525]">
            <span>Shop Jewellery Collection</span>
            {currentTopCat && (
              <>
                <ChevronRight size={18} className="text-slate-400" />
                <span className="text-lg font-sans font-semibold text-slate-700">{currentTopCat.name}</span>
              </>
            )}
            {activeCategoryObj && activeCategoryObj.parentCategory && (
              <>
                <ChevronRight size={16} className="text-slate-400" />
                <span className="text-base font-sans font-medium text-amber-900">{activeCategoryObj.name}</span>
              </>
            )}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Showing 1–{filteredAndSortedProducts.length} of {products.length} designs
            {searchQuery && <span className="font-semibold text-[#4A1525]"> matching "{searchQuery}"</span>}
          </p>
        </div>

        {/* Sort & Filter Controls */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-white border border-[#E0D5C5] px-3 py-1.5 rounded-lg text-xs">
            <ArrowUpDown size={14} className="text-slate-500" />
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent focus:outline-hidden font-semibold text-slate-700 cursor-pointer"
              aria-label="Sort products"
            >
              <option value="featured">Featured</option>
              <option value="low-high">Price: Low to High</option>
              <option value="high-low">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
            </select>
          </div>
        </div>
      </div>

      {/* Top Categories Filter Pills */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none" role="navigation" aria-label="Category Filters">
        <button 
          onClick={() => setSelectedCategory('all')} 
          className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${selectedCategory === 'all' || !selectedCategory ? 'bg-[#4A1525] text-white shadow-xs' : 'bg-white text-slate-700 border border-[#E0D5C5] hover:bg-[#FAF7F2]'}`}
        >
          All Products
        </button>

        {topCategories.map((cat) => {
          const isTopSelected = currentTopCat && (currentTopCat.slug === cat.slug || currentTopCat.id === cat.id);
          return (
            <button 
              key={cat.id}
              onClick={() => setSelectedCategory(cat.slug || cat.id)} 
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${isTopSelected ? 'bg-[#4A1525] text-white shadow-xs' : 'bg-white text-slate-700 border border-[#E0D5C5] hover:bg-[#FAF7F2]'}`}
            >
              {cat.name}
            </button>
          );
        })}

        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')}
            className="flex items-center space-x-1 bg-amber-100 text-amber-900 px-3 py-1.5 rounded-full text-xs font-bold shrink-0 cursor-pointer"
          >
            <span>Clear Search</span>
            <X size={12} />
          </button>
        )}
      </div>

      {/* Subcategory Secondary Row (Visible when a Top Category is Active and has Subcategories) */}
      {currentTopCat && currentSubcategories.length > 0 && (
        <div className="flex items-center space-x-2 overflow-x-auto py-2.5 px-3 bg-amber-50/70 rounded-xl border border-amber-200/60 mb-6 mt-2 scrollbar-none animate-in fade-in" role="navigation" aria-label="Subcategory Filters">
          <span className="text-[11px] font-bold text-slate-500 shrink-0 uppercase tracking-wider">Subcategory:</span>
          
          <button
            onClick={() => setSelectedCategory(currentTopCat.slug || currentTopCat.id)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${selectedCategory === (currentTopCat.slug || currentTopCat.id) ? 'bg-[#4A1525] text-white' : 'bg-white text-slate-700 border border-amber-200 hover:bg-amber-100'}`}
          >
            All {currentTopCat.name}
          </button>

          {currentSubcategories.map((sub) => {
            const isSubSelected = selectedCategory === sub.slug || selectedCategory === sub.id;
            return (
              <button
                key={sub.id}
                onClick={() => setSelectedCategory(sub.slug || sub.id)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${isSubSelected ? 'bg-[#4A1525] text-white' : 'bg-white text-slate-700 border border-amber-200 hover:bg-amber-100'}`}
              >
                {sub.name} <span className="text-[10px] opacity-75">({sub.productCount || 0})</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="mb-6"></div>

      {/* Products Grid */}
      {filteredAndSortedProducts.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredAndSortedProducts.map((prod) => (
            <ProductCard 
              key={prod.id}
              product={prod}
              isWishlisted={wishlist.includes(prod.id)}
              onToggleWishlist={onToggleWishlist}
              onAddToCart={onAddToCart}
              onBuyNow={onBuyNow}
              onQuickView={onQuickView}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-2xl border border-[#EFE8DE] p-8 max-w-md mx-auto">
          <div className="w-16 h-16 bg-[#FAF7F2] text-[#4A1525] rounded-full flex items-center justify-center mx-auto mb-4">
            <Search size={28} />
          </div>
          <h3 className="font-serif font-bold text-lg text-slate-900">No products found</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            We couldn't find any jewelry matching your current category or search criteria.
          </p>
          <button 
            onClick={() => { setSelectedCategory('all'); setSearchQuery(''); }}
            className="bg-[#4A1525] text-white text-xs font-bold px-6 py-2.5 rounded-full cursor-pointer hover:bg-[#380e1b] transition-colors"
          >
            Reset All Filters
          </button>
        </div>
      )}

      {/* Informative Content & Jewellery Buying Guide (Content Optimization) */}
      <section className="mt-16 pt-10 border-t border-[#EFE8DE] space-y-6 bg-[#FAF7F2]/60 rounded-2xl p-6 sm:p-8 border border-[#E9DFD1]">
        <div className="max-w-4xl space-y-2">
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#4A1525]">
            Curated Jewellery & Accessories Collection in Bangladesh
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Welcome to House of Mahi, your premier destination for bridal and celebratory semi-precious jewellery across Bangladesh. From traditional Mughal Kundan choker sets and Meenakari jhumkas to sparkling CZ rings and handcrafted silk potli bags, every piece is curated to offer lasting brilliance and festive elegance.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white p-5 rounded-xl border border-[#E8DFC2] shadow-xs space-y-2">
            <div className="flex items-center space-x-2 text-[#4A1525]">
              <Sparkles size={18} />
              <h3 className="font-serif font-bold text-sm text-[#4A1525]">Artisanal Heritage</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Carefully designed with high-grade micro gold polish, filigree detailing, and tarnish-resistant protective coating for dependable wear.
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-[#E8DFC2] shadow-xs space-y-2">
            <div className="flex items-center space-x-2 text-[#4A1525]">
              <Truck size={18} />
              <h3 className="font-serif font-bold text-sm text-[#4A1525]">Cash on Delivery</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Fast and secure doorstep delivery across Dhaka, Chittagong, Sylhet, and all 64 districts with full cash on delivery convenience.
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-[#E8DFC2] shadow-xs space-y-2">
            <div className="flex items-center space-x-2 text-[#4A1525]">
              <ShieldCheck size={18} />
              <h3 className="font-serif font-bold text-sm text-[#4A1525]">Pre-Dispatch Inspection</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Every shipment undergoes strict quality control and is packaged in protective cushioned boxing to ensure safe arrival.
            </p>
          </div>
        </div>
      </section>

    </main>
  );
};
