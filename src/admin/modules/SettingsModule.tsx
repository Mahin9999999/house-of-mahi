import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Store, 
  Truck, 
  CreditCard, 
  Phone, 
  Mail, 
  MapPin, 
  Bell, 
  Save, 
  Check, 
  DollarSign, 
  Sparkles, 
  MessageCircle, 
  Share2,
  ShieldCheck,
  Percent
} from 'lucide-react';
import { useAdminStore } from '../../store/useAdminStore';
import { StoreSettings } from '../../types';

export const SettingsModule: React.FC = () => {
  const { storeSettings, updateStoreSettings } = useAdminStore();

  const [formData, setFormData] = useState<StoreSettings>({
    ...storeSettings
  });

  // Sync with real-time updates from storeSettings if storeSettings change
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      ...storeSettings
    }));
  }, [storeSettings]);

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'store' | 'shipping' | 'announcement' | 'social'>('store');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateStoreSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-4">
        <div>
          <h2 className="text-xl font-serif font-bold text-neutral-900">General Store Configuration & Policies</h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Manage your brand profile, courier delivery charges across Bangladesh, announcement bar, and customer support channels.
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center space-x-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 font-bold animate-pulse">
            <Check size={15} />
            <span>Store settings saved live!</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-neutral-200 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('store')}
          className={`pb-2.5 px-3 border-b-2 transition flex items-center space-x-1.5 ${
            activeTab === 'store' 
              ? 'border-[#4A1525] text-[#4A1525]' 
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <Store size={14} />
          <span>Store Information</span>
        </button>
        <button
          onClick={() => setActiveTab('shipping')}
          className={`pb-2.5 px-3 border-b-2 transition flex items-center space-x-1.5 ${
            activeTab === 'shipping' 
              ? 'border-[#4A1525] text-[#4A1525]' 
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <Truck size={14} />
          <span>Delivery Rates & Shipping</span>
        </button>
        <button
          onClick={() => setActiveTab('announcement')}
          className={`pb-2.5 px-3 border-b-2 transition flex items-center space-x-1.5 ${
            activeTab === 'announcement' 
              ? 'border-[#4A1525] text-[#4A1525]' 
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <Bell size={14} />
          <span>Announcement Bar</span>
        </button>
        <button
          onClick={() => setActiveTab('social')}
          className={`pb-2.5 px-3 border-b-2 transition flex items-center space-x-1.5 ${
            activeTab === 'social' 
              ? 'border-[#4A1525] text-[#4A1525]' 
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <Share2 size={14} />
          <span>Support & Social Media</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Tab 1: Store Info */}
        {activeTab === 'store' && (
          <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm space-y-4">
            <h3 className="font-serif font-bold text-sm text-neutral-900 flex items-center space-x-2">
              <Store size={16} className="text-[#4A1525]" />
              <span>Brand Identity & Contact Coordinates</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Store / Brand Name *</label>
                <input
                  type="text"
                  required
                  value={formData.storeName}
                  onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white font-serif font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Currency Code & Symbol</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    placeholder="BDT"
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white font-mono"
                  />
                  <input
                    type="text"
                    value={formData.currencySymbol}
                    onChange={(e) => setFormData({ ...formData, currencySymbol: e.target.value })}
                    placeholder="৳"
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Official Support Phone *</label>
                <input
                  type="text"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Support Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-neutral-700 mb-1">Physical Store / Studio Address</label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Shipping & Delivery */}
        {activeTab === 'shipping' && (
          <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm space-y-4">
            <h3 className="font-serif font-bold text-sm text-neutral-900 flex items-center space-x-2">
              <Truck size={16} className="text-[#4A1525]" />
              <span>Courier Delivery Rates across Bangladesh</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200 space-y-2">
                <div className="font-bold text-[#4A1525] flex items-center space-x-1.5">
                  <MapPin size={15} />
                  <span>Inside Dhaka Delivery</span>
                </div>
                <p className="text-[11px] text-neutral-500">Standard rate for 24-48 hr courier in Dhaka Metro.</p>
                <div className="pt-1">
                  <label className="block font-semibold text-neutral-700 mb-1">Charge (৳ BDT)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.shippingInsideDhaka}
                    onChange={(e) => setFormData({ ...formData, shippingInsideDhaka: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg font-mono font-bold text-sm bg-white"
                  />
                </div>
              </div>

              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-200 space-y-2">
                <div className="font-bold text-blue-900 flex items-center space-x-1.5">
                  <Truck size={15} />
                  <span>Outside Dhaka Delivery</span>
                </div>
                <p className="text-[11px] text-neutral-500">Standard rate for all other 63 districts (Steadfast/RedX/Pathao).</p>
                <div className="pt-1">
                  <label className="block font-semibold text-neutral-700 mb-1">Charge (৳ BDT)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.shippingOutsideDhaka}
                    onChange={(e) => setFormData({ ...formData, shippingOutsideDhaka: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg font-mono font-bold text-sm bg-white"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Announcement Bar */}
        {activeTab === 'announcement' && (
          <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="font-serif font-bold text-sm text-neutral-900 flex items-center space-x-2">
                <Bell size={16} className="text-[#4A1525]" />
                <span>Top Header Announcement Strip</span>
              </h3>

              <label className="flex items-center space-x-2 cursor-pointer text-xs font-semibold text-neutral-800">
                <input
                  type="checkbox"
                  checked={formData.announcementEnabled}
                  onChange={(e) => setFormData({ ...formData, announcementEnabled: e.target.checked })}
                  className="rounded text-[#4A1525] focus:ring-[#4A1525]"
                />
                <span>Enable Announcement Bar</span>
              </label>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Announcement Message Text</label>
                <input
                  type="text"
                  value={formData.announcementText}
                  onChange={(e) => setFormData({ ...formData, announcementText: e.target.value })}
                  placeholder="e.g. Free shipping on all orders over ৳3,000 across Bangladesh!"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Background Color (Hex Code)</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={formData.announcementBgColor}
                      onChange={(e) => setFormData({ ...formData, announcementBgColor: e.target.value })}
                      className="w-9 h-9 rounded cursor-pointer border border-neutral-300"
                    />
                    <input
                      type="text"
                      value={formData.announcementBgColor}
                      onChange={(e) => setFormData({ ...formData, announcementBgColor: e.target.value })}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Text Color (Hex Code)</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={formData.announcementTextColor}
                      onChange={(e) => setFormData({ ...formData, announcementTextColor: e.target.value })}
                      className="w-9 h-9 rounded cursor-pointer border border-neutral-300"
                    />
                    <input
                      type="text"
                      value={formData.announcementTextColor}
                      onChange={(e) => setFormData({ ...formData, announcementTextColor: e.target.value })}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Live Preview Strip */}
              {formData.announcementEnabled && (
                <div className="pt-2">
                  <div className="text-[10px] uppercase font-mono text-neutral-400 mb-1.5">Live Appearance Preview:</div>
                  <div 
                    style={{ 
                      backgroundColor: formData.announcementBgColor, 
                      color: formData.announcementTextColor 
                    }}
                    className="py-2.5 px-4 rounded-lg text-center font-medium text-xs shadow-xs"
                  >
                    {formData.announcementText || 'Your announcement message will display here.'}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Support Channels & Social Media */}
        {activeTab === 'social' && (
          <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm space-y-4">
            <h3 className="font-serif font-bold text-sm text-neutral-900 flex items-center space-x-2">
              <MessageCircle size={16} className="text-[#4A1525]" />
              <span>Direct Customer Messaging & Social Profiles</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">WhatsApp Hotline Number (with +880)</label>
                <input
                  type="text"
                  value={formData.whatsappNumber}
                  onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                  placeholder="+88017XXXXXXXX"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Facebook Page / Community Link</label>
                <input
                  type="url"
                  value={formData.facebookUrl}
                  onChange={(e) => setFormData({ ...formData, facebookUrl: e.target.value })}
                  placeholder="https://facebook.com/houseofmahi"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Instagram Profile Link</label>
                <input
                  type="url"
                  value={formData.instagramUrl}
                  onChange={(e) => setFormData({ ...formData, instagramUrl: e.target.value })}
                  placeholder="https://instagram.com/houseofmahi"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">YouTube Channel URL</label>
                <input
                  type="url"
                  value={formData.youtubeUrl}
                  onChange={(e) => setFormData({ ...formData, youtubeUrl: e.target.value })}
                  placeholder="https://youtube.com/@houseofmahi"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* Global Save Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-6 py-2.5 bg-[#4A1525] text-amber-200 rounded-xl font-bold text-xs hover:bg-[#6B1228] transition flex items-center space-x-2 shadow-sm"
          >
            <Save size={16} />
            <span>Save Store Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};
