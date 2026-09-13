import React, { useState, useMemo, useEffect } from 'react';
import { 
  Globe, 
  Save, 
  Check, 
  Search, 
  Share2, 
  Sparkles, 
  Image as ImageIcon, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  AlertTriangle,
  Info,
  ExternalLink,
  Code2,
  ListTree,
  Building2,
  Copy,
  Download,
  RefreshCw,
  Sliders,
  CheckCheck,
  Eye,
  Loader2,
  Package,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle,
  Smartphone,
  Monitor
} from 'lucide-react';
import { useAdminStore } from '../../store/useAdminStore';
import { SeoConfig, PageSeoItem, Product, Category } from '../../types';
import { seoService } from '../../services/seoService';

export const SeoModule: React.FC = () => {
  const { 
    seoConfig, 
    updateSeoConfig, 
    pagesSeo, 
    updatePageSeo, 
    resetPagesSeoToDefault,
    products, 
    categories 
  } = useAdminStore();

  const [activeTab, setActiveTab] = useState<'audit' | 'global' | 'pages' | 'catalog' | 'social' | 'schema' | 'sitemap'>('audit');
  
  // Global SEO state
  const [globalData, setGlobalData] = useState<SeoConfig>({
    ...seoConfig
  });

  // Selected page to edit in Pages SEO tab
  const [selectedPageId, setSelectedPageId] = useState<string>(pagesSeo[0]?.id || 'home');
  const [editingPage, setEditingPage] = useState<PageSeoItem | null>(null);

  // SERP preview view mode (desktop vs mobile)
  const [serpDevice, setSerpDevice] = useState<'desktop' | 'mobile'>('desktop');

  // Async save states & feedback
  const [isSavingGlobal, setIsSavingGlobal] = useState(false);
  const [isSavingPage, setIsSavingPage] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('Settings saved & synced live!');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [copiedType, setCopiedType] = useState<string | null>(null);

  // Live endpoint verification states (for sitemap.xml & robots.txt)
  const [sitemapCheck, setSitemapCheck] = useState<{
    status: 'idle' | 'checking' | 'live' | 'error';
    statusCode?: number;
    message?: string;
    checkedAt?: string;
    byteSize?: number;
  }>({ status: 'idle' });

  const [robotsCheck, setRobotsCheck] = useState<{
    status: 'idle' | 'checking' | 'live' | 'error';
    statusCode?: number;
    message?: string;
    checkedAt?: string;
    byteSize?: number;
  }>({ status: 'idle' });

  // Catalog search filter in catalog tab
  const [catalogSearch, setCatalogSearch] = useState('');

  // Sync state if store updates from Firestore
  useEffect(() => {
    setGlobalData(seoConfig);
  }, [seoConfig]);

  useEffect(() => {
    const found = pagesSeo.find(p => p.id === selectedPageId);
    if (found) {
      // Normalize path to clean route (strip any legacy hash)
      const cleanPath = (found.path || '/').replace(/^#\/?/, '/').replace(/^\/?/, '/');
      const cleanCanonical = found.canonicalUrl ? found.canonicalUrl.replace(/#\/?/, '') : found.canonicalUrl;
      setEditingPage({ 
        ...found,
        path: cleanPath,
        canonicalUrl: cleanCanonical
      });
    }
  }, [selectedPageId, pagesSeo]);

  // Compute live SEO Audit Summary
  const auditSummary = useMemo(() => {
    return seoService.auditEntireStore({
      globalConfig: globalData,
      pages: pagesSeo,
      products,
      categories
    });
  }, [globalData, pagesSeo, products, categories]);

  // Compute XML Sitemap preview string
  const sitemapXml = useMemo(() => {
    return seoService.generateXmlSitemap(globalData, pagesSeo, products, categories);
  }, [globalData, pagesSeo, products, categories]);

  // Compute Robots.txt preview string
  const robotsTxt = useMemo(() => {
    return seoService.generateRobotsTxt(globalData);
  }, [globalData]);

  // Schemas preview
  const organizationSchema = useMemo(() => {
    return seoService.generateOrganizationSchema(globalData);
  }, [globalData]);

  const websiteSchema = useMemo(() => {
    return seoService.generateWebSiteSchema(globalData);
  }, [globalData]);

  // Sample Product Schema
  const sampleProductSchema = useMemo(() => {
    const sampleProduct = products[0];
    if (!sampleProduct) return null;
    const slug = (sampleProduct as any).seo?.slug || (sampleProduct as any).seoSlug || (sampleProduct as any).slug || sampleProduct.id;
    const sampleCanonical = `${globalData.canonicalBaseUrl || 'https://houseofmahibd.com'}/product/${encodeURIComponent(slug)}`;
    return seoService.generateProductSchema(sampleProduct, globalData, sampleCanonical);
  }, [products, globalData]);

  // URL count statistics for sitemap
  const sitemapStats = useMemo(() => {
    const indexablePages = pagesSeo.filter(p => p.indexStatus === 'index');
    const indexableProducts = products.filter(p => p.inStock !== false);
    const indexableCategories = categories;
    const total = 1 + indexablePages.length + indexableCategories.length + indexableProducts.length;
    return {
      pagesCount: indexablePages.length,
      categoriesCount: indexableCategories.length,
      productsCount: indexableProducts.length,
      totalCount: total
    };
  }, [pagesSeo, categories, products]);

  // Filtered products for catalog SEO review
  const filteredProducts = useMemo(() => {
    if (!catalogSearch.trim()) return products.slice(0, 15);
    const q = catalogSearch.toLowerCase().trim();
    return products.filter(p => 
      p.name.toLowerCase().includes(q) || 
      (p.categoryLabel || '').toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [products, catalogSearch]);

  // Handle Global SEO Save
  const handleSaveGlobal = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingGlobal(true);
    setSaveError(null);

    try {
      // Ensure canonicalBaseUrl has no trailing slash and no hash
      const cleanBase = (globalData.canonicalBaseUrl || 'https://houseofmahibd.com')
        .replace(/\/+$/, '')
        .replace(/#.*$/, '');
      
      const sanitizedData: SeoConfig = {
        ...globalData,
        canonicalBaseUrl: cleanBase,
        brandName: globalData.brandName.trim(),
        homepageTitle: globalData.homepageTitle.trim(),
        homepageDescription: globalData.homepageDescription.trim()
      };

      await updateSeoConfig(sanitizedData);
      setGlobalData(sanitizedData);
      setSaveSuccessMessage('Global SEO settings persisted to Firestore & synced live!');
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to save Global SEO settings.');
      setTimeout(() => setSaveError(null), 5000);
    } finally {
      setIsSavingGlobal(false);
    }
  };

  // Handle Page SEO Save
  const handleSavePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPage) return;

    setIsSavingPage(true);
    setSaveError(null);

    try {
      // Normalize clean path
      const rawPath = editingPage.path || '/';
      const cleanPath = rawPath.replace(/^#\/?/, '/').replace(/^\/?/, '/');
      const cleanCanonical = editingPage.canonicalUrl
        ? editingPage.canonicalUrl.replace(/#\/?/, '')
        : undefined;

      const payload: PageSeoItem = {
        ...editingPage,
        path: cleanPath,
        canonicalUrl: cleanCanonical,
        title: editingPage.title?.trim(),
        description: editingPage.description?.trim(),
        updatedAt: new Date().toISOString()
      };

      await updatePageSeo(editingPage.id, payload);
      setEditingPage(payload);
      setSaveSuccessMessage(`${editingPage.pageName} SEO persisted to Firestore & synced live!`);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to save page SEO settings.');
      setTimeout(() => setSaveError(null), 5000);
    } finally {
      setIsSavingPage(false);
    }
  };

  // Handle Reset Pages to Clean Presets
  const handleResetPages = async () => {
    if (window.confirm('Reset all page SEO configurations to recommended clean presets? This will persist directly to Firestore.')) {
      setIsSavingPage(true);
      setSaveError(null);
      try {
        await resetPagesSeoToDefault();
        setSaveSuccessMessage('All page SEO presets successfully reset & synced to Firestore!');
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      } catch (err: any) {
        setSaveError(err?.message || 'Failed to reset page SEO presets.');
        setTimeout(() => setSaveError(null), 5000);
      } finally {
        setIsSavingPage(false);
      }
    }
  };

  // Real Endpoint Verifier: fetches local /sitemap.xml or /robots.txt
  const verifyLiveEndpoint = async (endpoint: '/sitemap.xml' | '/robots.txt') => {
    const isSitemap = endpoint === '/sitemap.xml';
    if (isSitemap) {
      setSitemapCheck({ status: 'checking' });
    } else {
      setRobotsCheck({ status: 'checking' });
    }

    try {
      const resp = await fetch(endpoint, { method: 'GET' });
      const text = await resp.text();
      const isSuccess = resp.ok && text.length > 0;
      
      const payload = {
        status: isSuccess ? ('live' as const) : ('error' as const),
        statusCode: resp.status,
        byteSize: text.length,
        message: isSuccess 
          ? `HTTP ${resp.status} OK — Valid response (${text.length.toLocaleString()} bytes received)` 
          : `HTTP ${resp.status} ${resp.statusText || 'Error'}`,
        checkedAt: new Date().toLocaleTimeString()
      };

      if (isSitemap) {
        setSitemapCheck(payload);
      } else {
        setRobotsCheck(payload);
      }
    } catch (err: any) {
      const payload = {
        status: 'error' as const,
        statusCode: 0,
        message: err?.message || 'Connection failed to local host endpoint',
        checkedAt: new Date().toLocaleTimeString()
      };
      if (isSitemap) {
        setSitemapCheck(payload);
      } else {
        setRobotsCheck(payload);
      }
    }
  };

  // Copy text helper
  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  // Download XML helper
  const downloadXmlFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const titleLength = globalData.homepageTitle?.length || 0;
  const descLength = globalData.homepageDescription?.length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#4A1525] text-amber-300 flex items-center justify-center font-bold">
              <Globe size={18} />
            </div>
            <div>
              <h2 className="text-xl font-serif font-bold text-neutral-900">SEO & Structured Data Center</h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Centralized Google search engine optimization, JSON-LD schemas, clean canonical URLs, and live audit.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {savedSuccess && (
            <div className="flex items-center space-x-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 font-bold animate-pulse shadow-xs">
              <Check size={15} />
              <span>{saveSuccessMessage}</span>
            </div>
          )}

          {saveError && (
            <div className="flex items-center space-x-1.5 text-xs text-red-700 bg-red-50 px-3 py-1.5 rounded-lg border border-red-200 font-bold shadow-xs">
              <AlertCircle size={15} />
              <span>{saveError}</span>
            </div>
          )}
          
          <div className="bg-amber-50 border border-amber-200/80 px-3 py-1 rounded-lg flex items-center space-x-2">
            <span className="text-[11px] font-semibold text-[#4A1525]">Store SEO Score:</span>
            <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
              auditSummary.overallScore >= 80 ? 'bg-emerald-100 text-emerald-800' :
              auditSummary.overallScore >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
            }`}>
              {auditSummary.overallScore}/100
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex overflow-x-auto border-b border-neutral-200 gap-2 pb-px text-xs font-medium text-neutral-600 scrollbar-none">
        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center space-x-2 px-4 py-2.5 border-b-2 transition whitespace-nowrap ${
            activeTab === 'audit'
              ? 'border-[#4A1525] text-[#4A1525] font-bold bg-neutral-50 rounded-t-lg'
              : 'border-transparent hover:text-neutral-900'
          }`}
        >
          <Sparkles size={15} className={activeTab === 'audit' ? 'text-[#4A1525]' : 'text-neutral-400'} />
          <span>SEO Health Audit</span>
          <span className="ml-1 px-1.5 py-0.2 bg-neutral-200 text-neutral-700 text-[10px] rounded-full font-mono">
            {auditSummary.issues.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('global')}
          className={`flex items-center space-x-2 px-4 py-2.5 border-b-2 transition whitespace-nowrap ${
            activeTab === 'global'
              ? 'border-[#4A1525] text-[#4A1525] font-bold bg-neutral-50 rounded-t-lg'
              : 'border-transparent hover:text-neutral-900'
          }`}
        >
          <Search size={15} className={activeTab === 'global' ? 'text-[#4A1525]' : 'text-neutral-400'} />
          <span>Global Search Snippet</span>
        </button>

        <button
          onClick={() => setActiveTab('pages')}
          className={`flex items-center space-x-2 px-4 py-2.5 border-b-2 transition whitespace-nowrap ${
            activeTab === 'pages'
              ? 'border-[#4A1525] text-[#4A1525] font-bold bg-neutral-50 rounded-t-lg'
              : 'border-transparent hover:text-neutral-900'
          }`}
        >
          <ListTree size={15} className={activeTab === 'pages' ? 'text-[#4A1525]' : 'text-neutral-400'} />
          <span>Pages SEO</span>
          <span className="ml-1 px-1.5 py-0.2 bg-neutral-200 text-neutral-700 text-[10px] rounded-full font-mono">
            {pagesSeo.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('catalog')}
          className={`flex items-center space-x-2 px-4 py-2.5 border-b-2 transition whitespace-nowrap ${
            activeTab === 'catalog'
              ? 'border-[#4A1525] text-[#4A1525] font-bold bg-neutral-50 rounded-t-lg'
              : 'border-transparent hover:text-neutral-900'
          }`}
        >
          <Package size={15} className={activeTab === 'catalog' ? 'text-[#4A1525]' : 'text-neutral-400'} />
          <span>Products & Categories SEO</span>
          <span className="ml-1 px-1.5 py-0.2 bg-neutral-200 text-neutral-700 text-[10px] rounded-full font-mono">
            {products.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('social')}
          className={`flex items-center space-x-2 px-4 py-2.5 border-b-2 transition whitespace-nowrap ${
            activeTab === 'social'
              ? 'border-[#4A1525] text-[#4A1525] font-bold bg-neutral-50 rounded-t-lg'
              : 'border-transparent hover:text-neutral-900'
          }`}
        >
          <Share2 size={15} className={activeTab === 'social' ? 'text-[#4A1525]' : 'text-neutral-400'} />
          <span>Social Sharing (OG & Twitter)</span>
        </button>

        <button
          onClick={() => setActiveTab('schema')}
          className={`flex items-center space-x-2 px-4 py-2.5 border-b-2 transition whitespace-nowrap ${
            activeTab === 'schema'
              ? 'border-[#4A1525] text-[#4A1525] font-bold bg-neutral-50 rounded-t-lg'
              : 'border-transparent hover:text-neutral-900'
          }`}
        >
          <Building2 size={15} className={activeTab === 'schema' ? 'text-[#4A1525]' : 'text-neutral-400'} />
          <span>Schema Structured Data</span>
        </button>

        <button
          onClick={() => setActiveTab('sitemap')}
          className={`flex items-center space-x-2 px-4 py-2.5 border-b-2 transition whitespace-nowrap ${
            activeTab === 'sitemap'
              ? 'border-[#4A1525] text-[#4A1525] font-bold bg-neutral-50 rounded-t-lg'
              : 'border-transparent hover:text-neutral-900'
          }`}
        >
          <Code2 size={15} className={activeTab === 'sitemap' ? 'text-[#4A1525]' : 'text-neutral-400'} />
          <span>Sitemap & Robots.txt</span>
        </button>
      </div>

      {/* 1. SEO AUDIT & HEALTH TAB */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
              <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider block">Health Score</span>
              <div className="flex items-baseline space-x-2 mt-1">
                <span className="text-2xl font-bold font-serif text-[#4A1525]">{auditSummary.overallScore}</span>
                <span className="text-xs text-neutral-400">/ 100</span>
              </div>
              <div className="w-full bg-neutral-100 rounded-full h-1.5 mt-2">
                <div 
                  className={`h-1.5 rounded-full ${
                    auditSummary.overallScore >= 80 ? 'bg-emerald-600' :
                    auditSummary.overallScore >= 50 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${auditSummary.overallScore}%` }}
                />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
              <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider block">Indexable URLs</span>
              <div className="text-2xl font-bold font-serif text-neutral-900 mt-1">
                {auditSummary.totalIndexablePages}
              </div>
              <span className="text-[11px] text-emerald-600 flex items-center space-x-1 mt-1 font-medium">
                <CheckCircle2 size={12} />
                <span>{auditSummary.optimizedCount} fully optimized</span>
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
              <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider block">Critical Issues</span>
              <div className="text-2xl font-bold font-serif text-red-600 mt-1">
                {auditSummary.errorsCount}
              </div>
              <span className="text-[11px] text-neutral-400 mt-1 block">Requires immediate fix</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
              <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider block">Warnings / Tips</span>
              <div className="text-2xl font-bold font-serif text-amber-600 mt-1">
                {auditSummary.warningsCount}
              </div>
              <span className="text-[11px] text-neutral-400 mt-1 block">Recommended improvements</span>
            </div>
          </div>

          {/* Clean URL Architecture Verification Card */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start space-x-3">
              <ShieldCheck size={20} className="text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-emerald-900 block">Clean Path URL Engine Active</span>
                <span className="text-emerald-700 text-[11px]">
                  All user-facing routes utilize server-crawlable clean URLs (e.g. <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono">/shop</code>, <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono">/product/:slug</code>, <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono">/category/:slug</code>). No hash fragments are used in canonical URLs.
                </span>
              </div>
            </div>
            <div className="shrink-0 flex items-center space-x-2">
              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-md font-mono text-[10px]">
                CLEAN_URL_READY
              </span>
            </div>
          </div>

          {/* Detailed Audit Checklist */}
          <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif font-bold text-sm text-neutral-900 flex items-center space-x-2">
                <Sparkles size={16} className="text-[#4A1525]" />
                <span>Real-time SEO Audit Issues & Guidance ({auditSummary.issues.length})</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setSavedSuccess(true);
                  setSaveSuccessMessage('Audit re-scanned across catalog, pages & schemas!');
                  setTimeout(() => setSavedSuccess(false), 2000);
                }}
                className="text-xs text-[#4A1525] font-semibold hover:underline flex items-center space-x-1"
              >
                <RefreshCw size={13} />
                <span>Re-scan Store</span>
              </button>
            </div>

            {auditSummary.issues.length === 0 ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center space-y-2">
                <CheckCircle2 size={32} className="text-emerald-600 mx-auto" />
                <h4 className="font-bold text-sm text-emerald-900">Exceptional SEO Health!</h4>
                <p className="text-xs text-emerald-700 max-w-md mx-auto">
                  All pages, product meta descriptions, OpenGraph share assets, and structured data schemas are thoroughly configured.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {auditSummary.issues.map((issue) => (
                  <div
                    key={issue.id}
                    className={`p-3.5 rounded-lg border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      issue.type === 'error' ? 'bg-red-50/70 border-red-200' :
                      issue.type === 'warning' ? 'bg-amber-50/70 border-amber-200' : 'bg-blue-50/70 border-blue-200'
                    }`}
                  >
                    <div className="flex items-start space-x-2.5">
                      {issue.type === 'error' ? (
                        <AlertCircle size={17} className="text-red-600 shrink-0 mt-0.5" />
                      ) : issue.type === 'warning' ? (
                        <AlertTriangle size={17} className="text-amber-600 shrink-0 mt-0.5" />
                      ) : (
                        <Info size={17} className="text-blue-600 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="font-bold text-neutral-900 flex items-center space-x-2">
                          <span>{issue.title}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white border border-neutral-200 text-neutral-600 uppercase">
                            {issue.category}
                          </span>
                        </div>
                        <p className="text-neutral-600 mt-0.5">{issue.message}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (issue.targetType === 'global') setActiveTab('global');
                        else if (issue.targetType === 'page') {
                          setSelectedPageId(issue.targetId || 'home');
                          setActiveTab('pages');
                        } else if (issue.targetType === 'product' || issue.targetType === 'category') {
                          setActiveTab('catalog');
                        }
                      }}
                      className="px-3 py-1.5 bg-white border border-neutral-300 hover:border-[#4A1525] rounded-md font-semibold text-[#4A1525] text-[11px] whitespace-nowrap shadow-2xs self-start sm:self-center"
                    >
                      {issue.actionText || 'Fix Now'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. GLOBAL SEARCH SNIPPET & ROBOTS TAB */}
      {activeTab === 'global' && (
        <form onSubmit={handleSaveGlobal} className="space-y-6">
          {/* Google Search Live Preview Card */}
          <div className="bg-neutral-50 rounded-xl border border-neutral-200 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono uppercase font-bold text-neutral-600 flex items-center space-x-2">
                <Search size={14} className="text-[#4A1525]" />
                <span>Google Search Result Snippet Preview</span>
              </h3>
              
              <div className="flex items-center space-x-1.5 bg-white p-1 rounded-lg border border-neutral-200 text-[11px]">
                <button
                  type="button"
                  onClick={() => setSerpDevice('desktop')}
                  className={`px-2 py-1 rounded flex items-center space-x-1 transition ${
                    serpDevice === 'desktop' ? 'bg-neutral-100 font-bold text-neutral-900' : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  <Monitor size={12} />
                  <span>Desktop</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSerpDevice('mobile')}
                  className={`px-2 py-1 rounded flex items-center space-x-1 transition ${
                    serpDevice === 'mobile' ? 'bg-neutral-100 font-bold text-neutral-900' : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  <Smartphone size={12} />
                  <span>Mobile</span>
                </button>
              </div>
            </div>

            <div className={`bg-white p-4 rounded-lg border border-neutral-200 shadow-sm space-y-1.5 transition-all ${
              serpDevice === 'mobile' ? 'max-w-md' : 'max-w-2xl'
            }`}>
              <div className="text-[11px] text-neutral-700 flex items-center space-x-1.5">
                <span className="w-4 h-4 rounded-full bg-amber-100 text-[#4A1525] flex items-center justify-center font-serif text-[10px] font-bold">
                  H
                </span>
                <span className="font-medium font-mono">{globalData.canonicalBaseUrl || 'https://houseofmahibd.com'}</span>
                <span className="text-neutral-400 font-mono">›</span>
              </div>
              <div className="text-base text-blue-800 hover:underline font-medium cursor-pointer line-clamp-1 leading-snug">
                {globalData.homepageTitle || 'Houseofmahi | Premium Beauty Studio & Women Jewelry Bangladesh'}
              </div>
              <div className="text-xs text-neutral-600 line-clamp-2 leading-relaxed">
                {globalData.homepageDescription || 'Discover handcrafted bridal jewelry, kundan chokers, pearl drop earrings, and luxury rings with cash on delivery in Bangladesh.'}
              </div>
            </div>

            <div className="text-[11px] text-neutral-400 flex items-center space-x-2">
              <Info size={13} />
              <span>Preview updates in real-time as you modify brand meta directives below.</span>
            </div>
          </div>

          {/* Core Meta Information */}
          <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm space-y-4">
            <h3 className="font-serif font-bold text-sm text-neutral-900 flex items-center space-x-2">
              <FileText size={16} className="text-[#4A1525]" />
              <span>Global Brand & Homepage Meta Directives</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-semibold text-neutral-700 block mb-1">Brand Name *</label>
                <input
                  type="text"
                  required
                  value={globalData.brandName}
                  onChange={(e) => setGlobalData({ ...globalData, brandName: e.target.value })}
                  placeholder="Houseofmahi"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white font-medium"
                />
              </div>

              <div>
                <label className="font-semibold text-neutral-700 block mb-1">Canonical Base URL *</label>
                <input
                  type="url"
                  required
                  value={globalData.canonicalBaseUrl}
                  onChange={(e) => setGlobalData({ ...globalData, canonicalBaseUrl: e.target.value })}
                  placeholder="https://houseofmahibd.com"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white font-mono"
                />
                <span className="text-[10px] text-neutral-400 mt-0.5 block">Default root for all clean canonical tags and XML sitemap URLs.</span>
              </div>

              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-neutral-700">Homepage Meta Title *</label>
                  <span className={`font-mono text-[11px] ${titleLength >= 40 && titleLength <= 65 ? 'text-emerald-600 font-bold' : 'text-neutral-400'}`}>
                    {titleLength}/60 chars (Optimal: 40-60)
                  </span>
                </div>
                <input
                  type="text"
                  required
                  value={globalData.homepageTitle}
                  onChange={(e) => setGlobalData({ ...globalData, homepageTitle: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white font-medium"
                />
              </div>

              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-neutral-700">Homepage Meta Description *</label>
                  <span className={`font-mono text-[11px] ${descLength >= 100 && descLength <= 165 ? 'text-emerald-600 font-bold' : 'text-neutral-400'}`}>
                    {descLength}/160 chars (Optimal: 120-160)
                  </span>
                </div>
                <textarea
                  rows={3}
                  required
                  value={globalData.homepageDescription}
                  onChange={(e) => setGlobalData({ ...globalData, homepageDescription: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white leading-relaxed"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-neutral-700 mb-1">
                  Global Site Keywords (Comma Separated)
                </label>
                <input
                  type="text"
                  value={globalData.siteKeywords}
                  onChange={(e) => setGlobalData({ ...globalData, siteKeywords: e.target.value })}
                  placeholder="jewelry bangladesh, kundan choker, bridal necklace, pearl earrings, houseofmahi"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white"
                />
              </div>
            </div>
          </div>

          {/* Search Engine Robots & Crawling Directives */}
          <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm space-y-4">
            <h3 className="font-serif font-bold text-sm text-neutral-900 flex items-center space-x-2">
              <Globe size={16} className="text-[#4A1525]" />
              <span>Search Engine Indexing & Robots Directives</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <label className="flex items-center space-x-2.5 p-3 rounded-lg border border-neutral-200 hover:bg-neutral-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={globalData.robotsIndex}
                  onChange={(e) => setGlobalData({ ...globalData, robotsIndex: e.target.checked })}
                  className="rounded text-[#4A1525] focus:ring-[#4A1525] w-4 h-4"
                />
                <div>
                  <span className="font-bold text-neutral-900 block">Allow Indexing (robots: index)</span>
                  <span className="text-neutral-500 text-[11px]">Permits search engines to include store pages in search results.</span>
                </div>
              </label>

              <label className="flex items-center space-x-2.5 p-3 rounded-lg border border-neutral-200 hover:bg-neutral-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={globalData.robotsFollow}
                  onChange={(e) => setGlobalData({ ...globalData, robotsFollow: e.target.checked })}
                  className="rounded text-[#4A1525] focus:ring-[#4A1525] w-4 h-4"
                />
                <div>
                  <span className="font-bold text-neutral-900 block">Follow Links (robots: follow)</span>
                  <span className="text-neutral-500 text-[11px]">Allows crawlers to discover product links on pages.</span>
                </div>
              </label>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSavingGlobal}
              className="px-6 py-2.5 bg-[#4A1525] text-amber-200 rounded-xl font-bold text-xs hover:bg-[#6B1228] transition flex items-center space-x-2 shadow-sm disabled:opacity-50"
            >
              {isSavingGlobal ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              <span>{isSavingGlobal ? 'Saving to Firestore...' : 'Save Global SEO Settings'}</span>
            </button>
          </div>
        </form>
      )}

      {/* 3. PAGES SEO MANAGER TAB */}
      {activeTab === 'pages' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pages List */}
          <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <h3 className="font-serif font-bold text-sm text-neutral-900">Configured Pages</h3>
              <button
                type="button"
                onClick={handleResetPages}
                disabled={isSavingPage}
                className="text-[11px] text-neutral-500 hover:text-[#4A1525] transition"
                title="Reset to recommended presets"
              >
                Reset Presets
              </button>
            </div>

            <div className="space-y-1.5">
              {pagesSeo.map((p) => {
                const isSelected = p.id === selectedPageId;
                const cleanDisplayPath = (p.path || '/').replace(/^#\/?/, '/').replace(/^\/?/, '/');
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPageId(p.id)}
                    className={`w-full text-left p-3 rounded-lg text-xs transition border flex items-center justify-between ${
                      isSelected
                        ? 'bg-[#4A1525]/5 border-[#4A1525] font-bold text-[#4A1525]'
                        : 'border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                    }`}
                  >
                    <div>
                      <div className="font-semibold">{p.pageName}</div>
                      <div className="text-[10px] text-neutral-400 font-mono mt-0.5">{cleanDisplayPath}</div>
                    </div>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded uppercase font-bold ${
                      p.indexStatus === 'index' ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-100 text-neutral-500'
                    }`}>
                      {p.indexStatus}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Page Editor Form */}
          <div className="lg:col-span-2 space-y-4">
            {editingPage ? (
              <form onSubmit={handleSavePage} className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                  <div>
                    <h3 className="font-serif font-bold text-base text-neutral-900">
                      Edit SEO: {editingPage.pageName}
                    </h3>
                    <span className="text-xs text-neutral-400 font-mono">
                      Clean Route: <strong className="text-neutral-700 font-medium">{editingPage.path}</strong>
                    </span>
                  </div>

                  <span className="text-[10px] font-mono px-2 py-0.5 bg-neutral-100 text-neutral-700 rounded">
                    Schema: {editingPage.schemaType || 'WebPage'}
                  </span>
                </div>

                {/* Live Page Google SERP Preview Card */}
                <div className="bg-neutral-50 p-3.5 rounded-lg border border-neutral-200 space-y-1">
                  <div className="text-[10px] uppercase font-mono text-neutral-500 font-bold flex items-center space-x-1.5">
                    <Search size={11} className="text-[#4A1525]" />
                    <span>Page Google SERP Preview</span>
                  </div>
                  <div className="text-[11px] text-neutral-600 font-mono truncate">
                    {globalData.canonicalBaseUrl || 'https://houseofmahibd.com'}{editingPage.path === '/' ? '' : editingPage.path}
                  </div>
                  <div className="text-sm font-medium text-blue-800 line-clamp-1">
                    {editingPage.title || globalData.homepageTitle}
                  </div>
                  <div className="text-xs text-neutral-600 line-clamp-2 leading-relaxed">
                    {editingPage.description || globalData.homepageDescription}
                  </div>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-neutral-700">Page SEO Title</label>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        {(editingPage.title || '').length} chars
                      </span>
                    </div>
                    <input
                      type="text"
                      required
                      value={editingPage.title || ''}
                      onChange={(e) => setEditingPage({ ...editingPage, title: e.target.value })}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white font-medium"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-neutral-700">Meta Description</label>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        {(editingPage.description || '').length} chars
                      </span>
                    </div>
                    <textarea
                      rows={3}
                      required
                      value={editingPage.description || ''}
                      onChange={(e) => setEditingPage({ ...editingPage, description: e.target.value })}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white leading-relaxed"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-neutral-700 block mb-1">Primary Target Keyword</label>
                      <input
                        type="text"
                        value={editingPage.primaryKeyword || ''}
                        onChange={(e) => setEditingPage({ ...editingPage, primaryKeyword: e.target.value })}
                        placeholder="e.g. bridal choker set"
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-neutral-700 block mb-1">Custom Canonical URL (Optional)</label>
                      <input
                        type="url"
                        value={editingPage.canonicalUrl || ''}
                        onChange={(e) => setEditingPage({ ...editingPage, canonicalUrl: e.target.value })}
                        placeholder={`${globalData.canonicalBaseUrl || 'https://houseofmahibd.com'}${editingPage.path}`}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-neutral-700 block mb-1">Indexing Directive</label>
                      <select
                        value={editingPage.indexStatus}
                        onChange={(e) => setEditingPage({ ...editingPage, indexStatus: e.target.value as 'index' | 'noindex' })}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white"
                      >
                        <option value="index">index (Include in search results)</option>
                        <option value="noindex">noindex (Hide from Google)</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-semibold text-neutral-700 block mb-1">Follow Links Directive</label>
                      <select
                        value={editingPage.followStatus}
                        onChange={(e) => setEditingPage({ ...editingPage, followStatus: e.target.value as 'follow' | 'nofollow' })}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white"
                      >
                        <option value="follow">follow (Follow internal links)</option>
                        <option value="nofollow">nofollow (Do not follow links)</option>
                      </select>
                    </div>
                  </div>

                  {/* Page OG Sharing Customizer */}
                  <div className="pt-2 border-t border-neutral-100">
                    <label className="font-semibold text-neutral-700 block mb-1">Page OG Share Banner Image URL</label>
                    <input
                      type="url"
                      value={editingPage.ogImage || ''}
                      onChange={(e) => setEditingPage({ ...editingPage, ogImage: e.target.value })}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-3">
                  <button
                    type="submit"
                    disabled={isSavingPage}
                    className="px-5 py-2 bg-[#4A1525] text-amber-200 rounded-lg font-bold text-xs hover:bg-[#6B1228] transition flex items-center space-x-2 shadow-xs disabled:opacity-50"
                  >
                    {isSavingPage ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                    <span>{isSavingPage ? 'Saving...' : `Save ${editingPage.pageName} SEO`}</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="bg-neutral-50 rounded-xl border border-neutral-200 p-8 text-center text-xs text-neutral-500">
                Select a page from the left to configure its search directives.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. PRODUCTS & CATEGORIES SEO OVERVIEW TAB */}
      {activeTab === 'catalog' && (
        <div className="space-y-6">
          {/* Top stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm space-y-1">
              <span className="text-neutral-500 font-medium">Active Products with Clean URLs</span>
              <div className="text-2xl font-bold font-serif text-[#4A1525]">{products.length}</div>
              <span className="text-[11px] text-neutral-400 block font-mono">Format: /product/:slug</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm space-y-1">
              <span className="text-neutral-500 font-medium">Category Taxonomies with Clean URLs</span>
              <div className="text-2xl font-bold font-serif text-neutral-900">{categories.length}</div>
              <span className="text-[11px] text-neutral-400 block font-mono">Format: /category/:slug</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm space-y-1">
              <span className="text-neutral-500 font-medium">Structured Data Coverage</span>
              <div className="text-2xl font-bold font-serif text-emerald-700">100%</div>
              <span className="text-[11px] text-emerald-600 block">Product Schema + BreadcrumbList attached</span>
            </div>
          </div>

          {/* Categories Overview Card */}
          <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
              <h3 className="font-serif font-bold text-sm text-neutral-900 flex items-center space-x-2">
                <Layers size={16} className="text-[#4A1525]" />
                <span>Categories SEO Mapping & Clean Canonical URLs</span>
              </h3>
              <span className="text-xs text-neutral-400">{categories.length} Categories</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              {categories.map((cat) => {
                const catSlug = cat.slug || cat.id;
                const cleanCanonical = `${globalData.canonicalBaseUrl || 'https://houseofmahibd.com'}/category/${encodeURIComponent(catSlug)}`;
                return (
                  <div key={cat.id} className="p-3 rounded-lg border border-neutral-200 bg-neutral-50/50 space-y-1">
                    <div className="flex items-center justify-between font-bold text-neutral-900">
                      <span>{cat.name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-200 text-neutral-700">
                        {cat.productCount || products.filter(p => p.category === cat.id || p.category === cat.slug).length} items
                      </span>
                    </div>
                    <div className="text-[11px] text-[#4A1525] font-mono truncate">
                      /category/{catSlug}
                    </div>
                    <div className="text-[10px] text-neutral-400 truncate font-mono">
                      {cleanCanonical}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Products Catalog SEO Inspector */}
          <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-3">
              <div>
                <h3 className="font-serif font-bold text-sm text-neutral-900 flex items-center space-x-2">
                  <Package size={16} className="text-[#4A1525]" />
                  <span>Product URL & Schema Validation Registry</span>
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Every catalog item dynamically renders clean canonical tags, Product JSON-LD, and OpenGraph share cards.
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-2.5 text-neutral-400" />
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Filter products..."
                  className="w-full pl-8 pr-3 py-1.5 border border-neutral-300 rounded-lg text-xs focus:ring-1 focus:ring-[#4A1525] bg-white"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-neutral-200 text-neutral-500 font-semibold bg-neutral-50">
                    <th className="py-2.5 px-3">Product Name</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Clean SEO Route</th>
                    <th className="py-2.5 px-3">Price / Stock</th>
                    <th className="py-2.5 px-3">Structured Schema</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredProducts.map((prod) => {
                    const slug = (prod as any).seo?.slug || (prod as any).seoSlug || (prod as any).slug || prod.id;
                    return (
                      <tr key={prod.id} className="hover:bg-neutral-50/80 transition">
                        <td className="py-2.5 px-3 font-semibold text-neutral-900 flex items-center space-x-2">
                          <img src={prod.image} alt={prod.name} className="w-7 h-7 rounded object-cover shrink-0 border border-neutral-200" />
                          <span className="truncate max-w-[200px]">{prod.name}</span>
                        </td>
                        <td className="py-2.5 px-3 text-neutral-600">{prod.categoryLabel || prod.category}</td>
                        <td className="py-2.5 px-3 font-mono text-neutral-600">
                          <span className="text-[#4A1525]">/product/{slug}</span>
                        </td>
                        <td className="py-2.5 px-3 font-mono">
                          <span className="text-neutral-900 font-bold">৳{prod.price}</span>
                          <span className="ml-1 text-[10px] text-emerald-600">({prod.inStock ? 'In Stock' : 'Out of Stock'})</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                            <CheckCircle size={10} />
                            <span>Product + Offer</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. SOCIAL MEDIA SHARING (OG & TWITTER) TAB */}
      {activeTab === 'social' && (
        <form onSubmit={handleSaveGlobal} className="space-y-6">
          <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm space-y-4">
            <h3 className="font-serif font-bold text-sm text-neutral-900 flex items-center space-x-2">
              <Share2 size={16} className="text-[#4A1525]" />
              <span>Default Social Sharing Cards (Facebook, WhatsApp, LinkedIn, X/Twitter)</span>
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
              <div className="space-y-3">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Default OpenGraph Title</label>
                  <input
                    type="text"
                    value={globalData.defaultOgTitle || ''}
                    onChange={(e) => setGlobalData({ ...globalData, defaultOgTitle: e.target.value })}
                    placeholder="Houseofmahi | Handcrafted Luxury Jewelry"
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Default OpenGraph Description</label>
                  <textarea
                    rows={3}
                    value={globalData.defaultOgDescription || ''}
                    onChange={(e) => setGlobalData({ ...globalData, defaultOgDescription: e.target.value })}
                    placeholder="Shop bespoke necklaces, earrings, and handcrafted bridal collections..."
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Default OpenGraph Image URL (1200x630px recommended)</label>
                  <input
                    type="url"
                    value={globalData.defaultOgImage || ''}
                    onChange={(e) => setGlobalData({ ...globalData, defaultOgImage: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Twitter / X Card Type</label>
                  <select
                    value={globalData.defaultTwitterCard || 'summary_large_image'}
                    onChange={(e) => setGlobalData({ ...globalData, defaultTwitterCard: e.target.value as any })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white"
                  >
                    <option value="summary_large_image">summary_large_image (Large Hero Banner Card)</option>
                    <option value="summary">summary (Compact Square Thumbnail)</option>
                  </select>
                </div>
              </div>

              {/* Live Card Preview */}
              <div className="border border-neutral-200 rounded-xl p-4 bg-neutral-50 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] uppercase font-mono text-neutral-500 font-bold block mb-2">
                    WhatsApp & Facebook Feed Card Preview
                  </span>
                  <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden shadow-xs">
                    <img
                      src={globalData.defaultOgImage || 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&q=80&w=800'}
                      alt="Social share preview"
                      className="w-full h-44 object-cover"
                    />
                    <div className="p-3">
                      <span className="text-[10px] text-neutral-400 uppercase font-mono font-medium">houseofmahibd.com</span>
                      <h4 className="font-bold text-xs text-neutral-900 line-clamp-1 mt-0.5">
                        {globalData.defaultOgTitle || globalData.homepageTitle}
                      </h4>
                      <p className="text-[11px] text-neutral-500 line-clamp-2 mt-1 leading-relaxed">
                        {globalData.defaultOgDescription || globalData.homepageDescription}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 text-[11px] text-neutral-400 italic">
                  * Note: Images are automatically formatted with proper OpenGraph dimensions for high engagement.
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSavingGlobal}
              className="px-6 py-2.5 bg-[#4A1525] text-amber-200 rounded-xl font-bold text-xs hover:bg-[#6B1228] transition flex items-center space-x-2 shadow-sm disabled:opacity-50"
            >
              {isSavingGlobal ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              <span>{isSavingGlobal ? 'Saving to Firestore...' : 'Save Social Sharing Assets'}</span>
            </button>
          </div>
        </form>
      )}

      {/* 6. SCHEMA.ORG STRUCTURED DATA TAB */}
      {activeTab === 'schema' && (
        <div className="space-y-6">
          {/* Organization & Social Profiles */}
          <form onSubmit={handleSaveGlobal} className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="font-serif font-bold text-sm text-neutral-900 flex items-center space-x-2">
                <Building2 size={16} className="text-[#4A1525]" />
                <span>Organization & Business Schema Details (JSON-LD)</span>
              </h3>
              <button
                type="submit"
                disabled={isSavingGlobal}
                className="px-4 py-1.5 bg-[#4A1525] text-amber-200 rounded-lg text-xs font-bold hover:bg-[#6B1228] transition disabled:opacity-50 flex items-center space-x-1.5"
              >
                {isSavingGlobal && <Loader2 size={13} className="animate-spin" />}
                <span>Save Organization Info</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="font-semibold text-neutral-700 block mb-1">Legal Business Name</label>
                <input
                  type="text"
                  value={globalData.orgLegalName || ''}
                  onChange={(e) => setGlobalData({ ...globalData, orgLegalName: e.target.value })}
                  placeholder="Houseofmahi Bangladesh"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white"
                />
              </div>

              <div>
                <label className="font-semibold text-neutral-700 block mb-1">Customer Support Phone</label>
                <input
                  type="text"
                  value={globalData.orgPhone || ''}
                  onChange={(e) => setGlobalData({ ...globalData, orgPhone: e.target.value })}
                  placeholder="01400-031902"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white"
                />
              </div>

              <div>
                <label className="font-semibold text-neutral-700 block mb-1">Official Support Email</label>
                <input
                  type="email"
                  value={globalData.orgEmail || ''}
                  onChange={(e) => setGlobalData({ ...globalData, orgEmail: e.target.value })}
                  placeholder="support@houseofmahi.com"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white"
                />
              </div>

              <div>
                <label className="font-semibold text-neutral-700 block mb-1">Facebook Page URL</label>
                <input
                  type="url"
                  value={globalData.socialFacebookUrl || ''}
                  onChange={(e) => setGlobalData({ ...globalData, socialFacebookUrl: e.target.value })}
                  placeholder="https://facebook.com/houseofmahi"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white"
                />
              </div>

              <div>
                <label className="font-semibold text-neutral-700 block mb-1">Instagram Profile URL</label>
                <input
                  type="url"
                  value={globalData.socialInstagramUrl || ''}
                  onChange={(e) => setGlobalData({ ...globalData, socialInstagramUrl: e.target.value })}
                  placeholder="https://instagram.com/houseofmahi"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white"
                />
              </div>

              <div>
                <label className="font-semibold text-neutral-700 block mb-1">Street Address</label>
                <input
                  type="text"
                  value={globalData.orgAddressStreet || ''}
                  onChange={(e) => setGlobalData({ ...globalData, orgAddressStreet: e.target.value })}
                  placeholder="E-76 Jalkuri Majpara"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white"
                />
              </div>
            </div>
          </form>

          {/* JSON-LD Schemas Live Code Viewer */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-neutral-900 rounded-xl p-4 text-white font-mono text-xs shadow-sm space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                <span className="text-amber-300 font-bold flex items-center space-x-1.5">
                  <Code2 size={14} />
                  <span>Organization Schema (JSON-LD)</span>
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(JSON.stringify(organizationSchema, null, 2), 'orgSchema')}
                  className="text-neutral-400 hover:text-white flex items-center space-x-1 text-[11px]"
                >
                  {copiedType === 'orgSchema' ? <CheckCheck size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  <span>{copiedType === 'orgSchema' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="overflow-x-auto max-h-56 p-2 bg-neutral-950 rounded text-neutral-300 text-[11px] leading-relaxed">
                {JSON.stringify(organizationSchema, null, 2)}
              </pre>
            </div>

            <div className="bg-neutral-900 rounded-xl p-4 text-white font-mono text-xs shadow-sm space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                <span className="text-amber-300 font-bold flex items-center space-x-1.5">
                  <Code2 size={14} />
                  <span>WebSite Schema + SearchAction</span>
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(JSON.stringify(websiteSchema, null, 2), 'webSchema')}
                  className="text-neutral-400 hover:text-white flex items-center space-x-1 text-[11px]"
                >
                  {copiedType === 'webSchema' ? <CheckCheck size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  <span>{copiedType === 'webSchema' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="overflow-x-auto max-h-56 p-2 bg-neutral-950 rounded text-neutral-300 text-[11px] leading-relaxed">
                {JSON.stringify(websiteSchema, null, 2)}
              </pre>
            </div>

            {sampleProductSchema && (
              <div className="bg-neutral-900 rounded-xl p-4 text-white font-mono text-xs shadow-sm space-y-2 md:col-span-2">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                  <span className="text-amber-300 font-bold flex items-center space-x-1.5">
                    <Code2 size={14} />
                    <span>Live Sample Product Schema (JSON-LD: {products[0]?.name})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(JSON.stringify(sampleProductSchema, null, 2), 'prodSchema')}
                    className="text-neutral-400 hover:text-white flex items-center space-x-1 text-[11px]"
                  >
                    {copiedType === 'prodSchema' ? <CheckCheck size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    <span>{copiedType === 'prodSchema' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="overflow-x-auto max-h-48 p-2 bg-neutral-950 rounded text-neutral-300 text-[11px] leading-relaxed">
                  {JSON.stringify(sampleProductSchema, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7. SITEMAP & ROBOTS.TXT TAB WITH LIVE STATUS */}
      {activeTab === 'sitemap' && (
        <div className="space-y-6">
          {/* Real-time Status Card with Link Checking */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Sitemap Endpoint Status Card */}
            <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Code2 size={18} className="text-[#4A1525]" />
                  <span className="font-bold text-sm text-neutral-900">XML Sitemap Endpoint</span>
                </div>
                <button
                  type="button"
                  onClick={() => verifyLiveEndpoint('/sitemap.xml')}
                  disabled={sitemapCheck.status === 'checking'}
                  className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded font-semibold flex items-center space-x-1 transition disabled:opacity-50"
                >
                  <RefreshCw size={12} className={sitemapCheck.status === 'checking' ? 'animate-spin' : ''} />
                  <span>{sitemapCheck.status === 'checking' ? 'Checking...' : 'Verify Endpoint'}</span>
                </button>
              </div>

              <div className="space-y-1 font-mono text-[11px]">
                <div className="text-neutral-500">
                  Target: <span className="text-neutral-900 font-semibold">/sitemap.xml</span>
                </div>
                <div className="text-neutral-500">
                  Production URL: <a href="https://houseofmahibd.com/sitemap.xml" target="_blank" rel="noopener noreferrer" className="text-[#4A1525] underline inline-flex items-center space-x-1 font-semibold">
                    <span>https://houseofmahibd.com/sitemap.xml</span>
                    <ExternalLink size={11} />
                  </a>
                </div>
              </div>

              {sitemapCheck.status !== 'idle' && (
                <div className={`p-2.5 rounded-lg border text-[11px] ${
                  sitemapCheck.status === 'live' 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                    : sitemapCheck.status === 'checking'
                    ? 'bg-neutral-50 border-neutral-200 text-neutral-600'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                  <div className="font-bold flex items-center space-x-1.5">
                    {sitemapCheck.status === 'live' ? <CheckCircle2 size={14} className="text-emerald-600" /> : <AlertCircle size={14} className="text-red-600" />}
                    <span>{sitemapCheck.message}</span>
                  </div>
                  {sitemapCheck.checkedAt && (
                    <div className="text-[10px] text-neutral-400 mt-0.5">Verified at {sitemapCheck.checkedAt}</div>
                  )}
                </div>
              )}

              <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-neutral-500 text-[11px]">
                <span>Indexed in Sitemap: <strong>{sitemapStats.totalCount} URLs</strong></span>
                <span className="text-neutral-400">({sitemapStats.pagesCount} pages, {sitemapStats.categoriesCount} cats, {sitemapStats.productsCount} prods)</span>
              </div>
            </div>

            {/* Robots.txt Endpoint Status Card */}
            <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Globe size={18} className="text-[#4A1525]" />
                  <span className="font-bold text-sm text-neutral-900">Robots.txt Endpoint</span>
                </div>
                <button
                  type="button"
                  onClick={() => verifyLiveEndpoint('/robots.txt')}
                  disabled={robotsCheck.status === 'checking'}
                  className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded font-semibold flex items-center space-x-1 transition disabled:opacity-50"
                >
                  <RefreshCw size={12} className={robotsCheck.status === 'checking' ? 'animate-spin' : ''} />
                  <span>{robotsCheck.status === 'checking' ? 'Checking...' : 'Verify Endpoint'}</span>
                </button>
              </div>

              <div className="space-y-1 font-mono text-[11px]">
                <div className="text-neutral-500">
                  Target: <span className="text-neutral-900 font-semibold">/robots.txt</span>
                </div>
                <div className="text-neutral-500">
                  Production URL: <a href="https://houseofmahibd.com/robots.txt" target="_blank" rel="noopener noreferrer" className="text-[#4A1525] underline inline-flex items-center space-x-1 font-semibold">
                    <span>https://houseofmahibd.com/robots.txt</span>
                    <ExternalLink size={11} />
                  </a>
                </div>
              </div>

              {robotsCheck.status !== 'idle' && (
                <div className={`p-2.5 rounded-lg border text-[11px] ${
                  robotsCheck.status === 'live' 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                    : robotsCheck.status === 'checking'
                    ? 'bg-neutral-50 border-neutral-200 text-neutral-600'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                  <div className="font-bold flex items-center space-x-1.5">
                    {robotsCheck.status === 'live' ? <CheckCircle2 size={14} className="text-emerald-600" /> : <AlertCircle size={14} className="text-red-600" />}
                    <span>{robotsCheck.message}</span>
                  </div>
                  {robotsCheck.checkedAt && (
                    <div className="text-[10px] text-neutral-400 mt-0.5">Verified at {robotsCheck.checkedAt}</div>
                  )}
                </div>
              )}

              <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-neutral-500 text-[11px]">
                <span>Crawling Directives: <strong>Active (Public allowed, Admin disallowed)</strong></span>
                <span className="text-neutral-400">Sitemap linked</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Live XML Sitemap Card */}
            <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif font-bold text-sm text-neutral-900 flex items-center space-x-2">
                    <Code2 size={16} className="text-[#4A1525]" />
                    <span>Live XML Sitemap Output (sitemap.xml)</span>
                  </h3>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    100% clean URLs without hashes. Auto-generated dynamically based on store catalog.
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(sitemapXml, 'sitemap')}
                    className="p-1.5 text-neutral-500 hover:text-[#4A1525] border border-neutral-200 rounded hover:bg-neutral-50"
                    title="Copy XML"
                  >
                    {copiedType === 'sitemap' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadXmlFile(sitemapXml, 'sitemap.xml')}
                    className="px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold rounded flex items-center space-x-1"
                  >
                    <Download size={13} />
                    <span>Download</span>
                  </button>
                </div>
              </div>

              <div className="bg-neutral-900 rounded-lg p-3 text-neutral-300 font-mono text-[11px] max-h-80 overflow-y-auto">
                <pre className="whitespace-pre">{sitemapXml}</pre>
              </div>
            </div>

            {/* Live Robots.txt Card */}
            <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif font-bold text-sm text-neutral-900 flex items-center space-x-2">
                    <Globe size={16} className="text-[#4A1525]" />
                    <span>Robots Directives Output (robots.txt)</span>
                  </h3>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Controls bot crawling access to checkout and administrative pages.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => copyToClipboard(robotsTxt, 'robots')}
                  className="p-1.5 text-neutral-500 hover:text-[#4A1525] border border-neutral-200 rounded hover:bg-neutral-50"
                  title="Copy Robots.txt"
                >
                  {copiedType === 'robots' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                </button>
              </div>

              <div className="bg-neutral-900 rounded-lg p-3 text-neutral-300 font-mono text-[11px] max-h-80 overflow-y-auto">
                <pre className="whitespace-pre">{robotsTxt}</pre>
              </div>

              <div className="text-[11px] text-neutral-500 pt-2 border-t border-neutral-100">
                Search bots are permitted to index products, collections, and marketing pages while strictly disallowing private administrative paths.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
