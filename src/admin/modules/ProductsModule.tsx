import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  Image as ImageIcon, 
  Tag, 
  DollarSign, 
  Package, 
  Star, 
  Filter,
  Save,
  AlertCircle,
  Upload,
  Loader2,
  Globe,
  Share2,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Palette,
  Ruler,
  Sliders,
  Sparkles
} from 'lucide-react';
import { useAdminStore } from '../../store/useAdminStore';
import { Product, ProductCategoryType, ProductSeoData } from '../../types';
import { uploadImageToCloudinary } from '../../firebase/cloudinaryService';

export const ProductsModule: React.FC = () => {
  const { products, categories, addProduct, updateProduct, deleteProduct, bulkUpdateStock } = useAdminStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Image Upload State
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingGalleryImage, setIsUploadingGalleryImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Quick Stock Editing state
  const [stockEdits, setStockEdits] = useState<{ [id: string]: number }>({});
  const [stockEditSaved, setStockEditSaved] = useState(false);

  // Active form accordion tab for SEO section
  const [showSeoSection, setShowSeoSection] = useState(false);

  // Gallery URL input state for adding manual URL
  const [newGalleryUrl, setNewGalleryUrl] = useState('');

  // Local inputs for Color & Size tags
  const [newColorInput, setNewColorInput] = useState('');
  const [newSizeInput, setNewSizeInput] = useState('');

  // New Product Form State
  const [formData, setFormData] = useState<{
    name: string;
    sku: string;
    category: ProductCategoryType;
    categoryLabel: string;
    price: number;
    originalPrice: number;
    image: string;
    galleryImages: string[];
    galleryImagesAlt: Record<string, string>;
    description: string;
    shortDescription: string;
    stockQuantity: number;
    isNew: boolean;
    isBestSeller: boolean;
    isFeatured: boolean;
    tags: string;
    // Variants: Color & Size
    enableColors: boolean;
    colorsList: string[];
    enableSizes: boolean;
    sizesList: string[];
    // SEO & Media Fields
    imageAlt: string;
    seoTitle: string;
    metaDescription: string;
    primaryKeyword: string;
    secondaryKeywords: string;
    seoSlug: string;
    canonicalUrl: string;
    indexStatus: 'index' | 'noindex';
    followStatus: 'follow' | 'nofollow';
    ogTitle: string;
    ogDescription: string;
    ogImage: string;
    twitterTitle: string;
    twitterDescription: string;
    twitterImage: string;
    faqs: Array<{ question: string; answer: string }>;
    keyFeatures: string;
  }>({
    name: '',
    sku: '',
    category: 'necklaces',
    categoryLabel: 'Necklaces',
    price: 0,
    originalPrice: 0,
    image: '',
    galleryImages: [],
    galleryImagesAlt: {},
    description: '',
    shortDescription: '',
    stockQuantity: 10,
    isNew: true,
    isBestSeller: false,
    isFeatured: true,
    tags: 'jewelry, handcrafted, premium',
    enableColors: false,
    colorsList: [],
    enableSizes: false,
    sizesList: [],
    imageAlt: '',
    seoTitle: '',
    metaDescription: '',
    primaryKeyword: '',
    secondaryKeywords: '',
    seoSlug: '',
    canonicalUrl: '',
    indexStatus: 'index',
    followStatus: 'follow',
    ogTitle: '',
    ogDescription: '',
    ogImage: '',
    twitterTitle: '',
    twitterDescription: '',
    twitterImage: '',
    faqs: [],
    keyFeatures: ''
  });

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleOpenAddForm = () => {
    setFormData({
      name: '',
      sku: `HM-${Math.floor(1000 + Math.random() * 9000)}`,
      category: 'necklaces',
      categoryLabel: 'Necklaces',
      price: 1500,
      originalPrice: 1800,
      image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&q=80&w=800',
      galleryImages: [],
      galleryImagesAlt: {},
      description: 'Exquisite handcrafted jewelry piece designed for modern elegance.',
      shortDescription: 'Premium handcrafted artisan collection.',
      stockQuantity: 15,
      isNew: true,
      isBestSeller: false,
      isFeatured: true,
      tags: 'necklaces, gold, royal',
      enableColors: false,
      colorsList: [],
      enableSizes: false,
      sizesList: [],
      imageAlt: '',
      seoTitle: '',
      metaDescription: '',
      primaryKeyword: '',
      secondaryKeywords: '',
      seoSlug: '',
      canonicalUrl: '',
      indexStatus: 'index',
      followStatus: 'follow',
      ogTitle: '',
      ogDescription: '',
      ogImage: '',
      twitterTitle: '',
      twitterDescription: '',
      twitterImage: '',
      faqs: [
        { question: 'What material is used in this piece?', answer: 'Handcrafted with premium alloy, gold polish, and semi-precious stones.' }
      ],
      keyFeatures: 'Handcrafted, Anti-tarnish polish, Lightweight comfort'
    });
    setNewGalleryUrl('');
    setNewColorInput('');
    setNewSizeInput('');
    setUploadError(null);
    setShowSeoSection(false);
    setIsAddingProduct(true);
    setEditingProduct(null);
  };

  const handleOpenEditForm = (product: Product) => {
    setEditingProduct(product);
    const prodSeo = product.seo || {};

    // Reconstruct galleryImages and galleryImagesAlt with imageSeoList sync
    const initialGalleryImages: string[] = Array.isArray(product.galleryImages) ? [...product.galleryImages] : [];
    const initialGalleryImagesAlt: Record<string, string> = { ...(product.galleryImagesAlt || {}) };

    // Also populate from seo.imageSeoList if available
    if (Array.isArray(prodSeo.imageSeoList)) {
      prodSeo.imageSeoList.forEach((item) => {
        if (item.url && item.url !== product.image) {
          if (!initialGalleryImages.includes(item.url)) {
            initialGalleryImages.push(item.url);
          }
          if (item.altText && !initialGalleryImagesAlt[item.url]) {
            initialGalleryImagesAlt[item.url] = item.altText;
          }
        }
      });
    }

    const hasFinishes = Array.isArray(product.finishes) && product.finishes.length > 0;
    const hasSizes = Array.isArray(product.sizes) && product.sizes.length > 0;

    setFormData({
      name: product.name,
      sku: product.sku || '',
      category: product.category,
      categoryLabel: product.categoryLabel,
      price: product.price,
      originalPrice: product.originalPrice || 0,
      image: product.image,
      galleryImages: initialGalleryImages,
      galleryImagesAlt: initialGalleryImagesAlt,
      description: product.description || '',
      shortDescription: product.shortDescription || '',
      stockQuantity: product.stockQuantity !== undefined ? product.stockQuantity : 10,
      isNew: !!product.isNew,
      isBestSeller: !!product.isBestSeller,
      isFeatured: !!product.isFeatured,
      tags: product.tags ? product.tags.join(', ') : '',
      enableColors: hasFinishes,
      colorsList: hasFinishes ? [...(product.finishes || [])] : [],
      enableSizes: hasSizes,
      sizesList: hasSizes ? [...(product.sizes || [])] : [],
      // Populate SEO fields with fallback preservation
      imageAlt: product.imageAlt || prodSeo.imageSeoList?.find((img) => img.isPrimary || img.url === product.image)?.altText || '',
      seoTitle: prodSeo.seoTitle || (product as any).seoTitle || '',
      metaDescription: prodSeo.metaDescription || (product as any).metaDescription || (product as any).seoDescription || '',
      primaryKeyword: prodSeo.primaryKeyword || (product as any).primaryKeyword || '',
      secondaryKeywords: (prodSeo.secondaryKeywords || (product as any).secondaryKeywords || []).join(', '),
      seoSlug: prodSeo.slug || (product as any).seoSlug || '',
      canonicalUrl: prodSeo.canonicalUrl || (product as any).canonicalUrl || '',
      indexStatus: prodSeo.indexStatus || (product as any).indexStatus || 'index',
      followStatus: prodSeo.followStatus || (product as any).followStatus || 'follow',
      ogTitle: prodSeo.ogTitle || (product as any).ogTitle || '',
      ogDescription: prodSeo.ogDescription || (product as any).ogDescription || '',
      ogImage: prodSeo.ogImage || (product as any).ogImage || '',
      twitterTitle: prodSeo.twitterTitle || (product as any).twitterTitle || '',
      twitterDescription: prodSeo.twitterDescription || (product as any).twitterDescription || '',
      twitterImage: prodSeo.twitterImage || (product as any).twitterImage || '',
      faqs: prodSeo.faqs || (product as any).faqs || [],
      keyFeatures: (prodSeo.keyFeatures || (product as any).keyFeatures || []).join(', ')
    });
    setNewGalleryUrl('');
    setNewColorInput('');
    setNewSizeInput('');
    setUploadError(null);
    setShowSeoSection(Boolean(prodSeo.seoTitle || (product as any).seoTitle || product.imageAlt));
    setIsAddingProduct(false);
  };

  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image size exceeds 5MB limit. Please choose a smaller image.');
      return;
    }

    try {
      setIsUploadingImage(true);
      setUploadError(null);
      const uploadedUrl = await uploadImageToCloudinary(file, 'products');
      setFormData((prev) => ({ ...prev, image: uploadedUrl }));
    } catch (err: any) {
      console.error('Image upload failed:', err);
      setUploadError(err?.message || 'Failed to upload image. Please verify your Cloudinary config.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleGalleryImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Gallery image size exceeds 5MB limit.');
      return;
    }

    try {
      setIsUploadingGalleryImage(true);
      setUploadError(null);
      const uploadedUrl = await uploadImageToCloudinary(file, 'products');
      setFormData((prev) => {
        const updatedGallery = [...prev.galleryImages, uploadedUrl];
        return {
          ...prev,
          galleryImages: updatedGallery,
          galleryImagesAlt: {
            ...prev.galleryImagesAlt,
            [uploadedUrl]: `${prev.name || 'Product'} gallery view ${updatedGallery.length}`
          }
        };
      });
    } catch (err: any) {
      console.error('Gallery image upload failed:', err);
      setUploadError(err?.message || 'Failed to upload gallery image.');
    } finally {
      setIsUploadingGalleryImage(false);
    }
  };

  const handleAddManualGalleryUrl = () => {
    const trimmed = newGalleryUrl.trim();
    if (!trimmed) return;
    if (formData.galleryImages.includes(trimmed)) {
      setNewGalleryUrl('');
      return;
    }
    setFormData((prev) => {
      const updatedGallery = [...prev.galleryImages, trimmed];
      return {
        ...prev,
        galleryImages: updatedGallery,
        galleryImagesAlt: {
          ...prev.galleryImagesAlt,
          [trimmed]: `${prev.name || 'Product'} gallery view ${updatedGallery.length}`
        }
      };
    });
    setNewGalleryUrl('');
  };

  const handleUpdateGalleryImageAlt = (url: string, altText: string) => {
    setFormData((prev) => ({
      ...prev,
      galleryImagesAlt: {
        ...prev.galleryImagesAlt,
        [url]: altText
      }
    }));
  };

  const handleRemoveGalleryImage = (urlToRemove: string) => {
    setFormData((prev) => {
      const updatedGallery = prev.galleryImages.filter((u) => u !== urlToRemove);
      const updatedAltMap = { ...prev.galleryImagesAlt };
      delete updatedAltMap[urlToRemove];
      return {
        ...prev,
        galleryImages: updatedGallery,
        galleryImagesAlt: updatedAltMap
      };
    });
  };

  const handleAddFaqItem = () => {
    setFormData((prev) => ({
      ...prev,
      faqs: [...prev.faqs, { question: '', answer: '' }]
    }));
  };

  const handleUpdateFaqItem = (index: number, field: 'question' | 'answer', value: string) => {
    setFormData((prev) => {
      const updated = [...prev.faqs];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, faqs: updated };
    });
  };

  const handleRemoveFaqItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      faqs: prev.faqs.filter((_, i) => i !== index)
    }));
  };

  // Variant Helpers: Color / Polish
  const handleAddColor = (colorToAdd?: string) => {
    const target = (colorToAdd !== undefined ? colorToAdd : newColorInput).trim();
    if (!target) return;
    if (!formData.colorsList.includes(target)) {
      setFormData((prev) => ({
        ...prev,
        colorsList: [...prev.colorsList, target]
      }));
    }
    setNewColorInput('');
  };

  const handleRemoveColor = (indexToRemove: number) => {
    setFormData((prev) => ({
      ...prev,
      colorsList: prev.colorsList.filter((_, idx) => idx !== indexToRemove)
    }));
  };

  // Variant Helpers: Size
  const handleAddSize = (sizeToAdd?: string) => {
    const target = (sizeToAdd !== undefined ? sizeToAdd : newSizeInput).trim();
    if (!target) return;
    if (!formData.sizesList.includes(target)) {
      setFormData((prev) => ({
        ...prev,
        sizesList: [...prev.sizesList, target]
      }));
    }
    setNewSizeInput('');
  };

  const handleRemoveSize = (indexToRemove: number) => {
    setFormData((prev) => ({
      ...prev,
      sizesList: prev.sizesList.filter((_, idx) => idx !== indexToRemove)
    }));
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || formData.price <= 0) return;

    const parsedTags = formData.tags.split(',').map((t) => t.trim()).filter(Boolean);
    const parsedSecondaryKeywords = formData.secondaryKeywords.split(',').map((k) => k.trim()).filter(Boolean);
    const parsedFeatures = formData.keyFeatures.split(',').map((f) => f.trim()).filter(Boolean);
    const validFaqs = formData.faqs.filter((f) => f.question.trim() && f.answer.trim());

    // Variants resolution
    const finalFinishes = formData.enableColors
      ? formData.colorsList.map((c) => c.trim()).filter(Boolean)
      : [];
    const finalSizes = formData.enableSizes
      ? formData.sizesList.map((s) => s.trim()).filter(Boolean)
      : [];

    // Construct imageSeoList covering primary image and all gallery images
    const imageSeoList = [
      {
        url: formData.image,
        altText: formData.imageAlt.trim() || `${formData.name} Houseofmahi Bangladesh`,
        isPrimary: true
      },
      ...formData.galleryImages.map((gUrl, idx) => ({
        url: gUrl,
        altText: (formData.galleryImagesAlt[gUrl] || '').trim() || `${formData.name} gallery view ${idx + 1}`,
        isPrimary: false
      }))
    ];

    // Build structured SEO payload
    const seoPayload: ProductSeoData = {
      seoTitle: formData.seoTitle.trim() || undefined,
      metaDescription: formData.metaDescription.trim() || undefined,
      primaryKeyword: formData.primaryKeyword.trim() || undefined,
      secondaryKeywords: parsedSecondaryKeywords.length > 0 ? parsedSecondaryKeywords : undefined,
      slug: formData.seoSlug.trim() || undefined,
      canonicalUrl: formData.canonicalUrl.trim() || undefined,
      indexStatus: formData.indexStatus,
      followStatus: formData.followStatus,
      ogTitle: formData.ogTitle.trim() || undefined,
      ogDescription: formData.ogDescription.trim() || undefined,
      ogImage: formData.ogImage.trim() || undefined,
      twitterTitle: formData.twitterTitle.trim() || undefined,
      twitterDescription: formData.twitterDescription.trim() || undefined,
      twitterImage: formData.twitterImage.trim() || undefined,
      faqs: validFaqs.length > 0 ? validFaqs : undefined,
      keyFeatures: parsedFeatures.length > 0 ? parsedFeatures : undefined,
      imageSeoList
    };

    const productPayload = {
      name: formData.name,
      sku: formData.sku,
      category: formData.category,
      categoryLabel: formData.categoryLabel,
      price: Number(formData.price),
      originalPrice: Number(formData.originalPrice) > 0 ? Number(formData.originalPrice) : undefined,
      image: formData.image,
      imageAlt: formData.imageAlt.trim() || undefined,
      galleryImages: formData.galleryImages,
      galleryImagesAlt: formData.galleryImagesAlt,
      description: formData.description,
      shortDescription: formData.shortDescription,
      stockQuantity: Number(formData.stockQuantity),
      inStock: Number(formData.stockQuantity) > 0,
      isNew: formData.isNew,
      isBestSeller: formData.isBestSeller,
      isFeatured: formData.isFeatured,
      tags: parsedTags,
      finishes: finalFinishes,
      sizes: finalSizes,
      seo: seoPayload,
      // Direct root fields for backward compatibility
      seoTitle: formData.seoTitle.trim() || undefined,
      metaDescription: formData.metaDescription.trim() || undefined,
      primaryKeyword: formData.primaryKeyword.trim() || undefined,
      secondaryKeywords: parsedSecondaryKeywords.length > 0 ? parsedSecondaryKeywords : undefined,
      canonicalUrl: formData.canonicalUrl.trim() || undefined,
      indexStatus: formData.indexStatus,
      followStatus: formData.followStatus,
      ogTitle: formData.ogTitle.trim() || undefined,
      ogDescription: formData.ogDescription.trim() || undefined,
      ogImage: formData.ogImage.trim() || undefined,
      twitterTitle: formData.twitterTitle.trim() || undefined,
      twitterDescription: formData.twitterDescription.trim() || undefined,
      twitterImage: formData.twitterImage.trim() || undefined,
      faqs: validFaqs.length > 0 ? validFaqs : undefined
    };

    if (editingProduct) {
      updateProduct(editingProduct.id, productPayload);
      setEditingProduct(null);
    } else {
      addProduct({
        ...productPayload,
        rating: 5.0,
        reviewsCount: 1
      });
      setIsAddingProduct(false);
    }
  };

  const handleStockChange = (id: string, value: string) => {
    const num = parseInt(value, 10);
    setStockEdits((prev) => ({
      ...prev,
      [id]: isNaN(num) ? 0 : num
    }));
  };

  const handleApplyStockUpdates = () => {
    const updates = Object.entries(stockEdits).map(([id, stockQuantity]) => ({
      id,
      stockQuantity: Number(stockQuantity)
    }));
    if (updates.length > 0) {
      bulkUpdateStock(updates);
      setStockEdits({});
      setStockEditSaved(true);
      setTimeout(() => setStockEditSaved(false), 2500);
    }
  };

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-4">
        <div>
          <h2 className="text-xl font-serif font-bold text-neutral-900">Product Catalog & Inventory</h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Manage your store's items, pricing, Cloudinary photos, stock levels, and category classifications.
          </p>
        </div>

        <button
          onClick={handleOpenAddForm}
          className="px-4 py-2 bg-[#4A1525] text-amber-200 rounded-lg text-xs font-bold hover:bg-[#6B1228] transition flex items-center space-x-2 shadow-sm shrink-0"
        >
          <Plus size={16} />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Add / Edit Form Modal/Drawer */}
      {(isAddingProduct || editingProduct) && (
        <div className="bg-amber-50/50 rounded-xl border border-amber-200 p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-amber-200/80 mb-4">
            <h3 className="font-serif font-bold text-base text-[#4A1525] flex items-center space-x-2">
              <Package size={18} />
              <span>{editingProduct ? `Edit Product: ${editingProduct.name}` : 'Create New Product'}</span>
            </h3>
            <button
              onClick={() => {
                setIsAddingProduct(false);
                setEditingProduct(null);
              }}
              className="p-1 text-neutral-500 hover:text-neutral-800"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSaveProduct} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Product Title *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Royal Kundan Choker Set"
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">SKU Code</label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="HM-1002"
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Category *</label>
              <select
                value={formData.category}
                onChange={(e) => {
                  const cat = e.target.value as ProductCategoryType;
                  const label = categories.find((c) => c.slug === cat)?.name || cat;
                  setFormData({ ...formData, category: cat, categoryLabel: label });
                }}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Product Image & Cloudinary Direct File Upload */}
            <div className="space-y-1.5">
              <label className="block font-semibold text-neutral-700">Product Image (Cloudinary / URL) *</label>
              <div className="flex items-center space-x-2">
                <input
                  type="url"
                  required
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  placeholder="https://res.cloudinary.com/..."
                  className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white font-mono text-[11px]"
                />
                
                {/* Cloudinary Upload Button */}
                <label className="cursor-pointer px-3 py-2 bg-amber-100 hover:bg-amber-200 border border-amber-300 text-[#4A1525] rounded-lg font-bold flex items-center space-x-1 shrink-0 transition">
                  {isUploadingImage ? (
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
                    disabled={isUploadingImage}
                    onChange={handleImageFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {uploadError && (
                <p className="text-[11px] text-red-600 font-semibold">{uploadError}</p>
              )}

              {formData.image && (
                <div className="flex items-center space-x-2 pt-1">
                  <img
                    src={formData.image}
                    alt="Preview"
                    className="w-12 h-12 object-cover rounded-md border border-amber-300"
                  />
                  <span className="text-[10px] text-neutral-500">Image ready</span>
                </div>
              )}
            </div>

            {/* Image ALT Text Input */}
            <div className="md:col-span-2 bg-white/80 border border-amber-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-neutral-800 flex items-center space-x-1.5">
                  <ImageIcon size={14} className="text-[#4A1525]" />
                  <span>Primary Image ALT Text (SEO & Accessibility)</span>
                </label>
                <span className="text-[10px] text-neutral-400">Rendered directly in frontend &lt;img alt="..."&gt;</span>
              </div>
              <input
                type="text"
                value={formData.imageAlt}
                onChange={(e) => setFormData({ ...formData, imageAlt: e.target.value })}
                placeholder={`e.g. ${formData.name || 'Royal Kundan Choker Set'} Handcrafted Houseofmahi Bangladesh`}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white"
              />
              <p className="text-[10px] text-neutral-500 mt-1">
                * Note: If left blank, it automatically falls back safely to "{formData.name || 'Product Title'}".
              </p>
            </div>

            {/* Gallery Images & Per-Image Gallery ALT Text Manager */}
            <div className="md:col-span-2 bg-amber-50/50 border border-amber-200/80 rounded-xl p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <label className="font-bold text-neutral-800 flex items-center space-x-2">
                  <ImageIcon size={16} className="text-[#4A1525]" />
                  <span>Product Gallery Images & Image ALT Management</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#4A1525]/10 text-[#4A1525] font-semibold">
                    {formData.galleryImages.length} {formData.galleryImages.length === 1 ? 'image' : 'images'}
                  </span>
                </label>
                <span className="text-[11px] text-neutral-500">
                  Individual ALT text per gallery view for SEO ranking & screen readers
                </span>
              </div>

              {/* Add Gallery Image Controls (Cloudinary Upload + Manual URL) */}
              <div className="flex flex-col sm:flex-row gap-2 items-stretch">
                <input
                  type="url"
                  value={newGalleryUrl}
                  onChange={(e) => setNewGalleryUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddManualGalleryUrl();
                    }
                  }}
                  placeholder="Paste gallery image URL (https://...)"
                  className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white text-xs font-mono"
                />
                
                <button
                  type="button"
                  onClick={handleAddManualGalleryUrl}
                  disabled={!newGalleryUrl.trim()}
                  className="px-3 py-2 bg-neutral-800 hover:bg-neutral-900 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-1 transition shrink-0 cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Add URL</span>
                </button>

                <label className="cursor-pointer px-3 py-2 bg-[#4A1525] hover:bg-[#631B32] text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-1 shrink-0 transition">
                  {isUploadingGalleryImage ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload size={14} />
                      <span>Upload Gallery Image</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isUploadingGalleryImage}
                    onChange={handleGalleryImageFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Gallery Image List with Previews and ALT inputs */}
              {formData.galleryImages.length > 0 ? (
                <div className="space-y-2.5 pt-1">
                  {formData.galleryImages.map((imgUrl, index) => (
                    <div
                      key={`${imgUrl}-${index}`}
                      className="flex flex-col sm:flex-row sm:items-center gap-3 p-2.5 bg-white border border-amber-200/90 rounded-lg shadow-xs"
                    >
                      {/* Image Thumbnail Preview */}
                      <div className="flex items-center space-x-3 shrink-0">
                        <div className="relative w-12 h-12 rounded-md overflow-hidden bg-neutral-100 border border-neutral-200 shrink-0">
                          <img
                            src={imgUrl}
                            alt={formData.galleryImagesAlt[imgUrl] || `Gallery Image ${index + 1}`}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <span className="text-[11px] font-bold text-neutral-600 sm:w-16">
                          View #{index + 1}
                        </span>
                      </div>

                      {/* Per-Image ALT Text Input */}
                      <div className="flex-1 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-semibold text-neutral-700">
                            Gallery Image ALT Text (SEO & Accessibility)
                          </label>
                          <span className="text-[9px] text-neutral-400 font-mono truncate max-w-[180px]">
                            {imgUrl.slice(0, 30)}...
                          </span>
                        </div>
                        <input
                          type="text"
                          value={formData.galleryImagesAlt[imgUrl] || ''}
                          onChange={(e) => handleUpdateGalleryImageAlt(imgUrl, e.target.value)}
                          placeholder={`e.g. ${formData.name || 'Product'} angled detail view`}
                          className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-md text-xs focus:ring-1 focus:ring-[#4A1525] bg-neutral-50/50"
                        />
                      </div>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveGalleryImage(imgUrl)}
                        className="self-end sm:self-center p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition cursor-pointer shrink-0"
                        title="Remove gallery image"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-neutral-500 italic py-1">
                  No additional gallery images added yet. Add multiple angle views with specific ALT text above.
                </p>
              )}
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Regular Price (৳) *</label>
              <input
                type="number"
                required
                min="1"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Original / Strikethrough Price (৳)</label>
              <input
                type="number"
                min="0"
                value={formData.originalPrice}
                onChange={(e) => setFormData({ ...formData, originalPrice: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Initial Stock Quantity *</label>
              <input
                type="number"
                required
                min="0"
                value={formData.stockQuantity}
                onChange={(e) => setFormData({ ...formData, stockQuantity: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Search Tags (comma separated)</label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="choker, bridal, gold"
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-semibold text-neutral-700 mb-1">Full Description</label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white"
              />
            </div>

            {/* Badges */}
            <div className="md:col-span-2 flex flex-wrap gap-4 pt-2">
              <label className="flex items-center space-x-2 cursor-pointer font-medium text-neutral-800">
                <input
                  type="checkbox"
                  checked={formData.isNew}
                  onChange={(e) => setFormData({ ...formData, isNew: e.target.checked })}
                  className="rounded text-[#4A1525] focus:ring-[#4A1525]"
                />
                <span>Tag as "New Arrival"</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer font-medium text-neutral-800">
                <input
                  type="checkbox"
                  checked={formData.isBestSeller}
                  onChange={(e) => setFormData({ ...formData, isBestSeller: e.target.checked })}
                  className="rounded text-[#4A1525] focus:ring-[#4A1525]"
                />
                <span>Tag as "Best Seller"</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer font-medium text-neutral-800">
                <input
                  type="checkbox"
                  checked={formData.isFeatured}
                  onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                  className="rounded text-[#4A1525] focus:ring-[#4A1525]"
                />
                <span>Show on Homepage Featured</span>
              </label>
            </div>

            {/* PRODUCT VARIANTS CONFIGURATION (COLOR & SIZE) */}
            <div className="md:col-span-2 space-y-3 pt-1">
              <div className="flex items-center justify-between pb-1 border-b border-amber-200">
                <div className="flex items-center space-x-2">
                  <Sliders size={16} className="text-[#4A1525]" />
                  <span className="font-serif font-bold text-sm text-[#4A1525]">
                    Product Variants & Customization (Color & Size)
                  </span>
                </div>
                <span className="text-[11px] text-neutral-500 font-medium">
                  Configurable for Jewelry, Sarees, Clothing & Accessories
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. COLOR / POLISH OPTION */}
                <div className={`p-3.5 rounded-xl border transition-all ${formData.enableColors ? 'bg-amber-50/40 border-amber-300 shadow-xs' : 'bg-neutral-50 border-neutral-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Palette size={16} className={formData.enableColors ? 'text-[#4A1525]' : 'text-neutral-400'} />
                      <div>
                        <span className="font-bold text-neutral-900 block text-xs">Color / Polish Options</span>
                        <span className="text-[10px] text-neutral-500">Enable if product has multiple shades/finishes</span>
                      </div>
                    </div>
                    
                    {/* Toggle Switch */}
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.enableColors}
                        onChange={(e) => {
                          const isEnabled = e.target.checked;
                          setFormData((prev) => ({
                            ...prev,
                            enableColors: isEnabled,
                            colorsList: isEnabled && prev.colorsList.length === 0 ? ['Gold', 'Silver'] : prev.colorsList
                          }));
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#4A1525]"></div>
                    </label>
                  </div>

                  {formData.enableColors ? (
                    <div className="space-y-2.5 pt-2 border-t border-amber-200/80">
                      {/* Input + Add button */}
                      <div className="flex items-center space-x-1.5">
                        <input
                          type="text"
                          value={newColorInput}
                          onChange={(e) => setNewColorInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddColor();
                            }
                          }}
                          placeholder="Type color (e.g. Maroon, Gold) & Add..."
                          className="flex-1 px-2.5 py-1.5 border border-neutral-300 rounded-lg text-xs bg-white focus:ring-1 focus:ring-[#4A1525]"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddColor()}
                          className="px-3 py-1.5 bg-[#4A1525] text-amber-200 rounded-lg font-bold hover:bg-[#6B1228] transition text-xs flex items-center space-x-1 shrink-0 cursor-pointer"
                        >
                          <Plus size={13} />
                          <span>Add</span>
                        </button>
                      </div>

                      {/* Quick Presets */}
                      <div>
                        <div className="text-[10px] font-semibold text-neutral-500 mb-1">Quick Suggestions:</div>
                        <div className="flex flex-wrap gap-1">
                          {['Gold', 'Silver', 'Rose Gold', 'Antique Gold', 'Red', 'Maroon', 'Pastel Pink', 'Emerald Green', 'Royal Blue', 'Black', 'White'].map((preset) => {
                            const isAdded = formData.colorsList.includes(preset);
                            return (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => !isAdded && handleAddColor(preset)}
                                disabled={isAdded}
                                className={`px-2 py-0.5 rounded text-[10px] font-medium transition cursor-pointer ${
                                  isAdded 
                                    ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed' 
                                    : 'bg-white border border-neutral-200 text-neutral-700 hover:border-amber-400 hover:text-[#4A1525]'
                                }`}
                              >
                                + {preset}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Active Colors List */}
                      <div className="pt-1">
                        <div className="text-[10px] font-semibold text-neutral-600 mb-1">
                          Active Colors ({formData.colorsList.length}):
                        </div>
                        {formData.colorsList.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1.5 bg-white/80 border border-amber-200 rounded-lg">
                            {formData.colorsList.map((color, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center space-x-1 px-2.5 py-1 bg-amber-100/90 text-[#4A1525] border border-amber-300/80 rounded-md text-[11px] font-bold shadow-2xs"
                              >
                                <span>{color}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveColor(idx)}
                                  className="text-neutral-500 hover:text-red-700 ml-1 rounded-full hover:bg-amber-200 p-0.5 transition cursor-pointer"
                                  title={`Remove ${color}`}
                                >
                                  <X size={12} />
                                </button>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-amber-700 italic">Please add at least 1 color option above.</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-neutral-400 italic pt-1">
                      Color selection is turned OFF. Customers will not be asked to pick a color.
                    </p>
                  )}
                </div>

                {/* 2. SIZE OPTION */}
                <div className={`p-3.5 rounded-xl border transition-all ${formData.enableSizes ? 'bg-amber-50/40 border-amber-300 shadow-xs' : 'bg-neutral-50 border-neutral-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Ruler size={16} className={formData.enableSizes ? 'text-[#4A1525]' : 'text-neutral-400'} />
                      <div>
                        <span className="font-bold text-neutral-900 block text-xs">Size Options</span>
                        <span className="text-[10px] text-neutral-500">Enable for Clothing (S/M/L), Numbers (24, 26) or Free Size</span>
                      </div>
                    </div>
                    
                    {/* Toggle Switch */}
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.enableSizes}
                        onChange={(e) => {
                          const isEnabled = e.target.checked;
                          setFormData((prev) => ({
                            ...prev,
                            enableSizes: isEnabled,
                            sizesList: isEnabled && prev.sizesList.length === 0 ? ['Free Size'] : prev.sizesList
                          }));
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#4A1525]"></div>
                    </label>
                  </div>

                  {formData.enableSizes ? (
                    <div className="space-y-2.5 pt-2 border-t border-amber-200/80">
                      {/* Input + Add button */}
                      <div className="flex items-center space-x-1.5">
                        <input
                          type="text"
                          value={newSizeInput}
                          onChange={(e) => setNewSizeInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddSize();
                            }
                          }}
                          placeholder="Type size (e.g. XL, 28, Free Size) & Add..."
                          className="flex-1 px-2.5 py-1.5 border border-neutral-300 rounded-lg text-xs bg-white focus:ring-1 focus:ring-[#4A1525]"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddSize()}
                          className="px-3 py-1.5 bg-[#4A1525] text-amber-200 rounded-lg font-bold hover:bg-[#6B1228] transition text-xs flex items-center space-x-1 shrink-0 cursor-pointer"
                        >
                          <Plus size={13} />
                          <span>Add</span>
                        </button>
                      </div>

                      {/* Quick Presets */}
                      <div>
                        <div className="text-[10px] font-semibold text-neutral-500 mb-1">Quick Suggestions:</div>
                        <div className="flex flex-wrap gap-1">
                          {['Free Size', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '22', '24', '26', '28', '30', '32', '34'].map((preset) => {
                            const isAdded = formData.sizesList.includes(preset);
                            return (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => !isAdded && handleAddSize(preset)}
                                disabled={isAdded}
                                className={`px-2 py-0.5 rounded text-[10px] font-medium transition cursor-pointer ${
                                  isAdded 
                                    ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed' 
                                    : 'bg-white border border-neutral-200 text-neutral-700 hover:border-amber-400 hover:text-[#4A1525]'
                                }`}
                              >
                                + {preset}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Active Sizes List */}
                      <div className="pt-1">
                        <div className="text-[10px] font-semibold text-neutral-600 mb-1">
                          Active Sizes ({formData.sizesList.length}):
                        </div>
                        {formData.sizesList.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1.5 bg-white/80 border border-amber-200 rounded-lg">
                            {formData.sizesList.map((sz, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center space-x-1 px-2.5 py-1 bg-amber-100/90 text-[#4A1525] border border-amber-300/80 rounded-md text-[11px] font-bold shadow-2xs"
                              >
                                <span>{sz}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSize(idx)}
                                  className="text-neutral-500 hover:text-red-700 ml-1 rounded-full hover:bg-amber-200 p-0.5 transition cursor-pointer"
                                  title={`Remove ${sz}`}
                                >
                                  <X size={12} />
                                </button>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-amber-700 italic">Please add at least 1 size option above.</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-neutral-400 italic pt-1">
                      Size selection is turned OFF. Customers will not be asked to pick a size.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* PRODUCT SEO & METADATA SECTION ACCORDION */}
            <div className="md:col-span-2 border border-neutral-300 rounded-xl bg-white overflow-hidden shadow-xs">
              <button
                type="button"
                onClick={() => setShowSeoSection(!showSeoSection)}
                className="w-full px-4 py-3 bg-neutral-100/70 hover:bg-neutral-100 flex items-center justify-between transition text-left"
              >
                <div className="flex items-center space-x-2">
                  <Globe size={16} className="text-[#4A1525]" />
                  <span className="font-serif font-bold text-neutral-900">
                    Product Search Engine Optimization (SEO), Social Sharing & FAQs
                  </span>
                  {(formData.seoTitle || formData.metaDescription) && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                      Custom SEO Configured
                    </span>
                  )}
                </div>
                {showSeoSection ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {showSeoSection && (
                <div className="p-4 space-y-4 border-t border-neutral-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-neutral-700 mb-1">Custom SEO Title</label>
                      <input
                        type="text"
                        value={formData.seoTitle}
                        onChange={(e) => setFormData({ ...formData, seoTitle: e.target.value })}
                        placeholder={formData.name ? `${formData.name} | Houseofmahi Bangladesh` : 'Custom title...'}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white font-medium"
                      />
                      <span className="text-[10px] text-neutral-400">Leave blank to use automatic title fallback.</span>
                    </div>

                    <div>
                      <label className="block font-semibold text-neutral-700 mb-1">Primary Target Keyword</label>
                      <input
                        type="text"
                        value={formData.primaryKeyword}
                        onChange={(e) => setFormData({ ...formData, primaryKeyword: e.target.value })}
                        placeholder="e.g. bridal kundan choker set"
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block font-semibold text-neutral-700 mb-1">Custom Meta Description</label>
                      <textarea
                        rows={2}
                        value={formData.metaDescription}
                        onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
                        placeholder="Detailed search snippet description for Google..."
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-neutral-700 mb-1">Secondary Keywords (comma separated)</label>
                      <input
                        type="text"
                        value={formData.secondaryKeywords}
                        onChange={(e) => setFormData({ ...formData, secondaryKeywords: e.target.value })}
                        placeholder="gold jewelry, bridal necklace, bd jewelry"
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-neutral-700 mb-1">Custom SEO Slug</label>
                      <input
                        type="text"
                        value={formData.seoSlug}
                        onChange={(e) => setFormData({ ...formData, seoSlug: e.target.value })}
                        placeholder="e.g. royal-kundan-choker-set"
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-neutral-700 mb-1">Custom Canonical URL (Optional)</label>
                      <input
                        type="url"
                        value={formData.canonicalUrl}
                        onChange={(e) => setFormData({ ...formData, canonicalUrl: e.target.value })}
                        placeholder="https://houseofmahi.com/#product-royal-kundan"
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white font-mono"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block font-semibold text-neutral-700 mb-1">Index Directive</label>
                        <select
                          value={formData.indexStatus}
                          onChange={(e) => setFormData({ ...formData, indexStatus: e.target.value as any })}
                          className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white"
                        >
                          <option value="index">index (Include in Google)</option>
                          <option value="noindex">noindex (Hide from search)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold text-neutral-700 mb-1">Follow Directive</label>
                        <select
                          value={formData.followStatus}
                          onChange={(e) => setFormData({ ...formData, followStatus: e.target.value as any })}
                          className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white"
                        >
                          <option value="follow">follow (Follow links)</option>
                          <option value="nofollow">nofollow</option>
                        </select>
                      </div>
                    </div>

                    {/* Social Media Overrides */}
                    <div className="md:col-span-2 pt-2 border-t border-neutral-200">
                      <h4 className="font-bold text-neutral-800 flex items-center space-x-1.5 mb-2">
                        <Share2 size={14} className="text-[#4A1525]" />
                        <span>Social Sharing Meta Overrides (OpenGraph & Twitter)</span>
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-semibold text-neutral-700 mb-1">OG / Twitter Share Title</label>
                          <input
                            type="text"
                            value={formData.ogTitle}
                            onChange={(e) => setFormData({ ...formData, ogTitle: e.target.value })}
                            placeholder="Custom social share headline..."
                            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-neutral-700 mb-1">OG Share Image URL</label>
                          <input
                            type="url"
                            value={formData.ogImage}
                            onChange={(e) => setFormData({ ...formData, ogImage: e.target.value })}
                            placeholder={formData.image || 'https://...'}
                            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Key Features & Structured FAQ */}
                    <div className="md:col-span-2 pt-2 border-t border-neutral-200 space-y-3">
                      <div>
                        <label className="block font-semibold text-neutral-700 mb-1">Key Features (comma separated)</label>
                        <input
                          type="text"
                          value={formData.keyFeatures}
                          onChange={(e) => setFormData({ ...formData, keyFeatures: e.target.value })}
                          placeholder="Handcrafted in Dhaka, 22K Gold Plated, Includes velvet jewelry pouch"
                          className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white"
                        />
                      </div>

                      {/* Product FAQs */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="font-semibold text-neutral-800 flex items-center space-x-1.5">
                            <HelpCircle size={14} className="text-[#4A1525]" />
                            <span>Product Questions & Answers (JSON-LD FAQ Schema)</span>
                          </label>
                          <button
                            type="button"
                            onClick={handleAddFaqItem}
                            className="text-[11px] text-[#4A1525] font-bold hover:underline flex items-center space-x-1"
                          >
                            <Plus size={12} />
                            <span>Add Question</span>
                          </button>
                        </div>

                        {formData.faqs.length === 0 ? (
                          <p className="text-[11px] text-neutral-400 italic">No custom FAQs added for this product.</p>
                        ) : (
                          <div className="space-y-2">
                            {formData.faqs.map((faq, index) => (
                              <div key={index} className="p-2.5 bg-neutral-50 rounded-lg border border-neutral-200 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-neutral-500 uppercase">Question #{index + 1}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveFaqItem(index)}
                                    className="text-red-500 hover:text-red-700 p-0.5"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                                <input
                                  type="text"
                                  value={faq.question}
                                  onChange={(e) => handleUpdateFaqItem(index, 'question', e.target.value)}
                                  placeholder="e.g. Is this suitable for bridal wear?"
                                  className="w-full px-2.5 py-1.5 border border-neutral-300 rounded bg-white text-xs"
                                />
                                <input
                                  type="text"
                                  value={faq.answer}
                                  onChange={(e) => handleUpdateFaqItem(index, 'answer', e.target.value)}
                                  placeholder="e.g. Yes, perfectly paired with traditional bridal sarees and lehengas."
                                  className="w-full px-2.5 py-1.5 border border-neutral-300 rounded bg-white text-xs"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="md:col-span-2 flex justify-end space-x-3 pt-3 border-t border-amber-200">
              <button
                type="button"
                onClick={() => {
                  setIsAddingProduct(false);
                  setEditingProduct(null);
                }}
                className="px-4 py-2 border border-neutral-300 rounded-lg font-semibold text-neutral-700 hover:bg-neutral-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#4A1525] text-amber-200 rounded-lg font-bold hover:bg-[#6B1228] transition flex items-center space-x-1.5"
              >
                <Save size={15} />
                <span>Save Product</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-neutral-50 p-3 rounded-xl border border-neutral-200">
        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3 top-2.5 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search title or SKU..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#4A1525]"
          />
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center space-x-2">
            <Filter size={15} className="text-neutral-500" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs border border-neutral-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none"
            >
              <option value="all">All Categories ({products.length})</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.slug}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {Object.keys(stockEdits).length > 0 && (
            <button
              onClick={handleApplyStockUpdates}
              className="px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-bold hover:bg-emerald-800 transition flex items-center space-x-1 shadow-sm"
            >
              <Save size={14} />
              <span>Save Stock Changes ({Object.keys(stockEdits).length})</span>
            </button>
          )}

          {stockEditSaved && (
            <span className="text-xs text-emerald-700 font-bold flex items-center space-x-1 animate-pulse">
              <Check size={14} />
              <span>Stock Updated!</span>
            </span>
          )}
        </div>
      </div>

      {/* Products Table */}
      <div className="overflow-x-auto border border-neutral-200 rounded-xl bg-white shadow-sm">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-500 uppercase font-mono text-[10px]">
              <th className="py-3 px-3">Product Info</th>
              <th className="py-3 px-3">SKU</th>
              <th className="py-3 px-3">Category</th>
              <th className="py-3 px-3">Price</th>
              <th className="py-3 px-3">In Stock</th>
              <th className="py-3 px-3">Status Badges</th>
              <th className="py-3 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-neutral-400">
                  No products found matching your search.
                </td>
              </tr>
            ) : (
              filteredProducts.map((product) => {
                const currentStock = stockEdits[product.id] !== undefined 
                  ? stockEdits[product.id] 
                  : (product.stockQuantity !== undefined ? product.stockQuantity : 10);

                return (
                  <tr key={product.id} className="hover:bg-neutral-50/80 transition">
                    <td className="py-3 px-3">
                      <div className="flex items-center space-x-3">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-10 h-10 rounded-md object-cover border border-neutral-200 shrink-0"
                        />
                        <div>
                          <div className="font-bold text-neutral-900 line-clamp-1">{product.name}</div>
                          <div className="text-[10px] text-neutral-400 line-clamp-1">{product.shortDescription}</div>
                          {/* Variant Indicators */}
                          <div className="flex flex-wrap gap-1 mt-1">
                            {Array.isArray(product.finishes) && product.finishes.length > 0 && (
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] bg-amber-50 text-[#4A1525] border border-amber-200 font-medium">
                                {product.finishes.length} {product.finishes.length === 1 ? 'Color' : 'Colors'}
                              </span>
                            )}
                            {Array.isArray(product.sizes) && product.sizes.length > 0 && (
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                                {product.sizes.length} {product.sizes.length === 1 ? 'Size' : 'Sizes'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3 font-mono text-neutral-600 font-medium">
                      {product.sku || 'N/A'}
                    </td>

                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 font-medium text-[11px]">
                        {product.categoryLabel}
                      </span>
                    </td>

                    <td className="py-3 px-3 font-mono font-bold text-neutral-900">
                      ৳{product.price.toLocaleString()}
                      {product.originalPrice && (
                        <span className="block text-[10px] text-neutral-400 line-through">
                          ৳{product.originalPrice.toLocaleString()}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex items-center space-x-1.5">
                        <input
                          type="number"
                          min="0"
                          value={currentStock}
                          onChange={(e) => handleStockChange(product.id, e.target.value)}
                          className={`w-16 px-2 py-1 text-center font-mono font-bold border rounded ${
                            currentStock <= 5 ? 'border-red-300 bg-red-50 text-red-800' : 'border-neutral-300 bg-white'
                          }`}
                        />
                        {currentStock <= 5 && currentStock > 0 && (
                          <span className="text-[10px] text-red-600 font-bold" title="Low stock alert">Low!</span>
                        )}
                        {currentStock === 0 && (
                          <span className="text-[10px] text-red-700 font-bold uppercase bg-red-100 px-1.5 py-0.5 rounded">Out</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-3 space-x-1">
                      {product.isNew && (
                        <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">New</span>
                      )}
                      {product.isBestSeller && (
                        <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded">Best</span>
                      )}
                      {product.isFeatured && (
                        <span className="px-1.5 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-bold rounded">Featured</span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleOpenEditForm(product)}
                          className="p-1.5 text-neutral-600 hover:text-[#4A1525] hover:bg-amber-50 rounded transition"
                          title="Edit Product"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete product "${product.name}"?`)) {
                              deleteProduct(product.id);
                            }
                          }}
                          className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                          title="Delete Product"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
