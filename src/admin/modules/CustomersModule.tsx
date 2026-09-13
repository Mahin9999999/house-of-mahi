import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Phone, 
  Mail, 
  MapPin, 
  ShoppingBag, 
  DollarSign, 
  Crown, 
  Calendar, 
  Eye, 
  X, 
  ShieldCheck, 
  ExternalLink,
  UserCheck,
  TrendingUp
} from 'lucide-react';
import { useAdminStore } from '../../store/useAdminStore';
import { UserProfile, Order } from '../../types';

interface CustomerViewData extends UserProfile {
  orderHistory?: Order[];
}

export const CustomersModule: React.FC = () => {
  const { orders } = useAdminStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [districtFilter, setDistrictFilter] = useState<string>('all');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerViewData | null>(null);

  // Derive customers dynamically from actual orders + persistent user profiles
  const customerMap: { [phoneOrEmail: string]: CustomerViewData } = {};

  orders.forEach((order) => {
    const key = order.customer.phone || order.customer.email || order.customer.name;
    if (!customerMap[key]) {
      customerMap[key] = {
        id: `cust-${key.replace(/\D/g, '') || Math.random().toString(36).substr(2, 6)}`,
        name: order.customer.name,
        phone: order.customer.phone,
        email: order.customer.email || '—',
        address: order.customer.address,
        district: order.customer.district || 'Dhaka',
        thana: order.customer.thana || 'Dhanmondi',
        totalOrders: 1,
        totalSpent: order.total,
        lastOrderDate: order.date,
        status: order.total >= 10000 ? 'vip' : 'active',
        orderHistory: [order]
      };
    } else {
      customerMap[key].totalOrders += 1;
      customerMap[key].totalSpent += order.total;
      customerMap[key].orderHistory?.push(order);
      if (customerMap[key].totalSpent >= 10000) {
        customerMap[key].status = 'vip';
      }
    }
  });

  const customerList = Object.values(customerMap);

  // Extract unique districts
  const districts = Array.from(new Set(customerList.map((c) => c.district).filter(Boolean)));

  const filteredCustomers = customerList.filter((c) => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.district.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesDistrict = districtFilter === 'all' || c.district === districtFilter;
    const matchesTier = tierFilter === 'all' || c.status === tierFilter;

    return matchesSearch && matchesDistrict && matchesTier;
  });

  const totalRevenueAllCustomers = customerList.reduce((acc, c) => acc + c.totalSpent, 0);
  const totalVipCount = customerList.filter((c) => c.status === 'vip').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-4">
        <div>
          <h2 className="text-xl font-serif font-bold text-neutral-900">Customer Directory & Lifetime Value</h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            View customer profiles, purchase frequencies, total spent, and VIP high-value buyer classifications.
          </p>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <div className="bg-amber-50 text-[#4A1525] border border-amber-200 px-3 py-1.5 rounded-lg font-mono font-bold">
            Total Customers: {customerList.length}
          </div>
          <div className="bg-purple-50 text-purple-900 border border-purple-200 px-3 py-1.5 rounded-lg font-mono font-bold flex items-center space-x-1">
            <Crown size={13} className="text-purple-700" />
            <span>VIP: {totalVipCount}</span>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase font-mono text-neutral-500">Total Registered Buyers</div>
            <div className="text-xl font-bold font-mono text-neutral-900 mt-1">{customerList.length}</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-[#4A1525] flex items-center justify-center">
            <Users size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase font-mono text-neutral-500">Cumulative Lifetime Value</div>
            <div className="text-xl font-bold font-mono text-[#4A1525] mt-1">৳{totalRevenueAllCustomers.toLocaleString()}</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <TrendingUp size={20} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase font-mono text-neutral-500">VIP High Spenders (৳10K+)</div>
            <div className="text-xl font-bold font-mono text-purple-800 mt-1">{totalVipCount} Buyers</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
            <Crown size={20} />
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-neutral-50 p-3 rounded-xl border border-neutral-200">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3 top-2.5 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Name, Phone, Email, or District..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#4A1525]"
          />
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center space-x-2">
            <Filter size={14} className="text-neutral-500" />
            <select
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
              className="text-xs border border-neutral-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none"
            >
              <option value="all">All Districts</option>
              {districts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="text-xs border border-neutral-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none"
          >
            <option value="all">All Customer Tiers</option>
            <option value="vip">VIP Only (৳10K+)</option>
            <option value="active">Standard Active</option>
          </select>
        </div>
      </div>

      {/* Customers Table */}
      <div className="overflow-x-auto border border-neutral-200 rounded-xl bg-white shadow-sm">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-500 uppercase font-mono text-[10px]">
              <th className="py-3 px-3">Customer Name</th>
              <th className="py-3 px-3">Contact</th>
              <th className="py-3 px-3">Location</th>
              <th className="py-3 px-3">Orders Count</th>
              <th className="py-3 px-3">Total Spent (LTV)</th>
              <th className="py-3 px-3">Tier</th>
              <th className="py-3 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filteredCustomers.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-neutral-400">
                  No customers match the criteria.
                </td>
              </tr>
            ) : (
              filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-neutral-50/80 transition">
                  <td className="py-3 px-3">
                    <div className="font-bold text-neutral-900">{customer.name}</div>
                    <div className="text-[10px] text-neutral-400 font-mono">ID: {customer.id}</div>
                  </td>

                  <td className="py-3 px-3 font-mono text-neutral-700">
                    <div className="flex items-center space-x-1">
                      <Phone size={11} className="text-neutral-400" />
                      <span>{customer.phone}</span>
                    </div>
                    {customer.email !== '—' && (
                      <div className="text-[10px] text-neutral-400 flex items-center space-x-1 mt-0.5">
                        <Mail size={11} />
                        <span>{customer.email}</span>
                      </div>
                    )}
                  </td>

                  <td className="py-3 px-3 text-neutral-700">
                    <div className="font-medium">{customer.district}</div>
                    <div className="text-[10px] text-neutral-400">{customer.thana}</div>
                  </td>

                  <td className="py-3 px-3 font-mono">
                    <span className="font-bold text-neutral-900">{customer.totalOrders}</span>
                    <span className="text-neutral-500 text-[10px]"> {customer.totalOrders > 1 ? 'orders' : 'order'}</span>
                  </td>

                  <td className="py-3 px-3 font-mono font-bold text-neutral-900">
                    ৳{customer.totalSpent.toLocaleString()}
                  </td>

                  <td className="py-3 px-3">
                    {customer.status === 'vip' ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                        <Crown size={11} />
                        <span>VIP Buyer</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-100 text-neutral-700 border border-neutral-200">
                        <UserCheck size={11} />
                        <span>Standard</span>
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => setSelectedCustomer(customer)}
                      className="px-2.5 py-1.5 bg-[#4A1525] text-amber-200 rounded text-[11px] font-bold hover:bg-[#6B1228] transition flex items-center space-x-1 ml-auto"
                    >
                      <Eye size={13} />
                      <span>History</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Customer Profile Modal Drawer */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-neutral-200 p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <div>
                <span className="text-xs uppercase font-mono text-neutral-400">Customer Dossier</span>
                <h3 className="text-xl font-serif font-bold text-[#4A1525] flex items-center space-x-2">
                  <span>{selectedCustomer.name}</span>
                  {selectedCustomer.status === 'vip' && (
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-mono font-bold rounded-full flex items-center space-x-1">
                      <Crown size={11} />
                      <span>VIP</span>
                    </span>
                  )}
                </h3>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-1 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100"
              >
                <X size={20} />
              </button>
            </div>

            {/* Profile Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-neutral-50 p-3.5 rounded-lg border border-neutral-200 space-y-1.5">
                <div className="font-bold text-neutral-900 mb-1">Contact & Address</div>
                <div><strong>Phone:</strong> {selectedCustomer.phone}</div>
                <div><strong>Email:</strong> {selectedCustomer.email}</div>
                <div><strong>Address:</strong> {selectedCustomer.address}</div>
                <div><strong>Location:</strong> {selectedCustomer.thana}, {selectedCustomer.district}</div>
              </div>

              <div className="bg-amber-50/60 p-3.5 rounded-lg border border-amber-200 space-y-1.5 font-mono">
                <div className="font-bold text-[#4A1525] font-serif mb-1">Commercial Metrics</div>
                <div>Lifetime Spend: <strong className="text-base text-[#4A1525]">৳{selectedCustomer.totalSpent.toLocaleString()}</strong></div>
                <div>Total Orders: <strong>{selectedCustomer.totalOrders}</strong></div>
                <div>Last Order: <strong>{selectedCustomer.lastOrderDate || 'Recent'}</strong></div>
              </div>
            </div>

            {/* Associated Order Records */}
            <div>
              <h4 className="font-serif font-bold text-sm text-neutral-900 mb-2">Order History</h4>
              <div className="border border-neutral-200 rounded-lg divide-y divide-neutral-100 text-xs">
                {selectedCustomer.orderHistory && selectedCustomer.orderHistory.length > 0 ? (
                  selectedCustomer.orderHistory.map((ord) => (
                    <div key={ord.id} className="p-3 flex items-center justify-between">
                      <div>
                        <div className="font-mono font-bold text-neutral-900">{ord.orderNumber}</div>
                        <div className="text-[10px] text-neutral-500">{ord.date} • {ord.items.length} item(s)</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-neutral-900">৳{ord.total.toLocaleString()}</div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 uppercase">
                          {ord.status}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-neutral-400">No order history available.</div>
                )}
              </div>
            </div>

            {/* Close Button */}
            <div className="flex justify-end pt-2 border-t border-neutral-200">
              <button
                onClick={() => setSelectedCustomer(null)}
                className="px-5 py-2 bg-[#4A1525] text-amber-200 font-bold text-xs rounded-lg hover:bg-[#6B1228] transition"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
