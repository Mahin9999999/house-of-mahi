import React, { useState } from 'react';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Image as ImageIcon, 
  Eye, 
  EyeOff, 
  ArrowUp, 
  ArrowDown, 
  X, 
  Save, 
  Sparkles,
  Upload,
  Loader2,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { useAdminStore } from '../../store/useAdminStore';
import { HeroBanner } from '../../types';
import { uploadImageToCloudinary } from '../../firebase/cloudinaryService';

export const BannersModule: React.FC = () => {
  // Use canonical heroBanners state and dedicated CRUD actions from useAdminStore
  const { 
    heroBanners, 
    addHeroBanner, 
    updateHeroBanner, 
    deleteHeroBanner, 
    toggleHeroBannerStatus, 
    reorderHeroBanners,
    isSyncing 
  } = useAdminStore();

  const [isAddingBanner, setIsAddingBanner] = useState(false);
  const [editingBanner, setEditingBanner] = useState<HeroBanner | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Upload States
  const [isUploadingDesktop, setIsUploadingDesktop] = useState(false);
  const [isUploadingMobile, setIsUploadingMobile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Form Data with clean initial values (NO hardcoded demo / Unsplash URLs)
  const [formData, setFormData] = useState<{
    title: string;
    subtitle: string;
    tagline: string;
    desktopImage: string;
    mobileImage: string;
    imageAlt: string;
    buttonText: string;
    buttonUrl: string;
    secondaryButtonText: string;
    secondaryButtonUrl: string;
    textAlignment: 'left' | 'center' | 'right';
    theme: 'dark' | 'light';
    isActive: boolean;
    sortOrder: number;
  }>({
    title: '',
    subtitle: '',
    tagline: '',
    desktopImage: '',
    mobileImage: '',
    imageAlt: '',
    buttonText: 'Shop Collection',
    buttonUrl: '/#products',
    secondaryButtonText: '',
    secondaryButtonUrl: '',
    textAlignment: 'left',
    theme: 'dark',
    isActive: true,
    sortOrder: (heroBanners?.length || 0) + 1
  });

  const showNotification = (type: 'success' | 'error', text: string) => {
    setFeedbackMessage({ type, text });
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 4000);
  };

  const handleOpenAddForm = () => {
    setFormData({
      title: '',
      subtitle: '',
      tagline: '',
      desktopImage: '',
      mobileImage: '',
      imageAlt: '',
      buttonText: 'Shop Collection',
      buttonUrl: '/#products',
      secondaryButtonText: '',
      secondaryButtonUrl: '',
      textAlignment: 'left',
      theme: 'dark',
      isActive: true,
      sortOrder: (heroBanners?.length || 0) + 1
    });
    setUploadError(null);
    setIsAddingBanner(true);
    setEditingBanner(null);
  };

  const handleOpenEditForm = (banner: HeroBanner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title || '',
      subtitle: banner.subtitle || '',
      tagline: banner.tagline || '',
      desktopImage: banner.desktopImage || '',
      mobileImage: banner.mobileImage || '',
      imageAlt: banner.imageAlt || '',
      buttonText: banner.buttonText || 'Shop Collection',
      buttonUrl: banner.buttonUrl || '/#products',
      secondaryButtonText: banner.secondaryButtonText || '',
      secondaryButtonUrl: banner.secondaryButtonUrl || '',
      textAlignment: banner.textAlignment || 'left',
      theme: banner.theme || 'dark',
      isActive: banner.isActive !== false,
      sortOrder: banner.sortOrder ?? banner.displayOrder ?? 1
    });
    setUploadError(null);
    setIsAddingBanner(false);
  };

  const handleDesktopImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setUploadError('Image size exceeds 8MB limit. Please choose a smaller image.');
      return;
    }

    try {
      setIsUploadingDesktop(true);
      setUploadError(null);
      const url = await uploadImageToCloudinary(file, 'banners');
      setFormData((prev) => ({ 
        ...prev, 
        desktopImage: url,
        mobileImage: prev.mobileImage ? prev.mobileImage : url
      }));
      showNotification('success', 'Desktop banner image uploaded to Cloudinary successfully.');
    } catch (err: any) {
      console.error('Cloudinary banner upload error:', err);
      setUploadError(err?.message || 'Failed to upload desktop banner to Cloudinary.');
    } finally {
      setIsUploadingDesktop(false);
    }
  };

  const handleMobileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setUploadError('Image size exceeds 8MB limit. Please choose a smaller image.');
      return;
    }

    try {
      setIsUploadingMobile(true);
      setUploadError(null);
      const url = await uploadImageToCloudinary(file, 'banners');
      setFormData((prev) => ({ ...prev, mobileImage: url }));
      showNotification('success', 'Mobile banner image uploaded to Cloudinary successfully.');
    } catch (err: any) {
      console.error('Cloudinary mobile banner upload error:', err);
      setUploadError(err?.message || 'Failed to upload mobile banner to Cloudinary.');
    } finally {
      setIsUploadingMobile(false);
    }
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setUploadError('Banner title is required.');
      return;
    }
    if (!formData.desktopImage.trim()) {
      setUploadError('Desktop banner image is required.');
      return;
    }

    setIsSaving(true);
    setUploadError(null);

    const bannerPayload = {
      title: formData.title.trim(),
      subtitle: formData.subtitle.trim(),
      tagline: formData.tagline.trim() || undefined,
      desktopImage: formData.desktopImage.trim(),
      mobileImage: formData.mobileImage.trim() || formData.desktopImage.trim(),
      imageAlt: formData.imageAlt.trim() || formData.title.trim(),
      buttonText: formData.buttonText.trim(),
      buttonUrl: formData.buttonUrl.trim(),
      secondaryButtonText: formData.secondaryButtonText.trim() || undefined,
      secondaryButtonUrl: formData.secondaryButtonUrl.trim() || undefined,
      textAlignment: formData.textAlignment,
      theme: formData.theme,
      isActive: formData.isActive,
      sortOrder: Number(formData.sortOrder) || 1,
      displayOrder: Number(formData.sortOrder) || 1
    };

    try {
      if (editingBanner) {
        await updateHeroBanner(editingBanner.id, bannerPayload);
        showNotification('success', `Hero banner "${formData.title}" updated successfully.`);
        setEditingBanner(null);
      } else {
        await addHeroBanner(bannerPayload);
        showNotification('success', `New hero banner "${formData.title}" created successfully.`);
        setIsAddingBanner(false);
      }
    } catch (err: any) {
      console.error('Save hero banner error:', err);
      showNotification('error', err?.message || 'Failed to save hero banner to Firestore.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (banner: HeroBanner) => {
    try {
      const nextStatus = !banner.isActive;
      await toggleHeroBannerStatus(banner.id, nextStatus);
      showNotification('success', `Banner status set to ${nextStatus ? 'Active' : 'Draft'}.`);
    } catch (err: any) {
      console.error('Toggle status error:', err);
      showNotification('error', 'Failed to toggle banner status in Firestore.');
    }
  };

  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === heroBanners.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const newBanners = [...heroBanners];
    const temp = newBanners[index];
    newBanners[index] = newBanners[targetIndex];
    newBanners[targetIndex] = temp;

    // Update sortOrder
    const reorderedWithOrders = newBanners.map((b, idx) => ({
      ...b,
      sortOrder: idx + 1,
      displayOrder: idx + 1
    }));

    try {
      await reorderHeroBanners(reorderedWithOrders);
      showNotification('success', 'Banner order updated successfully.');
    } catch (err: any) {
      console.error('Reorder error:', err);
      showNotification('error', 'Failed to update banner order in Firestore.');
    }
  };

  const handleDeleteBanner = async (banner: HeroBanner) => {
    if (window.confirm(`Are you sure you want to delete banner "${banner.title}"?`)) {
      try {
        await deleteHeroBanner(banner.id);
        showNotification('success', `Hero banner "${banner.title}" deleted.`);
      } catch (err: any) {
        console.error('Delete hero banner error:', err);
        showNotification('error', 'Failed to delete hero banner from Firestore.');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Feedback Toast */}
      {feedbackMessage && (
        <div 
          className={`flex items-center space-x-2 p-3 rounded-lg text-xs font-semibold shadow-sm transition ${
            feedbackMessage.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {feedbackMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-serif font-bold text-neutral-900">Hero Banners & Sliders</h2>
            {isSyncing && (
              <span className="flex items-center space-x-1 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-sans">
                <Loader2 size={12} className="animate-spin" />
                <span>Syncing...</span>
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Manage top hero banner slides for the homepage. Upload high-resolution banners to Cloudinary and persist to Firestore (<code className="font-mono text-[11px] bg-neutral-100 px-1 py-0.5 rounded">heroBanners</code> collection).
          </p>
        </div>

        <button
          onClick={handleOpenAddForm}
          className="px-4 py-2 bg-[#4A1525] text-amber-200 rounded-lg text-xs font-bold hover:bg-[#6B1228] transition flex items-center space-x-2 shadow-sm shrink-0"
        >
          <Plus size={16} />
          <span>Add New Slide</span>
        </button>
      </div>

      {/* Add / Edit Form Modal */}
      {(isAddingBanner || editingBanner) && (
        <div className="bg-amber-50/50 rounded-xl border border-amber-200 p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-amber-200/80 mb-4">
            <h3 className="font-serif font-bold text-base text-[#4A1525] flex items-center space-x-2">
              <ImageIcon size={18} />
              <span>{editingBanner ? `Edit Banner: ${editingBanner.title}` : 'Create New Hero Slide'}</span>
            </h3>
            <button
              onClick={() => {
                setIsAddingBanner(false);
                setEditingBanner(null);
              }}
              className="p-1 text-neutral-500 hover:text-neutral-800"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSaveBanner} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Tagline / Eyebrow Text</label>
              <input
                type="text"
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                placeholder="e.g. Royal Wedding 2026"
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Sort Order</label>
              <input
                type="number"
                min="1"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white font-mono"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-semibold text-neutral-700 mb-1">Main Heading Title *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Pure Elegance, Timeless Heritage"
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white text-sm font-serif font-bold"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-semibold text-neutral-700 mb-1">Sub-Heading Description</label>
              <input
                type="text"
                value={formData.subtitle}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                placeholder="e.g. Discover our exclusive artisanal Kundan and Polki jewelry collection."
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white"
              />
            </div>

            {/* Desktop Banner Image with Cloudinary Direct Upload */}
            <div className="space-y-1.5">
              <label className="block font-semibold text-neutral-700">Desktop Banner Image (Cloudinary / URL) *</label>
              <div className="flex items-center space-x-2">
                <input
                  type="url"
                  required
                  value={formData.desktopImage}
                  onChange={(e) => setFormData({ ...formData, desktopImage: e.target.value })}
                  placeholder="https://res.cloudinary.com/..."
                  className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white font-mono text-[11px]"
                />
                
                <label className="cursor-pointer px-3 py-2 bg-amber-100 hover:bg-amber-200 border border-amber-300 text-[#4A1525] rounded-lg font-bold flex items-center space-x-1 shrink-0 transition">
                  {isUploadingDesktop ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload size={14} />
                      <span>Upload</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isUploadingDesktop}
                    onChange={handleDesktopImageUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Mobile Banner Image with Cloudinary Direct Upload */}
            <div className="space-y-1.5">
              <label className="block font-semibold text-neutral-700">Mobile Banner Image (Optional)</label>
              <div className="flex items-center space-x-2">
                <input
                  type="url"
                  value={formData.mobileImage}
                  onChange={(e) => setFormData({ ...formData, mobileImage: e.target.value })}
                  placeholder="https://res.cloudinary.com/... (Falls back to Desktop if empty)"
                  className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white font-mono text-[11px]"
                />
                
                <label className="cursor-pointer px-3 py-2 bg-amber-100 hover:bg-amber-200 border border-amber-300 text-[#4A1525] rounded-lg font-bold flex items-center space-x-1 shrink-0 transition">
                  {isUploadingMobile ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload size={14} />
                      <span>Upload</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isUploadingMobile}
                    onChange={handleMobileImageUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Banner Image ALT Text */}
            <div className="md:col-span-2 bg-white/90 border border-amber-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-neutral-800 flex items-center space-x-1.5">
                  <ImageIcon size={14} className="text-[#4A1525]" />
                  <span>Banner Image ALT Text (SEO & Accessibility)</span>
                </label>
                <span className="text-[10px] text-neutral-400">Rendered in &lt;img alt="..."&gt; on Homepage</span>
              </div>
              <input
                type="text"
                value={formData.imageAlt}
                onChange={(e) => setFormData({ ...formData, imageAlt: e.target.value })}
                placeholder={`e.g. ${formData.title || 'Hero Banner'} Houseofmahi Bangladesh`}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white"
              />
            </div>

            {uploadError && (
              <div className="md:col-span-2 text-xs text-red-600 font-semibold bg-red-50 p-2 rounded-lg border border-red-200 flex items-center space-x-1.5">
                <AlertCircle size={14} />
                <span>{uploadError}</span>
              </div>
            )}

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Primary Button Text *</label>
              <input
                type="text"
                required
                value={formData.buttonText}
                onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
                placeholder="Shop Collection"
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Primary Button Target URL *</label>
              <input
                type="text"
                required
                value={formData.buttonUrl}
                onChange={(e) => setFormData({ ...formData, buttonUrl: e.target.value })}
                placeholder="/#products or /category/necklaces"
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Secondary Button Text (Optional)</label>
              <input
                type="text"
                value={formData.secondaryButtonText}
                onChange={(e) => setFormData({ ...formData, secondaryButtonText: e.target.value })}
                placeholder="e.g. View Lookbook"
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Secondary Button Target URL</label>
              <input
                type="text"
                value={formData.secondaryButtonUrl}
                onChange={(e) => setFormData({ ...formData, secondaryButtonUrl: e.target.value })}
                placeholder="e.g. /lookbook"
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Text Alignment</label>
              <select
                value={formData.textAlignment}
                onChange={(e) => setFormData({ ...formData, textAlignment: e.target.value as any })}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white"
              >
                <option value="left">Left Aligned</option>
                <option value="center">Center Aligned</option>
                <option value="right">Right Aligned</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Color Theme</label>
              <select
                value={formData.theme}
                onChange={(e) => setFormData({ ...formData, theme: e.target.value as any })}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white"
              >
                <option value="dark">Dark Overlay (White Text)</option>
                <option value="light">Light Overlay (Dark Text)</option>
              </select>
            </div>

            {/* Live Banner Preview Box */}
            {formData.desktopImage && (
              <div className="md:col-span-2 border border-neutral-300 rounded-lg p-3 bg-neutral-950 text-white">
                <div className="text-[10px] uppercase font-mono text-amber-300 mb-2 flex items-center space-x-1">
                  <Sparkles size={12} />
                  <span>Live Appearance Preview</span>
                </div>
                <div className="relative rounded overflow-hidden aspect-[21/9] sm:aspect-[24/9] flex items-center px-6">
                  <img 
                    src={formData.desktopImage} 
                    alt="Preview" 
                    className="absolute inset-0 w-full h-full object-cover opacity-60"
                  />
                  <div className={`relative z-10 max-w-md ${formData.textAlignment === 'center' ? 'mx-auto text-center' : formData.textAlignment === 'right' ? 'ml-auto text-right' : 'text-left'}`}>
                    {formData.tagline && (
                      <span className="text-[10px] text-amber-300 font-bold uppercase tracking-wider block mb-1">{formData.tagline}</span>
                    )}
                    <h4 className="text-sm sm:text-base font-serif font-bold text-white leading-tight">{formData.title || 'Slide Title'}</h4>
                    {formData.subtitle && (
                      <p className="text-[10px] text-neutral-200 mt-1 line-clamp-1">{formData.subtitle}</p>
                    )}
                    <div className="flex items-center space-x-2 mt-2">
                      <span className="inline-block px-3 py-1 bg-amber-400 text-[#4A1525] font-bold text-[10px] rounded">
                        {formData.buttonText || 'Shop Collection'}
                      </span>
                      {formData.secondaryButtonText && (
                        <span className="inline-block px-3 py-1 bg-white/20 border border-white/40 text-white font-bold text-[10px] rounded">
                          {formData.secondaryButtonText}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="md:col-span-2 flex items-center space-x-2 pt-2">
              <label className="flex items-center space-x-2 cursor-pointer font-medium text-neutral-800">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded text-[#4A1525] focus:ring-[#4A1525]"
                />
                <span>Active (Display in live homepage slider)</span>
              </label>
            </div>

            <div className="md:col-span-2 flex justify-end space-x-3 pt-3 border-t border-amber-200">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => {
                  setIsAddingBanner(false);
                  setEditingBanner(null);
                }}
                className="px-4 py-2 border border-neutral-300 rounded-lg font-semibold text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 bg-[#4A1525] text-amber-200 rounded-lg font-bold hover:bg-[#6B1228] transition flex items-center space-x-1.5 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save size={15} />
                    <span>Save Slide</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Hero Banners List / Grid */}
      {heroBanners.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-2xl p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-amber-50 border border-amber-200 rounded-full flex items-center justify-center mx-auto text-[#4A1525] mb-4">
            <ImageIcon size={28} />
          </div>
          <h3 className="font-serif font-bold text-lg text-neutral-900">No Hero Banners Found</h3>
          <p className="text-xs text-neutral-500 max-w-md mx-auto mt-1.5">
            Your Firestore <code className="font-mono text-[11px] bg-neutral-100 px-1 py-0.5 rounded">heroBanners</code> collection is currently empty. Click "Add New Slide" to upload your first banner directly to Cloudinary.
          </p>
          <button
            onClick={handleOpenAddForm}
            className="mt-5 px-5 py-2.5 bg-[#4A1525] text-amber-200 rounded-lg text-xs font-bold hover:bg-[#6B1228] transition inline-flex items-center space-x-2 shadow-sm"
          >
            <Plus size={16} />
            <span>Create First Hero Banner</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {heroBanners.map((banner, index) => (
            <div 
              key={banner.id}
              className={`border rounded-xl p-4 bg-white transition flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm ${
                banner.isActive ? 'border-neutral-200' : 'border-dashed border-neutral-300 opacity-70 bg-neutral-50'
              }`}
            >
              {/* Image Preview & Order Badges */}
              <div className="flex items-center space-x-4 w-full md:w-auto">
                <div className="flex flex-col items-center space-y-1">
                  <button
                    onClick={() => handleMoveOrder(index, 'up')}
                    disabled={index === 0}
                    className="p-1 text-neutral-400 hover:text-neutral-800 disabled:opacity-20"
                    title="Move Up"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <span className="font-mono text-xs font-bold text-neutral-500">{index + 1}</span>
                  <button
                    onClick={() => handleMoveOrder(index, 'down')}
                    disabled={index === heroBanners.length - 1}
                    className="p-1 text-neutral-400 hover:text-neutral-800 disabled:opacity-20"
                    title="Move Down"
                  >
                    <ArrowDown size={14} />
                  </button>
                </div>

                <div className="w-28 sm:w-36 h-16 rounded-lg overflow-hidden relative border border-neutral-200 shrink-0 bg-neutral-900">
                  <img
                    src={banner.desktopImage}
                    alt={banner.imageAlt || banner.title}
                    className="w-full h-full object-cover"
                  />
                  {!banner.isActive && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-[10px] text-white font-bold uppercase">
                      Draft
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="font-serif font-bold text-sm text-neutral-900">{banner.title}</h4>
                    {banner.isActive ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Live
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-200 text-neutral-600">
                        Draft
                      </span>
                    )}
                  </div>
                  {banner.subtitle && (
                    <p className="text-xs text-neutral-500 line-clamp-1 mt-0.5">{banner.subtitle}</p>
                  )}
                  <div className="text-[11px] text-amber-900 font-mono mt-1 flex items-center space-x-2">
                    <span>Button: <strong>"{banner.buttonText}"</strong></span>
                    <span>→</span>
                    <span className="text-neutral-500">{banner.buttonUrl}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2 w-full md:w-auto justify-end border-t md:border-t-0 pt-2 md:pt-0">
                <button
                  onClick={() => handleToggleActive(banner)}
                  className={`p-2 rounded-lg text-xs font-bold border flex items-center space-x-1.5 transition ${
                    banner.isActive 
                      ? 'bg-amber-50 text-[#4A1525] border-amber-200 hover:bg-amber-100' 
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  }`}
                  title={banner.isActive ? 'Deactivate from homepage slider' : 'Activate to homepage slider'}
                >
                  {banner.isActive ? <EyeOff size={14} /> : <Eye size={14} />}
                  <span className="hidden sm:inline">{banner.isActive ? 'Hide' : 'Publish'}</span>
                </button>

                <button
                  onClick={() => handleOpenEditForm(banner)}
                  className="p-2 text-neutral-700 hover:text-[#4A1525] hover:bg-amber-50 rounded-lg border border-neutral-200 transition flex items-center space-x-1"
                  title="Edit Banner"
                >
                  <Edit3 size={14} />
                  <span className="text-xs font-bold hidden sm:inline">Edit</span>
                </button>

                <button
                  onClick={() => handleDeleteBanner(banner)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg border border-neutral-200 hover:border-red-200 transition"
                  title="Delete Banner"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
