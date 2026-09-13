import React, { useState, useMemo } from 'react';
import { 
  DollarSign, 
  ShoppingBag, 
  AlertTriangle, 
  PackageX, 
  PackageCheck, 
  Users, 
  Calendar, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  Truck, 
  XCircle, 
  ChevronRight, 
  ExternalLink,
  ArrowRight,
  ShieldAlert,
  Layers
} from 'lucide-react';
import { useAdminStore } from '../../store/useAdminStore';
import { AdminTab } from '../AdminLayout';
import { DashboardTimeFilter } from '../../types';

interface DashboardModuleProps {
  onNavigate: (tab: AdminTab) => void;
}

export const DashboardModule: React.FC<DashboardModuleProps> = ({ onNavigate }) => {
  const [timeFilter, setTimeFilter] = useState<DashboardTimeFilter>('all');
  const { 
    getDashboardStoreHealthMetrics, 
    orders, 
    products, 
    updateOrderStatus 
  } = useAdminStore();

  const metrics = useMemo(() => {
    return getDashboardStoreHealthMetrics(timeFilter);
  }, [getDashboardStoreHealthMetrics, timeFilter]);

  // Filter actual low-stock (1 to threshold) and out-of-stock (0 or !inStock) products
  const lowStockItems = useMemo(() => {
    return products.filter(
      (p) => p.stockQuantity !== undefined && p.stockQuantity <= metrics.lowStockThreshold && p.stockQuantity > 0
    );
  }, [products, metrics.lowStockThreshold]);

  const outOfStockItems = useMemo(() => {
    return products.filter(
      (p) => (p.stockQuantity !== undefined && p.stockQuantity === 0) || !p.inStock
    );
  }, [products]);

  const recentOrders = useMemo(() => {
    return orders.slice(0, 6);
  }, [orders]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Confirmed':
        return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'Processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Shipped':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'Delivered':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Cancelled':
      case 'Refunded':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-neutral-100 text-neutral-800 border-neutral-200';
    }
  };

  const getTimeFilterLabel = (filter: DashboardTimeFilter) => {
    switch (filter) {
      case 'today': return 'Today';
      case '7days': return 'Last 7 Days';
      case '30days': return 'Last 30 Days';
      case 'month': return 'This Month';
      case 'all': return 'All Time';
    }
  };

  // Comprehensive date parser for diverse Firestore order timestamp formats
  const parseOrderDate = (rawDate: any): Date | null => {
    if (!rawDate) return null;
    if (typeof rawDate === 'object' && typeof rawDate.toDate === 'function') {
      return rawDate.toDate();
    }
    if (typeof rawDate === 'object' && typeof rawDate.seconds === 'number') {
      return new Date(rawDate.seconds * 1000);
    }
    if (typeof rawDate === 'number') {
      return new Date(rawDate);
    }
    if (typeof rawDate === 'string') {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) return d;
    }
    return null;
  };

  // Live calculation of Sales Revenue Timeline directly responsive to real-time `orders` and `timeFilter`
  const salesTimelineData = useMemo(() => {
    const now = new Date();

    // Determine valid, non-cancelled/non-refunded revenue orders
    const validOrders = orders.filter(
      (o) => o.status !== 'Cancelled' && o.status !== 'Refunded'
    );

    interface Bucket {
      key: string;
      label: string;
      dateRangeText: string;
      start: Date;
      end: Date;
      sales: number;
      orders: number;
    }

    const buckets: Bucket[] = [];

    if (timeFilter === 'today') {
      // 6 time blocks across the day: 12am-4am, 4am-8am, 8am-12pm, 12pm-4pm, 4pm-8pm, 8pm-12am
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const hours = [0, 4, 8, 12, 16, 20];
      hours.forEach((h, idx) => {
        const slotStart = new Date(startOfDay);
        slotStart.setHours(h);
        const slotEnd = new Date(startOfDay);
        slotEnd.setHours(h + 4, 0, 0, 0);

        const formatHour = (hour: number) => {
          const ampm = hour >= 12 ? 'PM' : 'AM';
          const hr = hour % 12 === 0 ? 12 : hour % 12;
          return `${hr} ${ampm}`;
        };

        const label = formatHour(h);
        const dateRangeText = `${formatHour(h)} - ${formatHour((h + 4) % 24)}`;
        buckets.push({
          key: `today_${idx}`,
          label,
          dateRangeText,
          start: slotStart,
          end: slotEnd,
          sales: 0,
          orders: 0
        });
      });
    } else if (timeFilter === '7days') {
      // Last 7 days
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
        const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
        const label = i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' });
        const dateRangeText = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        buckets.push({
          key: start.toISOString().split('T')[0],
          label,
          dateRangeText,
          start,
          end,
          sales: 0,
          orders: 0
        });
      }
    } else if (timeFilter === 'month') {
      // Current Month grouped into 5-6 segments
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      const step = Math.ceil(daysInMonth / 6);

      for (let dayStart = 1; dayStart <= daysInMonth; dayStart += step) {
        const dayEnd = Math.min(dayStart + step - 1, daysInMonth);
        const start = new Date(currentYear, currentMonth, dayStart, 0, 0, 0);
        const end = new Date(currentYear, currentMonth, dayEnd, 23, 59, 59, 999);
        const monthName = start.toLocaleDateString('en-US', { month: 'short' });
        const label = `${monthName} ${dayStart}-${dayEnd}`;
        const dateRangeText = `${monthName} ${dayStart} - ${monthName} ${dayEnd}, ${currentYear}`;
        buckets.push({
          key: `m_${dayStart}_${dayEnd}`,
          label,
          dateRangeText,
          start,
          end,
          sales: 0,
          orders: 0
        });
      }
    } else if (timeFilter === '30days') {
      // Last 30 days grouped into 6 5-day periods
      for (let i = 5; i >= 0; i--) {
        const dayOffsetStart = i * 5 + 4;
        const dayOffsetEnd = i * 5;
        const dStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOffsetStart, 0, 0, 0);
        const dEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOffsetEnd, 23, 59, 59, 999);
        const label = `${dStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        const dateRangeText = `${dStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${dEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        buckets.push({
          key: `30d_${i}`,
          label,
          dateRangeText,
          start: dStart,
          end: dEnd,
          sales: 0,
          orders: 0
        });
      }
    } else {
      // 'all' time: 6 chronological monthly buckets ending in the current month
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const start = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0);
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
        const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        const dateRangeText = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        buckets.push({
          key: `all_${d.getFullYear()}_${d.getMonth()}`,
          label,
          dateRangeText,
          start,
          end,
          sales: 0,
          orders: 0
        });
      }
    }

    // Accumulate orders into matched buckets
    validOrders.forEach((order) => {
      const orderDate = parseOrderDate(order.date);
      if (!orderDate) return;
      const orderAmount = typeof order.total === 'number' ? order.total : 0;

      for (const bucket of buckets) {
        if (orderDate >= bucket.start && orderDate <= bucket.end) {
          bucket.sales += orderAmount;
          bucket.orders += 1;
          break;
        }
      }
    });

    const totalSales = buckets.reduce((sum, b) => sum + b.sales, 0);
    const totalOrdersCount = buckets.reduce((sum, b) => sum + b.orders, 0);
    const maxSalesVal = Math.max(...buckets.map((b) => b.sales), 1000);

    return {
      buckets,
      totalSales,
      totalOrdersCount,
      maxSales: maxSalesVal,
      hasData: totalSales > 0 || totalOrdersCount > 0
    };
  }, [orders, timeFilter]);

  return (
    <div className="space-y-6">
      {/* Top Banner Overview with Real-Time Store Health & Time Filter Selector */}
      <div className="bg-gradient-to-r from-[#4A1525] to-[#6B1228] rounded-xl p-6 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs uppercase tracking-wider font-mono text-amber-300 font-bold bg-amber-400/20 px-2.5 py-1 rounded-full border border-amber-300/30">
              Live Business Health Command
            </span>
            <span className="text-xs text-amber-200/80 font-mono">
              Real-time Firestore Synchronized
            </span>
          </div>
          <h2 className="text-2xl font-serif font-bold mt-2 text-amber-100">
            HouseOfMahi Store Overview
          </h2>
          <p className="text-amber-100/80 text-xs sm:text-sm mt-1 max-w-xl">
            Realized sales revenue, order fulfillment pipeline, active customer counts, and real-time inventory health.
          </p>
        </div>

        {/* Time Window Filter Controls */}
        <div className="flex items-center space-x-1.5 bg-black/20 p-1.5 rounded-lg border border-white/10 self-stretch md:self-auto overflow-x-auto">
          {(['today', '7days', '30days', 'month', 'all'] as DashboardTimeFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setTimeFilter(f)}
              className={`px-3 py-1.5 rounded text-xs font-semibold whitespace-nowrap transition ${
                timeFilter === f 
                  ? 'bg-amber-400 text-[#4A1525] font-bold shadow-sm' 
                  : 'text-amber-100/70 hover:text-white hover:bg-white/10'
              }`}
            >
              {getTimeFilterLabel(f)}
            </button>
          ))}
        </div>
      </div>

      {/* Critical Operational Alerts Banner (if any) */}
      {(metrics.outOfStockCount > 0 || metrics.pendingOrders > 0 || metrics.lowStockCount > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {metrics.outOfStockCount > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex items-center justify-between text-red-900 shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-100 text-red-700 rounded-lg shrink-0">
                  <PackageX size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold font-serif">{metrics.outOfStockCount} Products Out of Stock</h4>
                  <p className="text-[11px] text-red-700">Customers cannot purchase these products.</p>
                </div>
              </div>
              <button
                onClick={() => onNavigate('products')}
                className="text-xs font-bold text-red-800 hover:text-red-950 underline shrink-0 ml-2"
              >
                Restock
              </button>
            </div>
          )}

          {metrics.pendingOrders > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-center justify-between text-amber-900 shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-amber-100 text-amber-700 rounded-lg shrink-0">
                  <Clock size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold font-serif">{metrics.pendingOrders} Pending Orders</h4>
                  <p className="text-[11px] text-amber-700">Awaiting your confirmation & dispatch.</p>
                </div>
              </div>
              <button
                onClick={() => onNavigate('orders')}
                className="text-xs font-bold text-amber-800 hover:text-amber-950 underline shrink-0 ml-2"
              >
                View
              </button>
            </div>
          )}

          {metrics.lowStockCount > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3.5 flex items-center justify-between text-orange-900 shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-100 text-orange-700 rounded-lg shrink-0">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold font-serif">{metrics.lowStockCount} Low Stock Alerts</h4>
                  <p className="text-[11px] text-orange-700">Stock count between 1 and 5 units.</p>
                </div>
              </div>
              <button
                onClick={() => onNavigate('products')}
                className="text-xs font-bold text-orange-800 hover:text-orange-950 underline shrink-0 ml-2"
              >
                Check
              </button>
            </div>
          )}
        </div>
      )}

      {/* Primary KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Realized Net Sales */}
        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-500 uppercase font-mono">Net Realized Sales</span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-neutral-900 font-serif">
              ৳{metrics.netSales.toLocaleString()}
            </span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">
            Excludes cancelled & refunded ({getTimeFilterLabel(timeFilter)})
          </p>
        </div>

        {/* Total Orders */}
        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-500 uppercase font-mono">Total Orders</span>
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-[#4A1525] flex items-center justify-center">
              <ShoppingBag size={20} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-neutral-900 font-serif">
              {metrics.totalOrders}
            </span>
            <span className="text-xs text-amber-700 font-medium">
              ({metrics.deliveredOrders} delivered)
            </span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">
            {metrics.pendingOrders} pending confirmation
          </p>
        </div>

        {/* Average Order Value (AOV) */}
        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-500 uppercase font-mono">Avg Order Value (AOV)</span>
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-neutral-900 font-serif">
              ৳{metrics.averageOrderValue.toLocaleString()}
            </span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">Per completed order basket</p>
        </div>

        {/* Unique Customers */}
        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-500 uppercase font-mono">Unique Customers</span>
            <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users size={20} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-neutral-900 font-serif">
              {metrics.totalCustomers}
            </span>
            <span className="text-xs text-purple-600 font-bold">Buyers</span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">Active customer profiles</p>
        </div>
      </div>

      {/* Store Catalog & Inventory Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-neutral-50 p-4 rounded-xl border border-neutral-200 text-xs">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-white rounded-lg border border-neutral-200 text-neutral-700 shadow-2xs">
            <Layers size={16} />
          </div>
          <div>
            <div className="text-neutral-400 text-[10px] uppercase font-mono font-bold">Total Catalog</div>
            <div className="font-bold text-neutral-900 text-sm font-serif">{metrics.totalCatalogProducts} Products</div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-700 shadow-2xs">
            <PackageCheck size={16} />
          </div>
          <div>
            <div className="text-emerald-600 text-[10px] uppercase font-mono font-bold">In-Stock Active</div>
            <div className="font-bold text-emerald-950 text-sm font-serif">{metrics.activeProductsCount} Products</div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="p-2 bg-amber-50 rounded-lg border border-amber-200 text-amber-700 shadow-2xs">
            <AlertTriangle size={16} />
          </div>
          <div>
            <div className="text-amber-700 text-[10px] uppercase font-mono font-bold">Low Stock (≤5)</div>
            <div className="font-bold text-amber-950 text-sm font-serif">{metrics.lowStockCount} Products</div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="p-2 bg-red-50 rounded-lg border border-red-200 text-red-700 shadow-2xs">
            <PackageX size={16} />
          </div>
          <div>
            <div className="text-red-700 text-[10px] uppercase font-mono font-bold">Out of Stock (0)</div>
            <div className="font-bold text-red-950 text-sm font-serif">{metrics.outOfStockCount} Products</div>
          </div>
        </div>
      </div>

      {/* Sales Velocity Timeline & Order Lifecycle Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales & Orders Timeline Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-neutral-200 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="font-serif font-bold text-base text-neutral-900 flex items-center space-x-2">
                  <TrendingUp className="text-[#4A1525]" size={18} />
                  <span>Sales Revenue Timeline</span>
                </h3>
                <p className="text-xs text-neutral-500">Revenue and order velocity over {getTimeFilterLabel(timeFilter).toLowerCase()}.</p>
              </div>
              <div className="flex items-center space-x-3 text-[11px] font-mono self-end sm:self-auto">
                <div className="flex items-center space-x-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#4A1525] inline-block"></span>
                  <span className="text-neutral-600">Sales (৳)</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-3 h-3 rounded-full bg-amber-400 inline-block"></span>
                  <span className="text-neutral-600">Orders</span>
                </div>
              </div>
            </div>

            {/* Clean Responsive Bar Timeline or Empty State */}
            {!salesTimelineData.hasData ? (
              <div className="h-48 flex flex-col items-center justify-center rounded-lg bg-neutral-50/70 border border-dashed border-neutral-200 p-4 text-center">
                <div className="p-2.5 bg-neutral-100 rounded-full text-neutral-400 mb-2">
                  <TrendingUp size={20} />
                </div>
                <p className="text-xs font-semibold text-neutral-700">No Sales Recorded in this Time Period</p>
                <p className="text-[11px] text-neutral-500 mt-0.5 max-w-sm">
                  Customer orders placed in {getTimeFilterLabel(timeFilter).toLowerCase()} will automatically populate this timeline in real time.
                </p>
              </div>
            ) : (
              <div className="h-48 flex items-end justify-between gap-2 pt-6 pb-2 px-1 sm:px-2 border-b border-neutral-100">
                {salesTimelineData.buckets.map((d, index) => {
                  const heightPercent = salesTimelineData.maxSales > 0 
                    ? Math.max(d.sales > 0 ? 12 : 4, Math.round((d.sales / salesTimelineData.maxSales) * 100)) 
                    : 4;
                  return (
                    <div key={d.key || index} className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end">
                      {/* Tooltip on hover */}
                      <div className="absolute -top-10 bg-neutral-900 text-white text-[10px] px-2.5 py-1 rounded shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-20 font-mono">
                        <span className="font-bold text-amber-300">৳{d.sales.toLocaleString()}</span>
                        <span className="text-neutral-300 ml-1">({d.orders} {d.orders === 1 ? 'order' : 'orders'})</span>
                        {d.dateRangeText && <div className="text-[9px] text-neutral-400">{d.dateRangeText}</div>}
                      </div>
                      <div className="w-full max-w-[36px] bg-neutral-100/80 rounded-t h-[130px] flex items-end overflow-hidden">
                        <div 
                          className={`w-full rounded-t transition-all duration-500 ${
                            d.sales > 0 
                              ? 'bg-gradient-to-t from-[#4A1525] to-[#7D1D36] group-hover:from-amber-600 group-hover:to-amber-500' 
                              : 'bg-neutral-200/60'
                          }`}
                          style={{ height: `${heightPercent}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-neutral-500 font-mono truncate w-full text-center" title={d.label}>
                        {d.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-3 flex justify-between items-center text-xs text-neutral-500">
            <span>Period Net Sales: <strong className="text-neutral-900 font-mono">৳{salesTimelineData.totalSales.toLocaleString()}</strong></span>
            <span>Total Orders: <strong className="text-neutral-900 font-mono">{salesTimelineData.totalOrdersCount}</strong></span>
          </div>
        </div>

        {/* Order Lifecycle Progress Pipeline */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-serif font-bold text-base text-neutral-900 mb-1">
              Order Fulfillment Pipeline
            </h3>
            <p className="text-xs text-neutral-500 mb-4">Live operational status of customer orders.</p>

            <div className="space-y-2.5">
              <div className="flex justify-between items-center p-2.5 rounded-lg bg-amber-50/80 border border-amber-200/60">
                <span className="text-xs font-bold text-amber-900 flex items-center space-x-2">
                  <Clock size={15} className="text-amber-600" />
                  <span>Pending Confirmation</span>
                </span>
                <span className="font-mono font-bold text-sm text-amber-900">{metrics.pendingOrders}</span>
              </div>

              <div className="flex justify-between items-center p-2.5 rounded-lg bg-cyan-50/80 border border-cyan-200/60">
                <span className="text-xs font-bold text-cyan-900 flex items-center space-x-2">
                  <CheckCircle2 size={15} className="text-cyan-600" />
                  <span>Confirmed</span>
                </span>
                <span className="font-mono font-bold text-sm text-cyan-900">{metrics.confirmedOrders}</span>
              </div>

              <div className="flex justify-between items-center p-2.5 rounded-lg bg-blue-50/80 border border-blue-200/60">
                <span className="text-xs font-bold text-blue-900 flex items-center space-x-2">
                  <TrendingUp size={15} className="text-blue-600" />
                  <span>Processing / Packed</span>
                </span>
                <span className="font-mono font-bold text-sm text-blue-900">{metrics.processingOrders}</span>
              </div>

              <div className="flex justify-between items-center p-2.5 rounded-lg bg-indigo-50/80 border border-indigo-200/60">
                <span className="text-xs font-bold text-indigo-900 flex items-center space-x-2">
                  <Truck size={15} className="text-indigo-600" />
                  <span>Shipped via Courier</span>
                </span>
                <span className="font-mono font-bold text-sm text-indigo-900">{metrics.shippedOrders}</span>
              </div>

              <div className="flex justify-between items-center p-2.5 rounded-lg bg-emerald-50/80 border border-emerald-200/60">
                <span className="text-xs font-bold text-emerald-900 flex items-center space-x-2">
                  <CheckCircle2 size={15} className="text-emerald-600" />
                  <span>Delivered Successfully</span>
                </span>
                <span className="font-mono font-bold text-sm text-emerald-900">{metrics.deliveredOrders}</span>
              </div>

              <div className="flex justify-between items-center p-2.5 rounded-lg bg-red-50/60 border border-red-200/40">
                <span className="text-xs font-bold text-red-900 flex items-center space-x-2">
                  <XCircle size={15} className="text-red-500" />
                  <span>Cancelled / Refunded</span>
                </span>
                <span className="font-mono font-bold text-sm text-red-800">{metrics.cancelledOrders + metrics.refundedOrders}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-neutral-100">
            <button
              onClick={() => onNavigate('orders')}
              className="w-full py-2 bg-[#4A1525] text-amber-200 rounded-lg text-xs font-bold hover:bg-[#6B1228] transition flex items-center justify-center space-x-2"
            >
              <span>Go to Orders Manager</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Low Stock & Out of Stock Inventory Alert Center */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-serif font-bold text-base text-neutral-900 flex items-center space-x-2">
              <ShieldAlert className="text-orange-600" size={18} />
              <span>Low Stock & Out of Stock Alert Center</span>
            </h3>
            <p className="text-xs text-neutral-500">
              Items that require urgent restocking to prevent lost sales.
            </p>
          </div>
          <button 
            onClick={() => onNavigate('products')}
            className="text-xs font-bold text-[#4A1525] hover:text-amber-700 flex items-center space-x-1"
          >
            <span>Manage All Inventory</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {lowStockItems.length === 0 && outOfStockItems.length === 0 ? (
          <div className="text-center py-8 bg-emerald-50/40 rounded-lg border border-emerald-100">
            <PackageCheck size={32} className="mx-auto text-emerald-600 mb-2" />
            <h4 className="text-xs font-bold text-emerald-900 font-serif">All Products Sufficiently Stocked</h4>
            <p className="text-[11px] text-emerald-700 mt-0.5">No products are currently low in stock or out of stock.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50/80 text-neutral-500 uppercase font-mono text-[10px]">
                  <th className="py-2.5 px-3">Product</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Price</th>
                  <th className="py-2.5 px-3">Current Stock</th>
                  <th className="py-2.5 px-3">Threshold</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {[...outOfStockItems, ...lowStockItems].slice(0, 8).map((p) => {
                  const isOutOfStock = (p.stockQuantity !== undefined && p.stockQuantity === 0) || !p.inStock;
                  return (
                    <tr key={p.id} className="hover:bg-neutral-50/80 transition">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center space-x-3">
                          <img 
                            src={p.image || 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&q=80&w=200'} 
                            alt={p.name} 
                            className="w-10 h-10 rounded object-cover border border-neutral-200 shrink-0" 
                          />
                          <div>
                            <div className="font-bold text-neutral-900 line-clamp-1">{p.name}</div>
                            <div className="text-[10px] text-neutral-400 font-mono">ID: {p.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-medium text-neutral-600">
                        {p.category}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-neutral-900">
                        ৳{p.price.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`font-mono font-bold text-sm ${isOutOfStock ? 'text-red-600' : 'text-orange-600'}`}>
                          {p.stockQuantity ?? 0} units
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-neutral-500">
                        ≤ {metrics.lowStockThreshold} units
                      </td>
                      <td className="py-2.5 px-3">
                        {isOutOfStock ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                            Out of Stock
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            Low Stock Alert
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => onNavigate('products')}
                          className="px-3 py-1 bg-neutral-100 hover:bg-[#4A1525] hover:text-white rounded text-[11px] font-bold transition flex items-center space-x-1 ml-auto"
                        >
                          <span>Update Stock</span>
                          <ExternalLink size={12} />
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

      {/* Recent Orders Section */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-serif font-bold text-base text-neutral-900">Recent Customer Orders</h3>
            <p className="text-xs text-neutral-500">Latest checkout activities from your website.</p>
          </div>
          <button 
            onClick={() => onNavigate('orders')}
            className="text-xs font-bold text-[#4A1525] hover:text-amber-700 flex items-center space-x-1"
          >
            <span>View All ({orders.length})</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {recentOrders.length === 0 ? (
          <div className="text-center py-8 text-neutral-500 text-xs">
            কোনো অর্ডার পাওয়া যায়নি (No customer orders placed yet).
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50/80 text-neutral-500 uppercase font-mono text-[10px]">
                  <th className="py-2.5 px-3">Order ID</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Contact & Address</th>
                  <th className="py-2.5 px-3">Items</th>
                  <th className="py-2.5 px-3">Total</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-neutral-50/80 transition">
                    <td className="py-3 px-3 font-mono font-bold text-neutral-900">
                      {order.orderNumber}
                      <div className="text-[10px] font-normal text-neutral-400">{order.date}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-neutral-800">{order.customer.name}</div>
                      <div className="text-[10px] text-neutral-500">{order.customer.email || 'No email'}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-mono text-neutral-700">{order.customer.phone}</div>
                      <div className="text-[10px] text-neutral-500 line-clamp-1">{order.customer.district}, {order.customer.address}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-neutral-700">{order.items?.length || 1} items</span>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-neutral-900">
                      ৳{order.total?.toLocaleString()}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <select
                        value={order.status}
                        onChange={(e) => updateOrderStatus(order.id, e.target.value as any)}
                        className="text-[11px] font-semibold border border-neutral-300 rounded px-2 py-1 bg-white hover:border-amber-400 focus:outline-none cursor-pointer"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Confirmed">Confirmed</option>
                        <option value="Processing">Processing</option>
                        <option value="Shipped">Shipped</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

