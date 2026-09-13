import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Save, 
  Check, 
  Sparkles, 
  Globe, 
  Share2, 
  HelpCircle, 
  ExternalLink, 
  ShieldAlert, 
  Activity, 
  Zap,
  CheckCircle2,
  AlertCircle,
  Play,
  RefreshCw,
  Code2,
  Terminal,
  Layers,
  Flame,
  Radio
} from 'lucide-react';
import { useAdminStore } from '../../store/useAdminStore';
import { MarketingPixelsConfig } from '../../types';
import { PRODUCTS } from '../../data';
import { trackingService, PlatformHealthStatus } from '../../services/trackingService';

export const MarketingModule: React.FC = () => {
  const { marketingPixels, updateMarketingPixels, products } = useAdminStore();

  const [formData, setFormData] = useState<MarketingPixelsConfig>({
    ...marketingPixels
  });

  // Sync state if store updates from Firestore
  useEffect(() => {
    setFormData({ ...marketingPixels });
  }, [marketingPixels]);

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'pixels' | 'diagnostics' | 'events' | 'custom_scripts'>('pixels');

  // Diagnostics state
  const [healthStatus, setHealthStatus] = useState<PlatformHealthStatus[]>([]);
  const [diagnosticLogs, setDiagnosticLogs] = useState<{ time: string; event: string; status: string; detail: string }[]>([]);
  const [isTestingCapi, setIsTestingCapi] = useState(false);

  // Refresh health status
  const runHealthCheck = () => {
    const health = trackingService.inspectTrackingHealth(formData);
    setHealthStatus(health);
  };

  useEffect(() => {
    runHealthCheck();
  }, [formData, activeTab]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateMarketingPixels(formData);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      runHealthCheck();
    }, 1500);
  };

  // Test Event Trigger simulation
  const fireTestEvent = (eventName: 'PageView' | 'ViewContent' | 'AddToCart' | 'InitiateCheckout' | 'Purchase') => {
    const sampleProduct = (products && products.length > 0 ? products[0] : PRODUCTS[0]);

    const timeStr = new Date().toLocaleTimeString();

    switch (eventName) {
      case 'PageView':
        trackingService.trackPageView(window.location.href, 'Houseofmahi | Live Test Simulation');
        setDiagnosticLogs(prev => [
          { time: timeStr, event: 'PageView', status: 'Dispatched', detail: 'URL: / | Title: Houseofmahi Live Test' },
          ...prev.slice(0, 19)
        ]);
        break;
      case 'ViewContent':
        trackingService.trackViewItem(sampleProduct);
        setDiagnosticLogs(prev => [
          { time: timeStr, event: 'ViewContent / view_item', status: 'Dispatched', detail: `${sampleProduct.name} (৳${sampleProduct.price})` },
          ...prev.slice(0, 19)
        ]);
        break;
      case 'AddToCart':
        trackingService.trackAddToCart(sampleProduct, 1, 'Gold Polish', 'Standard');
        setDiagnosticLogs(prev => [
          { time: timeStr, event: 'AddToCart / add_to_cart', status: 'Dispatched', detail: `${sampleProduct.name} x 1 (৳${sampleProduct.price})` },
          ...prev.slice(0, 19)
        ]);
        break;
      case 'InitiateCheckout':
        trackingService.trackBeginCheckout([{ product: sampleProduct, quantity: 1 }], sampleProduct.price, 'TEST10');
        setDiagnosticLogs(prev => [
          { time: timeStr, event: 'InitiateCheckout / begin_checkout', status: 'Dispatched', detail: `Subtotal: ৳${sampleProduct.price} | Coupon: TEST10` },
          ...prev.slice(0, 19)
        ]);
        break;
      case 'Purchase':
        const testOrderId = `TEST-${Math.floor(100000 + Math.random() * 900000)}`;
        trackingService.trackPurchase({
          id: testOrderId,
          orderNumber: testOrderId,
          date: new Date().toLocaleDateString(),
          items: [{ product: sampleProduct, quantity: 1 }],
          subtotal: sampleProduct.price,
          shippingCharge: 80,
          discount: 0,
          total: sampleProduct.price + 80,
          status: 'Confirmed',
          paymentMethod: 'cod',
          paymentStatus: 'paid',
          customer: {
            name: 'Mahi Test User',
            phone: '01400031902',
            email: 'test@houseofmahi.com',
            address: 'Dhaka, Bangladesh',
            district: 'Dhaka',
            thana: 'Dhanmondi'
          },
          trackingNumber: `STEAD-TEST-BD`
        });
        setDiagnosticLogs(prev => [
          { time: timeStr, event: 'Purchase / CompletePayment', status: 'Dispatched', detail: `Order #${testOrderId} | Total: ৳${sampleProduct.price + 80}` },
          ...prev.slice(0, 19)
        ]);
        break;
    }
  };

  // Direct Server-Side Meta CAPI Test Trigger
  const fireServerCapiTest = async () => {
    setIsTestingCapi(true);
    const timeStr = new Date().toLocaleTimeString();
    try {
      const res = await fetch('/api/tracking/test-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testEventCode: formData.metaTestEventCode || undefined,
          eventName: 'ViewContent'
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDiagnosticLogs(prev => [
          {
            time: timeStr,
            event: 'Meta CAPI (Server)',
            status: 'Verified',
            detail: `HTTP 200 OK | Events Received: ${data.response?.events_received || 1} | Code: ${data.testEventCodeUsed || 'N/A'}`
          },
          ...prev.slice(0, 19)
        ]);
      } else {
        setDiagnosticLogs(prev => [
          {
            time: timeStr,
            event: 'Meta CAPI (Server)',
            status: 'Failed',
            detail: data.error || data.response?.error?.message || `Status: ${res.status}`
          },
          ...prev.slice(0, 19)
        ]);
      }
    } catch (err: any) {
      setDiagnosticLogs(prev => [
        {
          time: timeStr,
          event: 'Meta CAPI (Server)',
          status: 'Error',
          detail: err.message || 'Connection failure to /api/tracking/test-event'
        },
        ...prev.slice(0, 19)
      ]);
    } finally {
      setIsTestingCapi(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-4">
        <div>
          <h2 className="text-xl font-serif font-bold text-neutral-900 flex items-center space-x-2">
            <span>Marketing, Pixels & Analytics Hub</span>
            <span className="px-2 py-0.5 rounded-md bg-amber-100 text-[#4A1525] text-[10px] font-mono font-bold uppercase tracking-wider">
              Real-Time Engine
            </span>
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Centralized zero-duplication tracking manager for Meta Pixel (Facebook Ads), GA4, GTM, Google Ads, TikTok Pixel & Microsoft Clarity.
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center space-x-1.5 text-xs text-emerald-700 bg-emerald-50 px-3.5 py-1.5 rounded-lg border border-emerald-200 font-bold shadow-xs">
            <Check size={15} />
            <span>Tracking tags synced to Firestore & Live Store!</span>
          </div>
        )}
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex space-x-2 border-b border-neutral-200 text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => setActiveTab('pixels')}
          className={`pb-2.5 px-3 border-b-2 transition whitespace-nowrap ${
            activeTab === 'pixels' 
              ? 'border-[#4A1525] text-[#4A1525]' 
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          Tracking Pixels & IDs
        </button>
        <button
          onClick={() => setActiveTab('diagnostics')}
          className={`pb-2.5 px-3 border-b-2 transition flex items-center space-x-1.5 whitespace-nowrap ${
            activeTab === 'diagnostics' 
              ? 'border-[#4A1525] text-[#4A1525]' 
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <Activity size={14} />
          <span>Live Health Check & Test Console</span>
        </button>
        <button
          onClick={() => setActiveTab('custom_scripts')}
          className={`pb-2.5 px-3 border-b-2 transition flex items-center space-x-1.5 whitespace-nowrap ${
            activeTab === 'custom_scripts' 
              ? 'border-[#4A1525] text-[#4A1525]' 
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <Code2 size={14} />
          <span>Custom Header / Footer Scripts</span>
        </button>
        <button
          onClick={() => setActiveTab('events')}
          className={`pb-2.5 px-3 border-b-2 transition whitespace-nowrap ${
            activeTab === 'events' 
              ? 'border-[#4A1525] text-[#4A1525]' 
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          Standard Ecommerce Events Mapping
        </button>
      </div>

      {/* 1. Main Tracking Pixels & Platforms Configuration */}
      {activeTab === 'pixels' && (
        <form onSubmit={handleSave} className="space-y-5">
          {/* Meta / Facebook Pixel Card */}
          <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                  f
                </div>
                <div>
                  <h3 className="font-serif font-bold text-sm text-neutral-900">Meta Pixel (Facebook Ads)</h3>
                  <p className="text-[11px] text-neutral-500">
                    Tracks PageView, ViewContent, AddToCart, InitiateCheckout, and Purchase events for Facebook & Instagram ads.
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.metaPixelEnabled}
                  onChange={(e) => setFormData({ ...formData, metaPixelEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#4A1525]"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Meta Pixel ID (Dataset ID) *
                </label>
                <input
                  type="text"
                  value={formData.metaPixelId}
                  onChange={(e) => setFormData({ ...formData, metaPixelId: e.target.value })}
                  placeholder="e.g. 123456789012345"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white font-mono"
                />
                <span className="text-[10px] text-neutral-400 mt-1 block">
                  Find this inside Meta Events Manager &gt; Data Sources &gt; Settings.
                </span>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Dataset Name (Optional Identifier)
                </label>
                <input
                  type="text"
                  value={formData.metaPixelName || ''}
                  onChange={(e) => setFormData({ ...formData, metaPixelName: e.target.value })}
                  placeholder="e.g. Houseofmahi Main Pixel"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Test Event Code (Optional for Meta Events Manager testing)
                </label>
                <input
                  type="text"
                  value={formData.metaTestEventCode || ''}
                  onChange={(e) => setFormData({ ...formData, metaTestEventCode: e.target.value })}
                  placeholder="e.g. TEST12345"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white font-mono"
                />
              </div>

              <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200 text-[11px] text-neutral-600 flex items-start space-x-2">
                <Sparkles size={16} className="text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Conversions API (CAPI) Auto-Sync:</strong> Standard events send unique event IDs for seamless browser & server deduplication and currency normalization to BDT.
                </div>
              </div>
            </div>
          </div>

          {/* Google Analytics 4 (GA4) Card */}
          <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-sm">
                  G
                </div>
                <div>
                  <h3 className="font-serif font-bold text-sm text-neutral-900">Google Analytics 4 (GA4)</h3>
                  <p className="text-[11px] text-neutral-500">
                    Full ecommerce funnel analytics, revenue reports, user journey tracking, and conversion path analysis.
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.ga4Enabled}
                  onChange={(e) => setFormData({ ...formData, ga4Enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#4A1525]"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  GA4 Measurement ID (G-XXXXXXXXXX) *
                </label>
                <input
                  type="text"
                  value={formData.ga4MeasurementId}
                  onChange={(e) => setFormData({ ...formData, ga4MeasurementId: e.target.value })}
                  placeholder="e.g. G-AB12CD34EF"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white font-mono"
                />
                <span className="text-[10px] text-neutral-400 mt-1 block">
                  Find this inside Google Analytics Admin &gt; Data Streams &gt; Web Stream.
                </span>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Data Stream Name (Optional)
                </label>
                <input
                  type="text"
                  value={formData.ga4StreamName || ''}
                  onChange={(e) => setFormData({ ...formData, ga4StreamName: e.target.value })}
                  placeholder="e.g. Houseofmahi Web Store"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="ga4DebugMode"
                  checked={formData.ga4DebugMode ?? false}
                  onChange={(e) => setFormData({ ...formData, ga4DebugMode: e.target.checked })}
                  className="rounded text-[#4A1525] focus:ring-[#4A1525] w-4 h-4"
                />
                <label htmlFor="ga4DebugMode" className="text-xs text-neutral-700 font-medium cursor-pointer">
                  Enable GA4 DebugView Mode (`debug_mode: true`)
                </label>
              </div>

              <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200 text-[11px] text-neutral-600 flex items-start space-x-2">
                <Activity size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Enhanced Measurement:</strong> Outbound clicks, scroll depth, site searches, and items interactions are reported automatically with currency set to BDT.
                </div>
              </div>
            </div>
          </div>

          {/* Google Tag Manager (GTM) Card */}
          <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-sm">
                  GTM
                </div>
                <div>
                  <h3 className="font-serif font-bold text-sm text-neutral-900">Google Tag Manager (GTM Container)</h3>
                  <p className="text-[11px] text-neutral-500">
                    Deploy custom marketing tags, heatmaps, or third-party pixels with automated `window.dataLayer` ecommerce pushes.
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.gtmEnabled}
                  onChange={(e) => setFormData({ ...formData, gtmEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#4A1525]"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  GTM Container ID (GTM-XXXXXXX) *
                </label>
                <input
                  type="text"
                  value={formData.gtmContainerId}
                  onChange={(e) => setFormData({ ...formData, gtmContainerId: e.target.value })}
                  placeholder="e.g. GTM-W9K9XYZ"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white font-mono"
                />
              </div>

              <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200 text-[11px] text-neutral-600 flex items-start space-x-2">
                <Zap size={16} className="text-teal-700 shrink-0 mt-0.5" />
                <div>
                  <strong>dataLayer Push Ready:</strong> All cart and purchase interactions push structured events to `window.dataLayer` for custom GTM triggers.
                </div>
              </div>
            </div>
          </div>

          {/* Google Ads Conversion Tracking Card */}
          <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-sm">
                  Ads
                </div>
                <div>
                  <h3 className="font-serif font-bold text-sm text-neutral-900">Google Ads Conversion Tracking</h3>
                  <p className="text-[11px] text-neutral-500">
                    Track Google Ads ROAS, purchase conversion values, and remarketing audiences with gtag conversion tags.
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.googleAdsEnabled ?? false}
                  onChange={(e) => setFormData({ ...formData, googleAdsEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#4A1525]"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Google Ads Conversion ID (AW-XXXXXXXXX)
                </label>
                <input
                  type="text"
                  value={formData.googleAdsConversionId || ''}
                  onChange={(e) => setFormData({ ...formData, googleAdsConversionId: e.target.value })}
                  placeholder="e.g. AW-123456789"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Purchase Conversion Label
                </label>
                <input
                  type="text"
                  value={formData.googleAdsConversionLabel || ''}
                  onChange={(e) => setFormData({ ...formData, googleAdsConversionLabel: e.target.value })}
                  placeholder="e.g. AbCdEfGhIjKlMnOpQrS"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white font-mono"
                />
                <span className="text-[10px] text-neutral-400 mt-1 block">
                  Find this under Google Ads &gt; Goals &gt; Conversions &gt; Summary.
                </span>
              </div>
            </div>
          </div>

          {/* TikTok Pixel Card */}
          <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-bold text-sm">
                  TT
                </div>
                <div>
                  <h3 className="font-serif font-bold text-sm text-neutral-900">TikTok Pixel</h3>
                  <p className="text-[11px] text-neutral-500">
                    Track ad campaigns, viral video conversions, and shopping catalog events on TikTok Ads Manager.
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.tiktokEnabled}
                  onChange={(e) => setFormData({ ...formData, tiktokEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#4A1525]"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  TikTok Pixel ID (e.g. CXXXXXXXXXXXX) *
                </label>
                <input
                  type="text"
                  value={formData.tiktokPixelId}
                  onChange={(e) => setFormData({ ...formData, tiktokPixelId: e.target.value })}
                  placeholder="e.g. C1234567890ABCDEF"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white font-mono"
                />
              </div>

              <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200 text-[11px] text-neutral-600 flex items-start space-x-2">
                <Share2 size={16} className="text-neutral-800 shrink-0 mt-0.5" />
                <div>
                  <strong>TikTok Events Integration:</strong> Automatically sends CompletePayment, PlaceAnOrder, and ViewContent events with currency parameter (BDT).
                </div>
              </div>
            </div>
          </div>

          {/* Microsoft Clarity Card */}
          <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-sm">
                  <Flame size={18} />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-sm text-neutral-900">Microsoft Clarity (Heatmaps & Recordings)</h3>
                  <p className="text-[11px] text-neutral-500">
                    Free user session replays, click heatmaps, scroll depth tracking, and dead-click analytics.
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.clarityEnabled ?? false}
                  onChange={(e) => setFormData({ ...formData, clarityEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#4A1525]"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Clarity Project ID (e.g. abcdefghij)
                </label>
                <input
                  type="text"
                  value={formData.clarityProjectId || ''}
                  onChange={(e) => setFormData({ ...formData, clarityProjectId: e.target.value })}
                  placeholder="e.g. mahi_clarity_8e9"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white font-mono"
                />
              </div>

              <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200 text-[11px] text-neutral-600 flex items-start space-x-2">
                <Activity size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Session Tagging:</strong> Purchase order IDs and high-value cart visits are automatically tagged in Clarity recordings for easy filtering.
                </div>
              </div>
            </div>
          </div>

          {/* Test & Debug Mode */}
          <div className="bg-amber-50/70 rounded-xl border border-amber-200 p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <ShieldAlert size={20} className="text-amber-800 shrink-0" />
              <div className="text-xs">
                <div className="font-bold text-amber-900">Console Debugging & Test Mode</div>
                <div className="text-[11px] text-amber-800/80">
                  Logs all pixel payload emissions to browser developer console for event verification before ad spend.
                </div>
              </div>
            </div>

            <input
              type="checkbox"
              checked={formData.testModeEnabled}
              onChange={(e) => setFormData({ ...formData, testModeEnabled: e.target.checked })}
              className="rounded text-[#4A1525] focus:ring-[#4A1525] w-4 h-4 cursor-pointer"
            />
          </div>

          {/* Save Button Bar */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 bg-[#4A1525] text-amber-200 rounded-xl font-bold text-xs hover:bg-[#6B1228] transition flex items-center space-x-2 shadow-sm cursor-pointer"
            >
              <Save size={16} />
              <span>Save & Sync All Tracking Channels</span>
            </button>
          </div>
        </form>
      )}

      {/* 2. Live Diagnostics & Test Console */}
      {activeTab === 'diagnostics' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div>
                <h3 className="font-serif font-bold text-sm text-neutral-900 flex items-center space-x-2">
                  <Activity size={16} className="text-[#4A1525]" />
                  <span>Real-Time Script & Global Object Verification</span>
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Direct inspection of browser DOM script elements and global SDK runtime status (`window.fbq`, `window.gtag`, etc.).
                </p>
              </div>

              <button
                onClick={runHealthCheck}
                className="px-3 py-1.5 rounded-lg border border-neutral-300 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition flex items-center space-x-1.5 cursor-pointer"
              >
                <RefreshCw size={13} />
                <span>Re-Inspect Now</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {healthStatus.map((item, idx) => (
                <div 
                  key={idx} 
                  className={`p-3.5 rounded-xl border transition ${
                    item.runtimeDetected 
                      ? 'border-emerald-200 bg-emerald-50/40' 
                      : item.scriptInjected 
                      ? 'border-blue-200 bg-blue-50/30'
                      : item.isConfigured 
                      ? 'border-amber-200 bg-amber-50/30' 
                      : 'border-neutral-200 bg-neutral-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-neutral-900">{item.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${item.statusColor}`}>
                      {item.statusLabel}
                    </span>
                  </div>

                  <div className="mt-2.5 space-y-1.5 text-[11px] font-mono">
                    <div className="flex justify-between text-neutral-600">
                      <span>Configured:</span>
                      <span className={item.isConfigured ? 'text-emerald-700 font-bold' : 'text-neutral-500'}>
                        {item.isConfigured ? (item.enabled ? 'Yes (ON)' : 'Yes (OFF)') : 'Not Configured'}
                      </span>
                    </div>
                    <div className="flex justify-between text-neutral-600">
                      <span>ID / Container:</span>
                      <span className="font-semibold text-neutral-900 truncate max-w-[140px]" title={item.configuredId || 'None'}>
                        {item.configuredId || 'None'}
                      </span>
                    </div>
                    <div className="flex justify-between text-neutral-600">
                      <span>Script Tag:</span>
                      <span className={item.scriptInjected ? 'text-emerald-700 font-bold' : 'text-neutral-400'}>
                        {item.scriptInjected ? '✓ Injected' : '✗ Missing'}
                      </span>
                    </div>
                    <div className="flex justify-between text-neutral-600">
                      <span>Global SDK:</span>
                      <span className={item.runtimeDetected ? 'text-emerald-700 font-bold' : 'text-neutral-400'}>
                        {item.runtimeDetected ? '✓ Detected' : '✗ Inactive'}
                      </span>
                    </div>
                    {item.platformVerifiedNote && (
                      <div className="pt-1 border-t border-neutral-200/60 text-[9.5px] text-neutral-500 font-sans italic leading-tight">
                        ℹ {item.platformVerifiedNote}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Test Event Simulator */}
          <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-xs space-y-4">
            <div>
              <h3 className="font-serif font-bold text-sm text-neutral-900 flex items-center space-x-2">
                <Play size={16} className="text-[#4A1525]" />
                <span>Live Event Simulator & Firing Trigger</span>
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Click any standard ecommerce event to dispatch test payloads to all active pixels and verify real-time attribution.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => fireTestEvent('PageView')}
                className="px-3.5 py-2 bg-[#4A1525] text-amber-200 rounded-lg text-xs font-semibold hover:bg-[#6B1228] transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
              >
                <Radio size={13} />
                <span>Test PageView</span>
              </button>

              <button
                type="button"
                onClick={() => fireTestEvent('ViewContent')}
                className="px-3.5 py-2 bg-neutral-900 text-white rounded-lg text-xs font-semibold hover:bg-neutral-800 transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
              >
                <Radio size={13} />
                <span>Test ViewContent</span>
              </button>

              <button
                type="button"
                onClick={() => fireTestEvent('AddToCart')}
                className="px-3.5 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
              >
                <Radio size={13} />
                <span>Test AddToCart</span>
              </button>

              <button
                type="button"
                onClick={() => fireTestEvent('InitiateCheckout')}
                className="px-3.5 py-2 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
              >
                <Radio size={13} />
                <span>Test InitiateCheckout</span>
              </button>

              <button
                type="button"
                onClick={() => fireTestEvent('Purchase')}
                className="px-3.5 py-2 bg-emerald-700 text-white rounded-lg text-xs font-semibold hover:bg-emerald-800 transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
              >
                <Radio size={13} />
                <span>Test Purchase (Deduplicated)</span>
              </button>

              <button
                type="button"
                onClick={fireServerCapiTest}
                disabled={isTestingCapi || !formData.metaPixelId}
                className="px-3.5 py-2 bg-indigo-700 text-white rounded-lg text-xs font-semibold hover:bg-indigo-800 disabled:opacity-50 transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
                title="Tests direct server-side connection to Meta Graph API Conversions API"
              >
                {isTestingCapi ? <RefreshCw size={13} className="animate-spin" /> : <Layers size={13} />}
                <span>{isTestingCapi ? 'Testing CAPI...' : 'Test Meta CAPI (Server)'}</span>
              </button>
            </div>

            {/* Test Console Log Output */}
            <div className="bg-neutral-950 text-neutral-200 rounded-xl p-4 font-mono text-xs space-y-2 border border-neutral-800 shadow-inner">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2 text-[11px] text-neutral-400">
                <div className="flex items-center space-x-2">
                  <Terminal size={14} className="text-emerald-400" />
                  <span>Real-time Dispatched Event Stream</span>
                </div>
                {diagnosticLogs.length > 0 && (
                  <button 
                    onClick={() => setDiagnosticLogs([])}
                    className="hover:text-white transition text-[10px] cursor-pointer"
                  >
                    Clear Logs
                  </button>
                )}
              </div>

              {diagnosticLogs.length === 0 ? (
                <div className="py-4 text-center text-neutral-500 text-[11px]">
                  No test events triggered yet. Click one of the buttons above to test live event emissions.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {diagnosticLogs.map((log, i) => (
                    <div key={i} className="flex items-start space-x-2 text-[11px] leading-relaxed">
                      <span className="text-neutral-500">[{log.time}]</span>
                      <span className="text-emerald-400 font-bold">{log.event}:</span>
                      <span className="text-neutral-300">{log.detail}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. Custom Header & Footer Scripts */}
      {activeTab === 'custom_scripts' && (
        <form onSubmit={handleSave} className="space-y-5">
          <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div>
                <h3 className="font-serif font-bold text-sm text-neutral-900 flex items-center space-x-2">
                  <Code2 size={16} className="text-[#4A1525]" />
                  <span>Custom Header & Body Tracking Scripts</span>
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Inject raw third-party HTML/JavaScript tracking snippets (e.g. Snap Pixel, Pinterest, Hotjar, custom webhooks).
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.customScriptEnabled ?? false}
                  onChange={(e) => setFormData({ ...formData, customScriptEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#4A1525]"></div>
              </label>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Header Script (&lt;head&gt; Injection)
                </label>
                <textarea
                  rows={4}
                  value={formData.customHeaderScript || ''}
                  onChange={(e) => setFormData({ ...formData, customHeaderScript: e.target.value })}
                  placeholder="<!-- Custom Head Snippet e.g. <script>...</script> -->"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-neutral-900 text-emerald-400 font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Footer / Body Script (&lt;body&gt; Injection)
                </label>
                <textarea
                  rows={4}
                  value={formData.customBodyScript || ''}
                  onChange={(e) => setFormData({ ...formData, customBodyScript: e.target.value })}
                  placeholder="<!-- Custom Body Snippet e.g. <script>...</script> -->"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-neutral-900 text-emerald-400 font-mono text-[11px]"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#4A1525] text-amber-200 rounded-xl font-bold text-xs hover:bg-[#6B1228] transition flex items-center space-x-2 shadow-sm cursor-pointer"
              >
                <Save size={16} />
                <span>Save Custom Scripts</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* 4. Standard Ecommerce Events Reference */}
      {activeTab === 'events' && (
        <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-xs space-y-4">
          <h3 className="font-serif font-bold text-sm text-neutral-900">Automated Standard Ecommerce Event Triggers</h3>
          <p className="text-xs text-neutral-500">
            Houseofmahi triggers these standard e-commerce events across all configured tracking pixels.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-500 font-mono text-[10px]">
                  <th className="py-2.5 px-3">User Action</th>
                  <th className="py-2.5 px-3">Meta (FB) Event</th>
                  <th className="py-2.5 px-3">GA4 Event</th>
                  <th className="py-2.5 px-3">TikTok Event</th>
                  <th className="py-2.5 px-3">Google Ads Event</th>
                  <th className="py-2.5 px-3">Parameters Sent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 font-mono text-[11px]">
                <tr>
                  <td className="py-2.5 px-3 font-sans font-medium text-neutral-900">Page Navigation</td>
                  <td className="py-2.5 px-3 text-blue-700">PageView</td>
                  <td className="py-2.5 px-3 text-amber-700">page_view</td>
                  <td className="py-2.5 px-3 text-neutral-800">Pageview</td>
                  <td className="py-2.5 px-3 text-emerald-700">page_view</td>
                  <td className="py-2.5 px-3 font-sans text-neutral-500">page_location, page_title</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-sans font-medium text-neutral-900">Quick View / Product View</td>
                  <td className="py-2.5 px-3 text-blue-700">ViewContent</td>
                  <td className="py-2.5 px-3 text-amber-700">view_item</td>
                  <td className="py-2.5 px-3 text-neutral-800">ViewContent</td>
                  <td className="py-2.5 px-3 text-emerald-700">view_item</td>
                  <td className="py-2.5 px-3 font-sans text-neutral-500">content_id, price, currency: 'BDT'</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-sans font-medium text-neutral-900">Add to Shopping Bag</td>
                  <td className="py-2.5 px-3 text-blue-700">AddToCart</td>
                  <td className="py-2.5 px-3 text-amber-700">add_to_cart</td>
                  <td className="py-2.5 px-3 text-neutral-800">AddToCart</td>
                  <td className="py-2.5 px-3 text-emerald-700">add_to_cart</td>
                  <td className="py-2.5 px-3 font-sans text-neutral-500">items, value, currency</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-sans font-medium text-neutral-900">Open Cart Drawer</td>
                  <td className="py-2.5 px-3 text-blue-700">ViewCart</td>
                  <td className="py-2.5 px-3 text-amber-700">view_cart</td>
                  <td className="py-2.5 px-3 text-neutral-800">ViewCart</td>
                  <td className="py-2.5 px-3 text-emerald-700">view_cart</td>
                  <td className="py-2.5 px-3 font-sans text-neutral-500">items, value, currency</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-sans font-medium text-neutral-900">Open Checkout Modal</td>
                  <td className="py-2.5 px-3 text-blue-700">InitiateCheckout</td>
                  <td className="py-2.5 px-3 text-amber-700">begin_checkout</td>
                  <td className="py-2.5 px-3 text-neutral-800">InitiateCheckout</td>
                  <td className="py-2.5 px-3 text-emerald-700">begin_checkout</td>
                  <td className="py-2.5 px-3 font-sans text-neutral-500">items, value, coupon</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-sans font-medium text-neutral-900">Order Confirmed</td>
                  <td className="py-2.5 px-3 text-blue-700 font-bold">Purchase</td>
                  <td className="py-2.5 px-3 text-amber-700 font-bold">purchase</td>
                  <td className="py-2.5 px-3 text-neutral-800 font-bold">CompletePayment</td>
                  <td className="py-2.5 px-3 text-emerald-700 font-bold">conversion (AW Label)</td>
                  <td className="py-2.5 px-3 font-sans text-neutral-500">transaction_id, value, items (deduplicated)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
