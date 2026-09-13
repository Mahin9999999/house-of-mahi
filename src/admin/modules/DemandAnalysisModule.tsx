import React, { useState, useMemo } from 'react';
import { 
  Flame, 
  TrendingUp, 
  AlertOctagon, 
  ArrowUpRight, 
  ArrowDownRight, 
  Package, 
  Layers, 
  Filter, 
  ChevronRight, 
  ExternalLink,
  Zap,
  Clock,
  Sparkles,
  Search,
  ShoppingCart,
  Eye,
  Heart
} from 'lucide-react';
import { useAdminStore } from '../../store/useAdminStore';
import { AdminTab } from '../AdminLayout';
import { DashboardTimeFilter, RestockPriority, DemandLevel } from '../../types';

interface DemandAnalysisModuleProps {
  onNavigate: (tab: AdminTab) => void;
}

export const DemandAnalysisModule: React.FC<DemandAnalysisModuleProps> = ({ onNavigate }) => {
  const [timeFilter, setTimeFilter] = useState<DashboardTimeFilter>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeMatrixTab, setActiveMatrixTab] = useState<'all' | 'critical' | 'fast' | 'slow'>('all');

  const { getDemandIntelligence, categories } = useAdminStore();

  const demandData = useMemo(() => {
    return getDemandIntelligence(timeFilter, selectedCategory);
  }, [getDemandIntelligence, timeFilter, selectedCategory]);

  const {
    productDemandList,
    fastMovingProducts,
    slowMovingProducts,
    criticalRestockProducts,
    categoryDemandList,
    totalUnitsSold,
    topCategoryName
  } = demandData;

  // Search filtered products for the full matrix view
  const filteredProducts = useMemo(() => {
    let list = productDemandList;
    if (activeMatrixTab === 'critical') {
      list = criticalRestockProducts;
    } else if (activeMatrixTab === 'fast') {
      list = fastMovingProducts;
    } else if (activeMatrixTab === 'slow') {
      list = slowMovingProducts;
    }

    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase();
    return list.filter(
      (item) => 
        item.product.name.toLowerCase().includes(q) || 
        item.product.category?.toLowerCase().includes(q)
    );
  }, [productDemandList, criticalRestockProducts, fastMovingProducts, slowMovingProducts, activeMatrixTab, searchQuery]);

  const getDemandBadge = (level: DemandLevel) => {
    switch (level) {
      case 'VERY_HIGH':
        return 'bg-purple-100 text-purple-900 border-purple-300';
      case 'HIGH':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'MEDIUM':
        return 'bg-blue-100 text-blue-900 border-blue-300';
      case 'LOW':
        return 'bg-neutral-100 text-neutral-700 border-neutral-300';
    }
  };

  const getRestockBadge = (priority: RestockPriority) => {
    switch (priority) {
      case 'CRITICAL':
        return {
          bg: 'bg-red-100 text-red-900 border-red-300',
          label: 'Critical Restock',
          icon: <AlertOctagon size={12} className="text-red-600 inline mr-1" />
        };
      case 'MONITOR':
        return {
          bg: 'bg-amber-100 text-amber-900 border-amber-300',
          label: 'Monitor Stock',
          icon: <Clock size={12} className="text-amber-600 inline mr-1" />
        };
      case 'HEALTHY':
        return {
          bg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
          label: 'Optimal Supply',
          icon: <Zap size={12} className="text-emerald-600 inline mr-1" />
        };
      case 'SLOW_MOVING':
        return {
          bg: 'bg-slate-100 text-slate-800 border-slate-300',
          label: 'Slow Moving',
          icon: <ArrowDownRight size={12} className="text-slate-500 inline mr-1" />
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Demand Analysis Banner & Filtering Controls */}
      <div className="bg-gradient-to-r from-[#2C1810] via-[#4A1525] to-[#1E112A] rounded-xl p-6 text-white shadow-md flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs uppercase tracking-wider font-mono text-amber-300 font-bold bg-amber-400/20 px-2.5 py-1 rounded-full border border-amber-300/30 flex items-center space-x-1">
              <Sparkles size={12} className="text-amber-300" />
              <span>Product & Category Demand Intelligence</span>
            </span>
            <span className="text-xs text-amber-200/80 font-mono">
              Live Order Velocity
            </span>
          </div>
          <h2 className="text-2xl font-serif font-bold mt-2 text-amber-100">
            Demand & Inventory Restock Intelligence
          </h2>
          <p className="text-amber-100/80 text-xs sm:text-sm mt-1 max-w-2xl">
            Analyze customer buying interest, identify fast-moving vs slow-moving inventory, and prioritize restock orders before items run out of stock.
          </p>
        </div>

        {/* Global Category & Time Filter */}
        <div className="flex flex-wrap items-center gap-2 bg-black/30 p-2 rounded-xl border border-white/10 self-stretch lg:self-auto">
          {/* Category Dropdown */}
          <div className="flex items-center space-x-1.5 bg-white/10 px-2.5 py-1.5 rounded-lg text-xs">
            <Filter size={13} className="text-amber-300 shrink-0" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent text-white focus:outline-none cursor-pointer text-xs font-semibold"
            >
              <option value="all" className="text-neutral-900">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name} className="text-neutral-900">
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Timeframe Buttons */}
          <div className="flex items-center space-x-1 bg-black/40 p-1 rounded-lg">
            {(['today', '7days', '30days', 'month', 'all'] as DashboardTimeFilter[]).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeFilter(tf)}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                  timeFilter === tf
                    ? 'bg-amber-400 text-[#4A1525] font-bold shadow-sm'
                    : 'text-amber-100/70 hover:text-white hover:bg-white/10'
                }`}
              >
                {tf === 'today' ? 'Today' : tf === '7days' ? '7D' : tf === '30days' ? '30D' : tf === 'month' ? 'Month' : 'All'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Demand Intelligence Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Units Ordered */}
        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-500 uppercase font-mono">Total Units Sold</span>
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShoppingCart size={20} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-neutral-900 font-serif">
              {totalUnitsSold.toLocaleString()}
            </span>
            <span className="text-xs text-blue-600 font-bold">Units</span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">Total customer purchase volume</p>
        </div>

        {/* Top Performing Category */}
        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-500 uppercase font-mono">Top Category</span>
            <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Layers size={20} />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-lg font-bold text-neutral-900 font-serif truncate block" title={topCategoryName}>
              {topCategoryName}
            </span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">Leading sales revenue category</p>
        </div>

        {/* Critical Restock Requirements */}
        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-500 uppercase font-mono">Restock Priority</span>
            <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <AlertOctagon size={20} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-red-600 font-serif">
              {criticalRestockProducts.length}
            </span>
            <span className="text-xs text-red-700 font-semibold">High Demand & Low Stock</span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">Items at risk of running out</p>
        </div>

        {/* Fast-Moving Items Count */}
        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-500 uppercase font-mono">Fast-Moving Items</span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Flame size={20} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-neutral-900 font-serif">
              {fastMovingProducts.length}
            </span>
            <span className="text-xs text-emerald-600 font-bold">Top Sellers</span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">High purchase velocity products</p>
        </div>
      </div>

      {/* Critical Restock Alert Card (High Demand + Low Stock) */}
      {criticalRestockProducts.length > 0 && (
        <div className="bg-red-50/90 border border-red-200 rounded-xl p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-red-600 text-white rounded-lg">
                <AlertOctagon size={20} />
              </div>
              <div>
                <h3 className="font-serif font-bold text-base text-red-950">
                  Critical Restock Required ({criticalRestockProducts.length} Items)
                </h3>
                <p className="text-xs text-red-800">
                  These products have high customer demand or sales frequency, but current stock is critical (≤ 5 units).
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('products')}
              className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1.5 shrink-0 self-start sm:self-auto"
            >
              <span>Restock Inventory</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
            {criticalRestockProducts.slice(0, 6).map((item) => (
              <div 
                key={item.product.id} 
                className="bg-white p-3.5 rounded-lg border border-red-200 shadow-2xs flex items-center justify-between gap-3"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <img 
                    src={item.product.image || 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&q=80&w=200'} 
                    alt={item.product.name} 
                    className="w-12 h-12 rounded object-cover border border-neutral-200 shrink-0" 
                  />
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-neutral-900 truncate">{item.product.name}</h4>
                    <span className="text-[11px] text-neutral-500">{item.product.category}</span>
                    <div className="text-[11px] font-mono font-bold text-red-600 mt-0.5">
                      Stock: {item.currentStock} units remaining
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[10px] uppercase font-mono text-neutral-400">Demand</div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-200">
                    {item.demandLevel}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fast-Moving vs Slow-Moving Inventory Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fast-Moving Products */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-serif font-bold text-base text-neutral-900 flex items-center space-x-2">
                <Flame className="text-amber-600" size={18} />
                <span>Fast-Moving Products (Top Demand)</span>
              </h3>
              <p className="text-xs text-neutral-500">Ranked by actual units sold and customer order momentum.</p>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
              High Velocity
            </span>
          </div>

          {fastMovingProducts.length === 0 ? (
            <div className="text-center py-8 text-neutral-400 text-xs">
              No sales data recorded yet.
            </div>
          ) : (
            <div className="space-y-3">
              {fastMovingProducts.slice(0, 5).map((item) => (
                <div 
                  key={item.product.id} 
                  className="flex items-center justify-between p-3 rounded-lg border border-neutral-100 hover:border-amber-200 hover:bg-amber-50/30 transition"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <img 
                      src={item.product.image || 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&q=80&w=200'} 
                      alt={item.product.name} 
                      className="w-11 h-11 rounded object-cover border border-neutral-200 shrink-0" 
                    />
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-neutral-900 truncate">{item.product.name}</h4>
                      <div className="text-[11px] text-neutral-500 font-mono">
                        ৳{item.product.price.toLocaleString()} • {item.product.category}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 text-right shrink-0">
                    <div>
                      <div className="text-xs font-mono font-bold text-neutral-900">
                        {item.unitsSold} sold
                      </div>
                      <div className="text-[10px] text-neutral-400 font-mono">
                        ৳{item.revenueGenerated.toLocaleString()} rev
                      </div>
                    </div>
                    <div className="hidden sm:block">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getDemandBadge(item.demandLevel)}`}>
                        {item.demandLevel}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Slow-Moving Products */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-serif font-bold text-base text-neutral-900 flex items-center space-x-2">
                <Package className="text-slate-600" size={18} />
                <span>Slow-Moving Products (Inventory Clearance)</span>
              </h3>
              <p className="text-xs text-neutral-500">Products with high stock count but low customer orders.</p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded">
              Clearance Target
            </span>
          </div>

          {slowMovingProducts.length === 0 ? (
            <div className="text-center py-8 text-neutral-400 text-xs">
              All active inventory is moving smoothly.
            </div>
          ) : (
            <div className="space-y-3">
              {slowMovingProducts.slice(0, 5).map((item) => (
                <div 
                  key={item.product.id} 
                  className="flex items-center justify-between p-3 rounded-lg border border-neutral-100 hover:border-slate-300 hover:bg-slate-50/50 transition"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <img 
                      src={item.product.image || 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&q=80&w=200'} 
                      alt={item.product.name} 
                      className="w-11 h-11 rounded object-cover border border-neutral-200 shrink-0" 
                    />
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-neutral-900 truncate">{item.product.name}</h4>
                      <div className="text-[11px] text-neutral-500 font-mono">
                        ৳{item.product.price.toLocaleString()} • {item.product.category}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs font-mono font-bold text-slate-700">
                      Stock: {item.currentStock} units
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {item.unitsSold} sales recorded
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Category-wise Demand Breakdown */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-serif font-bold text-base text-neutral-900 flex items-center space-x-2">
              <Layers className="text-[#4A1525]" size={18} />
              <span>Category Market Share & Demand Breakdown</span>
            </h3>
            <p className="text-xs text-neutral-500">Sales volume, total revenue generated, and market share per category.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50/80 text-neutral-500 uppercase font-mono text-[10px]">
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Catalog Size</th>
                <th className="py-2.5 px-3">Units Sold</th>
                <th className="py-2.5 px-3">Total Orders</th>
                <th className="py-2.5 px-3">Total Revenue</th>
                <th className="py-2.5 px-3">Market Share (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {categoryDemandList.map((cat) => (
                <tr key={cat.categoryId} className="hover:bg-neutral-50/80 transition">
                  <td className="py-3 px-3 font-bold text-neutral-900">
                    {cat.categoryName}
                  </td>
                  <td className="py-3 px-3 text-neutral-600 font-mono">
                    {cat.productCount} products
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-neutral-900">
                    {cat.unitsSold} units
                  </td>
                  <td className="py-3 px-3 font-mono text-neutral-700">
                    {cat.ordersCount} orders
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-neutral-900">
                    ৳{cat.revenue.toLocaleString()}
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-neutral-100 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-[#4A1525] h-full rounded-full" 
                          style={{ width: `${Math.min(100, Math.max(5, cat.marketSharePercentage))}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs font-bold text-neutral-800">
                        {cat.marketSharePercentage}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Complete Product Demand Matrix Table with Restock Actions */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-serif font-bold text-base text-neutral-900 flex items-center space-x-2">
              <TrendingUp className="text-[#4A1525]" size={18} />
              <span>Complete Product Demand Intelligence Matrix</span>
            </h3>
            <p className="text-xs text-neutral-500">Live demand level, restock priority indicator, and stock velocity.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-neutral-400" />
              <input
                type="text"
                placeholder="Search product..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 border border-neutral-300 rounded-lg text-xs focus:outline-none focus:border-[#4A1525] w-44"
              />
            </div>

            {/* Matrix Tabs */}
            <div className="flex items-center space-x-1 bg-neutral-100 p-1 rounded-lg text-xs font-semibold">
              <button
                onClick={() => setActiveMatrixTab('all')}
                className={`px-2.5 py-1 rounded transition ${activeMatrixTab === 'all' ? 'bg-white shadow-2xs font-bold text-neutral-900' : 'text-neutral-500 hover:text-neutral-900'}`}
              >
                All ({productDemandList.length})
              </button>
              <button
                onClick={() => setActiveMatrixTab('critical')}
                className={`px-2.5 py-1 rounded transition ${activeMatrixTab === 'critical' ? 'bg-red-600 text-white shadow-2xs font-bold' : 'text-red-600 hover:bg-red-50'}`}
              >
                Critical ({criticalRestockProducts.length})
              </button>
              <button
                onClick={() => setActiveMatrixTab('fast')}
                className={`px-2.5 py-1 rounded transition ${activeMatrixTab === 'fast' ? 'bg-amber-500 text-white shadow-2xs font-bold' : 'text-amber-700 hover:bg-amber-50'}`}
              >
                Fast Moving
              </button>
              <button
                onClick={() => setActiveMatrixTab('slow')}
                className={`px-2.5 py-1 rounded transition ${activeMatrixTab === 'slow' ? 'bg-slate-600 text-white shadow-2xs font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                Slow Moving
              </button>
            </div>
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="text-center py-8 text-neutral-400 text-xs">
            কোনো প্রোডাক্ট ম্যাচ করেনি (No products matched the filter).
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50/80 text-neutral-500 uppercase font-mono text-[10px]">
                  <th className="py-2.5 px-3">Product</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Current Stock</th>
                  <th className="py-2.5 px-3">Units Sold</th>
                  <th className="py-2.5 px-3">Revenue</th>
                  <th className="py-2.5 px-3">Demand Level</th>
                  <th className="py-2.5 px-3">Restock Priority</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredProducts.map((item) => {
                  const restockInfo = getRestockBadge(item.restockPriority);
                  return (
                    <tr key={item.product.id} className="hover:bg-neutral-50/80 transition">
                      <td className="py-3 px-3">
                        <div className="flex items-center space-x-3">
                          <img 
                            src={item.product.image || 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&q=80&w=200'} 
                            alt={item.product.name} 
                            className="w-10 h-10 rounded object-cover border border-neutral-200 shrink-0" 
                          />
                          <div>
                            <div className="font-bold text-neutral-900 line-clamp-1">{item.product.name}</div>
                            <div className="text-[10px] text-neutral-400 font-mono">৳{item.product.price.toLocaleString()}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-neutral-600 font-medium">
                        {item.product.category}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold">
                        <span className={item.currentStock === 0 ? 'text-red-600' : item.currentStock <= 5 ? 'text-orange-600' : 'text-emerald-700'}>
                          {item.currentStock} units
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-neutral-900">
                        {item.unitsSold}
                      </td>
                      <td className="py-3 px-3 font-mono font-semibold text-neutral-800">
                        ৳{item.revenueGenerated.toLocaleString()}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getDemandBadge(item.demandLevel)}`}>
                          {item.demandLevel}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center ${restockInfo.bg}`}>
                          {restockInfo.icon}
                          <span>{restockInfo.label}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => onNavigate('products')}
                          className="px-3 py-1 bg-neutral-100 hover:bg-[#4A1525] hover:text-white rounded text-[11px] font-bold transition inline-flex items-center space-x-1"
                        >
                          <span>Manage</span>
                          <ExternalLink size={11} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
