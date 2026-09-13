import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Layers, 
  Image as ImageIcon, 
  Package, 
  X, 
  Save, 
  Globe, 
  FolderTree,
  ArrowUpDown,
  Check,
  ChevronDown,
  ChevronUp,
  Share2,
  GitMerge,
  ChevronRight,
  FolderPlus,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { useAdminStore } from '../../store/useAdminStore';
import { Category } from '../../types';

export const CategoriesModule: React.FC = () => {
  const { categories, products, addCategory, updateCategory, deleteCategory, mergeCategories } = useAdminStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showSeoSection, setShowSeoSection] = useState(false);

  // Subcategories Accordion State (expanded top category slugs/ids)
  const [expandedTopCats, setExpandedTopCats] = useState<Record<string, boolean>>({});

  // Merge Category Modal State
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [mergeSourceId, setMergeSourceId] = useState<string>('');
  const [mergeTargetId, setMergeTargetId] = useState<string>('');
  const [isMerging, setIsMerging] = useState(false);
  const [mergeSuccessMsg, setMergeSuccessMsg] = useState<string>('');
  const [mergeErrorMsg, setMergeErrorMsg] = useState<string>('');

  const [formData, setFormData] = useState<{
    name: string;
    slug: string;
    description: string;
    image: string;
    imageAlt: string;
    displayOrder: number;
    parentCategory: string;
    seoTitle: string;
    seoDescription: string;
    primaryKeyword: string;
    secondaryKeywords: string;
    canonicalUrl: string;
    indexStatus: 'index' | 'noindex';
    followStatus: 'follow' | 'nofollow';
    ogTitle: string;
    ogDescription: string;
    ogImage: string;
  }>({
    name: '',
    slug: '',
    description: '',
    image: '',
    imageAlt: '',
    displayOrder: categories.length + 1,
    parentCategory: '',
    seoTitle: '',
    seoDescription: '',
    primaryKeyword: '',
    secondaryKeywords: '',
    canonicalUrl: '',
    indexStatus: 'index',
    followStatus: 'follow',
    ogTitle: '',
    ogDescription: '',
    ogImage: ''
  });

  // Separate Top Categories (parentCategory is null/undefined or empty) and Subcategories
  const topCategories = categories.filter(c => !c.parentCategory || c.parentCategory.trim() === '');
  
  // Helper to find subcategories for a given top category
  const getSubcategories = (topCat: Category) => {
    return categories.filter(c => 
      c.parentCategory && 
      (c.parentCategory.toLowerCase().trim() === (topCat.slug || '').toLowerCase().trim() ||
       c.parentCategory.toLowerCase().trim() === (topCat.id || '').toLowerCase().trim())
    );
  };

  const toggleExpandTopCat = (catId: string) => {
    setExpandedTopCats(prev => ({
      ...prev,
      [catId]: !prev[catId]
    }));
  };

  const filteredCategories = categories.filter((c) => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenAddForm = (defaultParentSlug = '') => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&q=80&w=800',
      imageAlt: '',
      displayOrder: categories.length + 1,
      parentCategory: defaultParentSlug,
      seoTitle: '',
      seoDescription: '',
      primaryKeyword: '',
      secondaryKeywords: '',
      canonicalUrl: '',
      indexStatus: 'index',
      followStatus: 'follow',
      ogTitle: '',
      ogDescription: '',
      ogImage: ''
    });
    setShowSeoSection(false);
    setIsAddingCategory(true);
    setEditingCategory(null);
  };

  const handleOpenEditForm = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      image: category.image || '',
      imageAlt: category.imageAlt || '',
      displayOrder: category.displayOrder,
      parentCategory: category.parentCategory || '',
      seoTitle: category.seoTitle || '',
      seoDescription: category.seoDescription || '',
      primaryKeyword: category.primaryKeyword || '',
      secondaryKeywords: (category.secondaryKeywords || []).join(', '),
      canonicalUrl: category.canonicalUrl || '',
      indexStatus: category.indexStatus || 'index',
      followStatus: category.followStatus || 'follow',
      ogTitle: category.ogTitle || '',
      ogDescription: category.ogDescription || '',
      ogImage: category.ogImage || ''
    });
    setShowSeoSection(Boolean(category.seoTitle || category.seoDescription || category.primaryKeyword));
    setIsAddingCategory(false);
  };

  const handleOpenMergeModal = (preselectedSourceId?: string) => {
    setMergeSourceId(preselectedSourceId || '');
    setMergeTargetId('');
    setMergeSuccessMsg('');
    setMergeErrorMsg('');
    setIsMergeModalOpen(true);
  };

  const handleExecuteMerge = async () => {
    if (!mergeSourceId || !mergeTargetId) {
      setMergeErrorMsg('Please select both a source category and a target category.');
      return;
    }
    if (mergeSourceId === mergeTargetId) {
      setMergeErrorMsg('Source category and target category cannot be the same.');
      return;
    }

    const sourceCat = categories.find(c => c.id === mergeSourceId);
    const targetCat = categories.find(c => c.id === mergeTargetId);

    if (!sourceCat || !targetCat) {
      setMergeErrorMsg('Invalid category selection.');
      return;
    }

    const confirmMsg = `Are you sure you want to merge "${sourceCat.name}" into "${targetCat.name}"?\n\n- All products currently in "${sourceCat.name}" will be safely moved to "${targetCat.name}".\n- All subcategories of "${sourceCat.name}" will become subcategories of "${targetCat.name}".\n- "${sourceCat.name}" will then be deleted.\n\nThis action cannot be undone.`;
    if (!window.confirm(confirmMsg)) {
      return;
    }

    setIsMerging(true);
    setMergeErrorMsg('');
    setMergeSuccessMsg('');

    try {
      const success = await mergeCategories([mergeSourceId], mergeTargetId);
      if (success) {
        setMergeSuccessMsg(`Successfully merged "${sourceCat.name}" into "${targetCat.name}"! All products and subcategories have been safely updated.`);
        setTimeout(() => {
          setIsMergeModalOpen(false);
          setMergeSuccessMsg('');
        }, 2000);
      } else {
        setMergeErrorMsg('Failed to merge categories. Please check your connection and try again.');
      }
    } catch (err) {
      setMergeErrorMsg('An unexpected error occurred during merge.');
    } finally {
      setIsMerging(false);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setFormData((prev) => ({
      ...prev,
      name: newName,
      slug: prev.slug === '' || prev.slug === generateSlug(prev.name) ? generateSlug(newName) : prev.slug,
      seoTitle: prev.seoTitle === '' ? `${newName} Collection | Houseofmahi` : prev.seoTitle,
      imageAlt: prev.imageAlt === '' ? `${newName} Category Collection Houseofmahi` : prev.imageAlt
    }));
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.slug) return;

    // Calculate actual product count for this category slug
    const prodCount = products.filter((p) => p.category === formData.slug).length;
    const parsedSecondaryKeywords = formData.secondaryKeywords.split(',').map((k) => k.trim()).filter(Boolean);

    const categoryPayload = {
      name: formData.name,
      slug: formData.slug,
      description: formData.description,
      image: formData.image,
      imageAlt: formData.imageAlt.trim() || undefined,
      displayOrder: Number(formData.displayOrder),
      parentCategory: formData.parentCategory || undefined,
      productCount: prodCount,
      seoTitle: formData.seoTitle.trim() || undefined,
      seoDescription: formData.seoDescription.trim() || undefined,
      primaryKeyword: formData.primaryKeyword.trim() || undefined,
      secondaryKeywords: parsedSecondaryKeywords.length > 0 ? parsedSecondaryKeywords : undefined,
      canonicalUrl: formData.canonicalUrl.trim() || undefined,
      indexStatus: formData.indexStatus,
      followStatus: formData.followStatus,
      ogTitle: formData.ogTitle.trim() || undefined,
      ogDescription: formData.ogDescription.trim() || undefined,
      ogImage: formData.ogImage.trim() || undefined
    };

    if (editingCategory) {
      updateCategory(editingCategory.id, categoryPayload);
      setEditingCategory(null);
    } else {
      addCategory(categoryPayload);
      setIsAddingCategory(false);
    }
  };

  const handleDeleteCategory = (category: Category) => {
    const associatedProds = products.filter((p) => p.category === category.slug);
    const subcats = getSubcategories(category);

    let warningMsg = `Delete category "${category.name}"?`;
    if (associatedProds.length > 0 || subcats.length > 0) {
      warningMsg = `Warning: Category "${category.name}" has ${associatedProds.length} products and ${subcats.length} subcategories assigned.\n\nTip: You can use "Merge Category" instead to safely migrate products to another category.\n\nAre you sure you want to permanently delete this category?`;
    }

    if (!window.confirm(warningMsg)) {
      return;
    }
    deleteCategory(category.id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-4">
        <div>
          <h2 className="text-xl font-serif font-bold text-neutral-900">Product Categories & Hierarchy</h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Manage Top Categories, view and organize Subcategories, edit metadata, or merge duplicate categories safely without losing products.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => handleOpenMergeModal()}
            className="px-3.5 py-2 bg-amber-50 text-[#4A1525] border border-amber-300/80 rounded-lg text-xs font-bold hover:bg-amber-100 transition flex items-center space-x-1.5 shadow-xs"
            title="Merge duplicate or redundant categories safely"
          >
            <GitMerge size={15} />
            <span>Merge Categories</span>
          </button>

          <button
            onClick={() => handleOpenAddForm()}
            className="px-4 py-2 bg-[#4A1525] text-amber-200 rounded-lg text-xs font-bold hover:bg-[#6B1228] transition flex items-center space-x-2 shadow-sm"
          >
            <Plus size={16} />
            <span>Add Category</span>
          </button>
        </div>
      </div>

      {/* Add / Edit Form */}
      {(isAddingCategory || editingCategory) && (
        <div className="bg-amber-50/50 rounded-xl border border-amber-200 p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-amber-200/80 mb-4">
            <h3 className="font-serif font-bold text-base text-[#4A1525] flex items-center space-x-2">
              <Layers size={18} />
              <span>{editingCategory ? `Edit Category: ${editingCategory.name}` : 'Create New Category'}</span>
            </h3>
            <button
              onClick={() => {
                setIsAddingCategory(false);
                setEditingCategory(null);
              }}
              className="p-1 text-neutral-500 hover:text-neutral-800"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSaveCategory} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Category Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={handleNameChange}
                placeholder="e.g. Royal Necklaces"
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">URL Slug *</label>
              <input
                type="text"
                required
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="royal-necklaces"
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Display Order</label>
              <input
                type="number"
                min="1"
                value={formData.displayOrder}
                onChange={(e) => setFormData({ ...formData, displayOrder: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">Parent Category</label>
              <select
                value={formData.parentCategory}
                onChange={(e) => setFormData({ ...formData, parentCategory: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white"
              >
                <option value="">None (Top-Level Category)</option>
                {categories
                  .filter((c) => !editingCategory || c.id !== editingCategory.id)
                  .map((cat) => (
                    <option key={cat.id} value={cat.slug}>
                      {cat.name} {cat.parentCategory ? `(Sub of ${cat.parentCategory})` : '(Top Category)'}
                    </option>
                  ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block font-semibold text-neutral-700 mb-1">Category Image / Thumbnail URL</label>
              <input
                type="url"
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white font-mono"
              />
            </div>

            {/* Category Image ALT Text */}
            <div className="md:col-span-2 bg-white/90 border border-amber-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-neutral-800 flex items-center space-x-1.5">
                  <ImageIcon size={14} className="text-[#4A1525]" />
                  <span>Category Image ALT Text (Accessibility & Image SEO)</span>
                </label>
                <span className="text-[10px] text-neutral-400">Rendered in &lt;img alt="..."&gt;</span>
              </div>
              <input
                type="text"
                value={formData.imageAlt}
                onChange={(e) => setFormData({ ...formData, imageAlt: e.target.value })}
                placeholder={`e.g. ${formData.name || 'Royal Necklaces'} Exclusive Collection Houseofmahi`}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white"
              />
              <p className="text-[10px] text-neutral-500 mt-1">
                * Note: If left blank, it automatically falls back safely to "{formData.name || 'Category Name'}".
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="block font-semibold text-neutral-700 mb-1">Description</label>
              <textarea
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description for category banners and collections..."
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white"
              />
            </div>

            {/* CATEGORY SEO & SOCIAL ACCORDION */}
            <div className="md:col-span-2 border border-neutral-300 rounded-xl bg-white overflow-hidden shadow-xs">
              <button
                type="button"
                onClick={() => setShowSeoSection(!showSeoSection)}
                className="w-full px-4 py-3 bg-neutral-100/70 hover:bg-neutral-100 flex items-center justify-between transition text-left"
              >
                <div className="flex items-center space-x-2">
                  <Globe size={16} className="text-[#4A1525]" />
                  <span className="font-serif font-bold text-neutral-900">
                    Category Search Engine Optimization (SEO) & Social Sharing
                  </span>
                  {(formData.seoTitle || formData.seoDescription || formData.primaryKeyword) && (
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
                        placeholder={formData.name ? `${formData.name} Collection | Houseofmahi` : 'Category Title for Google Search'}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white font-medium"
                      />
                      <span className="text-[10px] text-neutral-400">Leave blank to use automatic category title.</span>
                    </div>

                    <div>
                      <label className="block font-semibold text-neutral-700 mb-1">Primary Target Keyword</label>
                      <input
                        type="text"
                        value={formData.primaryKeyword}
                        onChange={(e) => setFormData({ ...formData, primaryKeyword: e.target.value })}
                        placeholder="e.g. bridal necklaces bangladesh"
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block font-semibold text-neutral-700 mb-1">Custom Meta Description</label>
                      <textarea
                        rows={2}
                        value={formData.seoDescription}
                        onChange={(e) => setFormData({ ...formData, seoDescription: e.target.value })}
                        placeholder="Search snippet description for Google..."
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-neutral-700 mb-1">Secondary Keywords (comma separated)</label>
                      <input
                        type="text"
                        value={formData.secondaryKeywords}
                        onChange={(e) => setFormData({ ...formData, secondaryKeywords: e.target.value })}
                        placeholder="gold jewelry, royal sets, bangladesh choker"
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-neutral-700 mb-1">Custom Canonical URL (Optional)</label>
                      <input
                        type="url"
                        value={formData.canonicalUrl}
                        onChange={(e) => setFormData({ ...formData, canonicalUrl: e.target.value })}
                        placeholder={`https://houseofmahi.com/#category-${formData.slug || 'category'}`}
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
                          <label className="block font-semibold text-neutral-700 mb-1">OG Share Title</label>
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
                        <div className="md:col-span-2">
                          <label className="block font-semibold text-neutral-700 mb-1">OG Share Description</label>
                          <input
                            type="text"
                            value={formData.ogDescription}
                            onChange={(e) => setFormData({ ...formData, ogDescription: e.target.value })}
                            placeholder="Social share summary..."
                            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white"
                          />
                        </div>
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
                  setIsAddingCategory(false);
                  setEditingCategory(null);
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
                <span>Save Category</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MERGE CATEGORY MODAL */}
      {isMergeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-amber-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#4A1525] text-amber-200 p-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <GitMerge size={20} className="text-amber-300" />
                <h3 className="font-serif font-bold text-base text-white">Merge Top Categories</h3>
              </div>
              <button
                onClick={() => !isMerging && setIsMergeModalOpen(false)}
                className="text-amber-200/80 hover:text-white transition p-1"
                disabled={isMerging}
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-neutral-700 flex items-start space-x-2.5">
                <AlertTriangle size={18} className="text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <strong className="text-amber-900 block font-bold">Safe Product & Subcategory Migration:</strong>
                  <p className="text-[11px] text-amber-900/90 leading-relaxed">
                    Merging will safely move all products and child subcategories from the <strong>Source Category</strong> into the <strong>Target Category</strong>. The source category will then be removed without leaving any orphaned products.
                  </p>
                </div>
              </div>

              {mergeSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg flex items-center space-x-2 font-medium">
                  <Check size={16} className="text-emerald-600 shrink-0" />
                  <span>{mergeSuccessMsg}</span>
                </div>
              )}

              {mergeErrorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center space-x-2 font-medium">
                  <AlertTriangle size={16} className="text-red-600 shrink-0" />
                  <span>{mergeErrorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                {/* Source Category */}
                <div>
                  <label className="block font-bold text-neutral-800 mb-1.5">
                    1. Source Category (To be merged):
                  </label>
                  <select
                    value={mergeSourceId}
                    onChange={(e) => setMergeSourceId(e.target.value)}
                    disabled={isMerging}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white font-medium"
                  >
                    <option value="">-- Select Source Category --</option>
                    {categories.map((cat) => {
                      const prodCount = products.filter(p => p.category === cat.slug).length;
                      return (
                        <option key={cat.id} value={cat.id} disabled={cat.id === mergeTargetId}>
                          {cat.name} ({prodCount} items) {cat.parentCategory ? `[Sub of ${cat.parentCategory}]` : '[Top]'}
                        </option>
                      );
                    })}
                  </select>
                  {mergeSourceId && (
                    <span className="text-[10px] text-neutral-500 mt-1 block">
                      Will be deleted after products are moved.
                    </span>
                  )}
                </div>

                {/* Target Category */}
                <div>
                  <label className="block font-bold text-neutral-800 mb-1.5">
                    2. Target Category (Destination):
                  </label>
                  <select
                    value={mergeTargetId}
                    onChange={(e) => setMergeTargetId(e.target.value)}
                    disabled={isMerging}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-1 focus:ring-[#4A1525] bg-white font-medium"
                  >
                    <option value="">-- Select Destination Category --</option>
                    {categories.map((cat) => {
                      const prodCount = products.filter(p => p.category === cat.slug).length;
                      return (
                        <option key={cat.id} value={cat.id} disabled={cat.id === mergeSourceId}>
                          {cat.name} ({prodCount} items) {cat.parentCategory ? `[Sub of ${cat.parentCategory}]` : '[Top]'}
                        </option>
                      );
                    })}
                  </select>
                  {mergeTargetId && (
                    <span className="text-[10px] text-emerald-600 mt-1 block font-medium">
                      Will receive all transferred products.
                    </span>
                  )}
                </div>
              </div>

              {/* Migration Preview summary if both selected */}
              {mergeSourceId && mergeTargetId && mergeSourceId !== mergeTargetId && (
                <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3 flex items-center justify-between text-neutral-700">
                  <div className="font-semibold text-neutral-900 truncate max-w-[140px]">
                    {categories.find(c => c.id === mergeSourceId)?.name}
                  </div>
                  <div className="flex items-center space-x-1 text-[#4A1525] font-bold">
                    <span className="text-[10px] uppercase tracking-wider">Migrate Into</span>
                    <ArrowRight size={14} />
                  </div>
                  <div className="font-bold text-[#4A1525] truncate max-w-[140px]">
                    {categories.find(c => c.id === mergeTargetId)?.name}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setIsMergeModalOpen(false)}
                  disabled={isMerging}
                  className="px-4 py-2 border border-neutral-300 rounded-lg font-semibold text-neutral-700 hover:bg-neutral-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteMerge}
                  disabled={isMerging || !mergeSourceId || !mergeTargetId || mergeSourceId === mergeTargetId}
                  className="px-5 py-2 bg-[#4A1525] text-amber-200 rounded-lg font-bold hover:bg-[#6B1228] transition flex items-center space-x-1.5 disabled:opacity-50 shadow-sm"
                >
                  <GitMerge size={15} />
                  <span>{isMerging ? 'Merging Categories...' : 'Confirm & Execute Merge'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Summary Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-neutral-50 p-3 rounded-xl border border-neutral-200">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3 top-2.5 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search category name or slug..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#4A1525]"
          />
        </div>

        <div className="flex items-center space-x-3 text-xs text-neutral-500 font-mono">
          <span>Top Categories: <strong className="text-neutral-900">{topCategories.length}</strong></span>
          <span>•</span>
          <span>Total Categories: <strong className="text-neutral-900">{categories.length}</strong></span>
        </div>
      </div>

      {/* Categories Hierarchy & Table */}
      <div className="overflow-x-auto border border-neutral-200 rounded-xl bg-white shadow-sm">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-500 uppercase font-mono text-[10px]">
              <th className="py-3 px-3 w-12 text-center">Sub</th>
              <th className="py-3 px-3">Top Category</th>
              <th className="py-3 px-3">Slug</th>
              <th className="py-3 px-3">Products</th>
              <th className="py-3 px-3">Subcategories</th>
              <th className="py-3 px-3">Order</th>
              <th className="py-3 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filteredCategories.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-neutral-400">
                  No categories found matching "{searchQuery}".
                </td>
              </tr>
            ) : (
              // When searching, show all matched categories; otherwise group by top category hierarchy
              (searchQuery.trim() !== '' ? filteredCategories : topCategories).map((category) => {
                const subcats = getSubcategories(category);
                const count = products.filter((p) => p.category === category.slug).length;
                const isExpanded = Boolean(expandedTopCats[category.id]);

                return (
                  <React.Fragment key={category.id}>
                    {/* TOP CATEGORY ROW */}
                    <tr className={`hover:bg-neutral-50/80 transition ${isExpanded ? 'bg-amber-50/30' : ''}`}>
                      <td className="py-3 px-3 text-center">
                        {subcats.length > 0 ? (
                          <button
                            onClick={() => toggleExpandTopCat(category.id)}
                            className="p-1 rounded hover:bg-neutral-200/80 text-neutral-600 transition inline-flex items-center justify-center"
                            title={isExpanded ? 'Hide Subcategories' : `View ${subcats.length} Subcategories`}
                          >
                            {isExpanded ? <ChevronDown size={16} className="text-[#4A1525]" /> : <ChevronRight size={16} />}
                          </button>
                        ) : (
                          <span className="text-neutral-300 font-mono text-[10px]">•</span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center space-x-3">
                          {category.image ? (
                            <img
                              src={category.image}
                              alt={category.imageAlt || category.name}
                              className="w-10 h-10 rounded-md object-cover border border-neutral-200 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-md bg-neutral-100 flex items-center justify-center text-neutral-400 border border-neutral-200 shrink-0">
                              <ImageIcon size={18} />
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-neutral-900 flex items-center space-x-1.5">
                              <span>{category.name}</span>
                              {category.parentCategory && (
                                <span className="text-[9px] bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded font-mono font-normal">
                                  Sub of {category.parentCategory}
                                </span>
                              )}
                            </div>
                            {category.description && (
                              <div className="text-[10px] text-neutral-400 line-clamp-1">{category.description}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3 font-mono text-neutral-600">
                        /{category.slug}
                      </td>

                      <td className="py-3 px-3">
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-amber-50 text-[#4A1525] border border-amber-200/60 font-mono font-bold text-[11px]">
                          <Package size={12} />
                          <span>{count} items</span>
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        {subcats.length > 0 ? (
                          <button
                            onClick={() => toggleExpandTopCat(category.id)}
                            className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-200 font-mono font-bold text-[11px] transition"
                            title="Click to view subcategories"
                          >
                            <FolderTree size={12} className="text-[#4A1525]" />
                            <span>{subcats.length} subcategories</span>
                            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          </button>
                        ) : (
                          <span className="text-neutral-400 text-[11px]">—</span>
                        )}
                      </td>

                      <td className="py-3 px-3 font-mono text-neutral-700">
                        {category.displayOrder}
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* Quick Add Subcategory */}
                          <button
                            onClick={() => handleOpenAddForm(category.slug)}
                            className="p-1.5 text-neutral-600 hover:text-[#4A1525] hover:bg-amber-50 rounded transition"
                            title={`Add Subcategory under ${category.name}`}
                          >
                            <FolderPlus size={15} />
                          </button>

                          {/* Merge Category */}
                          <button
                            onClick={() => handleOpenMergeModal(category.id)}
                            className="p-1.5 text-neutral-600 hover:text-amber-700 hover:bg-amber-50 rounded transition"
                            title={`Merge ${category.name} into another category`}
                          >
                            <GitMerge size={15} />
                          </button>

                          {/* Edit Category */}
                          <button
                            onClick={() => handleOpenEditForm(category)}
                            className="p-1.5 text-neutral-600 hover:text-[#4A1525] hover:bg-amber-50 rounded transition"
                            title="Edit Category"
                          >
                            <Edit3 size={15} />
                          </button>

                          {/* Delete Category */}
                          <button
                            onClick={() => handleDeleteCategory(category)}
                            className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                            title="Delete Category"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* EXPANDED SUBCATEGORIES SECTION */}
                    {isExpanded && subcats.length > 0 && (
                      <tr className="bg-amber-50/20">
                        <td colSpan={7} className="p-0">
                          <div className="pl-12 pr-4 py-3 border-y border-amber-200/50 bg-amber-50/40 space-y-2">
                            <div className="flex items-center justify-between pb-1 border-b border-amber-200/40">
                              <span className="font-mono text-[11px] font-bold text-[#4A1525] flex items-center space-x-1.5">
                                <FolderTree size={14} />
                                <span>Subcategories under "{category.name}" ({subcats.length})</span>
                              </span>
                              <button
                                onClick={() => handleOpenAddForm(category.slug)}
                                className="text-[11px] font-bold text-[#4A1525] hover:underline flex items-center space-x-1"
                              >
                                <Plus size={12} />
                                <span>Add Subcategory</span>
                              </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                              {subcats.map((subcat) => {
                                const subCount = products.filter(p => p.category === subcat.slug).length;
                                return (
                                  <div
                                    key={subcat.id}
                                    className="bg-white border border-neutral-200 rounded-lg p-2.5 flex items-center justify-between hover:border-amber-300 transition shadow-2xs"
                                  >
                                    <div className="flex items-center space-x-2 min-w-0">
                                      {subcat.image ? (
                                        <img
                                          src={subcat.image}
                                          alt={subcat.name}
                                          className="w-8 h-8 rounded object-cover border border-neutral-200 shrink-0"
                                        />
                                      ) : (
                                        <div className="w-8 h-8 rounded bg-neutral-100 flex items-center justify-center text-neutral-400 border border-neutral-200 shrink-0">
                                          <ImageIcon size={14} />
                                        </div>
                                      )}
                                      <div className="min-w-0">
                                        <div className="font-bold text-neutral-900 truncate text-[11px]">
                                          {subcat.name}
                                        </div>
                                        <div className="text-[10px] text-neutral-500 font-mono">
                                          /{subcat.slug} • {subCount} items
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center space-x-1 shrink-0 ml-2">
                                      <button
                                        onClick={() => handleOpenMergeModal(subcat.id)}
                                        className="p-1 text-neutral-400 hover:text-amber-700 hover:bg-amber-50 rounded transition"
                                        title={`Merge Subcategory ${subcat.name}`}
                                      >
                                        <GitMerge size={13} />
                                      </button>
                                      <button
                                        onClick={() => handleOpenEditForm(subcat)}
                                        className="p-1 text-neutral-500 hover:text-[#4A1525] hover:bg-amber-50 rounded transition"
                                        title="Edit Subcategory"
                                      >
                                        <Edit3 size={13} />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteCategory(subcat)}
                                        className="p-1 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                                        title="Delete Subcategory"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
