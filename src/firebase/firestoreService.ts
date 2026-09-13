import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot,
  writeBatch,
  runTransaction
} from 'firebase/firestore';
import { db, auth } from './config';
import { 
  Product, 
  Category, 
  HeroBanner, 
  HomepageSection,
  Coupon, 
  CouponUsageRecord,
  Order, 
  OrderStatus,
  StoreSettings,
  MarketingPixelsConfig,
  SeoConfig,
  PageSeoItem,
  CourierServiceConfig
} from '../types';

// Helper to remove any undefined fields before sending to Firestore
function sanitizePayload<T extends Record<string, any>>(obj: T): Record<string, any> {
  if (!obj || typeof obj !== 'object') return obj || {};
  const result: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const val = (obj as any)[key];
    if (val !== undefined) {
      if (val !== null && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
        // Recursive sanitization for nested plain objects
        result[key] = sanitizePayload(val);
      } else if (Array.isArray(val)) {
        result[key] = val
          .filter(item => item !== undefined)
          .map(item => (item !== null && typeof item === 'object' && !(item instanceof Date)) ? sanitizePayload(item) : item);
      } else {
        result[key] = val;
      }
    }
  }
  return result;
}

// ---------------- PRODUCTS ----------------
export async function getProductsFromFirestore(): Promise<Product[]> {
  try {
    const colRef = collection(db, 'products');
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}

export function subscribeToProducts(
  callback: (products: Product[]) => void,
  errorCallback?: (error: Error) => void
) {
  const colRef = collection(db, 'products');
  return onSnapshot(colRef, (snapshot) => {
    const prods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
    callback(prods);
  }, (error) => {
    if (errorCallback) {
      errorCallback(error);
    } else {
      console.error('Products listener error:', error.message);
    }
  });
}

export async function createProductInFirestore(product: Product, id?: string): Promise<boolean> {
  try {
    const prodId = id || product.id;
    const docRef = doc(db, 'products', prodId);
    const sanitized = sanitizePayload(product);
    await setDoc(docRef, { ...sanitized, id: prodId, updatedAt: new Date().toISOString() }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error creating product:', error);
    return false;
  }
}

export async function updateProductInFirestore(id: string, updated: Partial<Product>): Promise<boolean> {
  try {
    const docRef = doc(db, 'products', id);
    const sanitized = sanitizePayload(updated);
    await setDoc(docRef, { ...sanitized, updatedAt: new Date().toISOString() }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error updating product:', error);
    return false;
  }
}

export async function saveProductToFirestore(product: Product): Promise<boolean> {
  return createProductInFirestore(product, product.id);
}

export async function deleteProductFromFirestore(id: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, 'products', id));
    return true;
  } catch (error) {
    console.error('Error deleting product:', error);
    return false;
  }
}

// ---------------- CATEGORIES ----------------
export async function getCategoriesFromFirestore(): Promise<Category[]> {
  try {
    const colRef = collection(db, 'categories');
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

export function subscribeToCategories(
  callback: (categories: Category[]) => void,
  errorCallback?: (error: Error) => void
) {
  const colRef = collection(db, 'categories');
  return onSnapshot(colRef, (snapshot) => {
    const cats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
    callback(cats);
  }, (error) => {
    if (errorCallback) {
      errorCallback(error);
    } else {
      console.error('Categories listener error:', error.message);
    }
  });
}

export async function setCategoryInFirestore(id: string, category: Partial<Category>): Promise<boolean> {
  try {
    const docRef = doc(db, 'categories', id);
    const sanitized = sanitizePayload(category);
    await setDoc(docRef, { ...sanitized, id, updatedAt: new Date().toISOString() }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error saving category:', error);
    return false;
  }
}

export async function deleteCategoryFromFirestore(id: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, 'categories', id));
    return true;
  } catch (error) {
    console.error('Error deleting category:', error);
    return false;
  }
}

/**
 * Safely merges one or more source categories into a target category.
 * 1. Reassigns all products associated with source categories (by id or slug) to the target category.
 * 2. Reassigns child subcategories of source categories to the target category.
 * 3. Safely deletes the source categories from Firestore.
 */
export async function mergeCategoriesInFirestore(
  sourceCategoryIds: string[],
  targetCategoryId: string,
  targetCategoryName: string,
  targetCategorySlug: string
): Promise<boolean> {
  try {
    if (!sourceCategoryIds || sourceCategoryIds.length === 0 || !targetCategoryId) {
      return false;
    }

    const batch = writeBatch(db);

    // 1. Fetch source category objects to get their slugs and names for precise matching
    const catColRef = collection(db, 'categories');
    const catSnapshot = await getDocs(catColRef);
    const allCategories = catSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Category));
    
    const sourceCats = allCategories.filter(c => sourceCategoryIds.includes(c.id));
    const sourceSlugs = new Set<string>();
    const sourceNames = new Set<string>();
    sourceCats.forEach(c => {
      if (c.slug) sourceSlugs.add(c.slug.toLowerCase().trim());
      if (c.name) sourceNames.add(c.name.toLowerCase().trim());
    });

    // 2. Fetch and migrate affected products
    const prodColRef = collection(db, 'products');
    const prodSnapshot = await getDocs(prodColRef);
    const allProducts = prodSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Product));

    const now = new Date().toISOString();
    let writeCount = 0;

    for (const prod of allProducts) {
      const prodCat = (prod.category || '').toLowerCase().trim();
      const prodCatLabel = (prod.categoryLabel || '').toLowerCase().trim();
      
      const isMatch = 
        sourceCategoryIds.includes(prod.category as string) ||
        sourceSlugs.has(prodCat) ||
        sourceNames.has(prodCatLabel);

      if (isMatch) {
        const prodRef = doc(db, 'products', prod.id);
        batch.update(prodRef, {
          category: targetCategorySlug,
          categoryLabel: targetCategoryName,
          updatedAt: now
        });
        writeCount++;
      }
    }

    // 3. Update any child subcategories that had a source category as parent
    for (const cat of allCategories) {
      if (cat.parentCategory && (sourceCategoryIds.includes(cat.parentCategory) || sourceSlugs.has(cat.parentCategory.toLowerCase().trim()))) {
        const catRef = doc(db, 'categories', cat.id);
        batch.update(catRef, {
          parentCategory: targetCategorySlug,
          updatedAt: now
        });
        writeCount++;
      }
    }

    // 4. Delete the source categories
    for (const srcId of sourceCategoryIds) {
      if (srcId !== targetCategoryId) {
        const catRef = doc(db, 'categories', srcId);
        batch.delete(catRef);
        writeCount++;
      }
    }

    if (writeCount > 0) {
      await batch.commit();
    }

    return true;
  } catch (error) {
    console.error('Error merging categories in Firestore:', error);
    return false;
  }
}

// ---------------- 1. HERO BANNERS (Collection: 'banners') ----------------
export async function getHeroBannersFromFirestore(): Promise<HeroBanner[]> {
  try {
    const colRef = collection(db, 'banners');
    const snapshot = await getDocs(colRef);
    const banners = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HeroBanner));
    return banners.sort((a, b) => (a.sortOrder ?? a.displayOrder ?? 0) - (b.sortOrder ?? b.displayOrder ?? 0));
  } catch (error) {
    console.error('Error fetching hero banners:', error);
    return [];
  }
}

export function subscribeToHeroBanners(
  callback: (banners: HeroBanner[]) => void,
  errorCallback?: (error: Error) => void
) {
  const colRef = collection(db, 'banners');
  return onSnapshot(colRef, (snapshot) => {
    const banners = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HeroBanner));
    const sorted = banners.sort((a, b) => (a.sortOrder ?? a.displayOrder ?? 0) - (b.sortOrder ?? b.displayOrder ?? 0));
    callback(sorted);
  }, (error) => {
    if (errorCallback) {
      errorCallback(error);
    } else {
      console.error('Hero banners listener error:', error.message);
    }
  });
}

export async function createHeroBannerInFirestore(banner: HeroBanner): Promise<boolean> {
  try {
    const docRef = doc(db, 'banners', banner.id);
    const sanitized = sanitizePayload({
      ...banner,
      createdAt: banner.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    await setDoc(docRef, sanitized, { merge: true });
    return true;
  } catch (error) {
    console.error('Error creating hero banner:', error);
    return false;
  }
}

export async function updateHeroBannerInFirestore(id: string, updated: Partial<HeroBanner>): Promise<boolean> {
  try {
    const docRef = doc(db, 'banners', id);
    const sanitized = sanitizePayload({
      ...updated,
      updatedAt: new Date().toISOString()
    });
    await setDoc(docRef, sanitized, { merge: true });
    return true;
  } catch (error) {
    console.error('Error updating hero banner:', error);
    return false;
  }
}

export async function setHeroBannerInFirestore(id: string, banner: Partial<HeroBanner>): Promise<boolean> {
  return updateHeroBannerInFirestore(id, banner);
}

export async function deleteHeroBannerFromFirestore(id: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, 'banners', id));
    return true;
  } catch (error) {
    console.error('Error deleting hero banner:', error);
    return false;
  }
}

export async function toggleHeroBannerStatusInFirestore(id: string, isActive: boolean): Promise<boolean> {
  return updateHeroBannerInFirestore(id, { isActive });
}

export async function reorderHeroBannersInFirestore(bannerOrders: { id: string; sortOrder: number }[]): Promise<boolean> {
  try {
    const promises = bannerOrders.map(item => 
      updateHeroBannerInFirestore(item.id, { sortOrder: item.sortOrder, displayOrder: item.sortOrder })
    );
    await Promise.all(promises);
    return true;
  } catch (error) {
    console.error('Error reordering hero banners:', error);
    return false;
  }
}

// Backward compatibility wrappers for legacy code
export const getBannersFromFirestore = getHeroBannersFromFirestore;
export const subscribeToBanners = subscribeToHeroBanners;
export const setBannerInFirestore = setHeroBannerInFirestore;
export const deleteBannerFromFirestore = deleteHeroBannerFromFirestore;

// ---------------- 2. HOMEPAGE SECTIONS (Collection: 'homepageSections') ----------------
function normalizeHomepageSection(id: string, data: Record<string, any>): HomepageSection {
  const sortOrder = typeof data.sortOrder === 'number' 
    ? data.sortOrder 
    : (typeof data.displayOrder === 'number' ? data.displayOrder : 0);
  const isActive = data.isActive !== undefined 
    ? Boolean(data.isActive) 
    : (data.enabled !== undefined ? Boolean(data.enabled) : true);
  const sectionType = data.sectionType || data.type || 'product_grid';
  const settings = data.settings || data.config || {};
  
  return {
    ...data,
    id: data.id || id,
    title: data.title || '',
    subtitle: data.subtitle || '',
    sectionType,
    type: sectionType,
    sortOrder,
    displayOrder: sortOrder,
    isActive,
    enabled: isActive,
    settings,
    config: settings,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString()
  } as HomepageSection;
}

export async function getHomepageSectionsFromFirestore(): Promise<HomepageSection[]> {
  try {
    const colRef = collection(db, 'homepageSections');
    const snapshot = await getDocs(colRef);
    const sections = snapshot.docs.map(doc => normalizeHomepageSection(doc.id, doc.data()));
    return sections.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  } catch (error) {
    console.error('Error fetching homepage sections:', error);
    return [];
  }
}

export function subscribeToHomepageSections(
  callback: (sections: HomepageSection[]) => void,
  errorCallback?: (error: Error) => void
) {
  const colRef = collection(db, 'homepageSections');
  return onSnapshot(colRef, (snapshot) => {
    const sections = snapshot.docs.map(doc => normalizeHomepageSection(doc.id, doc.data()));
    const sorted = sections.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    callback(sorted);
  }, (error) => {
    if (errorCallback) {
      errorCallback(error);
    } else {
      console.error('Homepage sections listener error:', error.message);
    }
  });
}

export async function createHomepageSectionInFirestore(section: HomepageSection): Promise<boolean> {
  try {
    const sectionId = section.id || `section_${Date.now()}`;
    const docRef = doc(db, 'homepageSections', sectionId);
    const sortOrder = typeof section.sortOrder === 'number' 
      ? section.sortOrder 
      : (typeof section.displayOrder === 'number' ? section.displayOrder : 0);
    const isActive = section.isActive !== undefined 
      ? Boolean(section.isActive) 
      : (section.enabled !== undefined ? Boolean(section.enabled) : true);
    const sectionType = section.sectionType || section.type || 'product_grid';
    const settings = section.settings || section.config || {};
    
    const sanitized = sanitizePayload({
      ...section,
      id: sectionId,
      title: section.title || '',
      subtitle: section.subtitle || '',
      sectionType,
      type: sectionType,
      sortOrder,
      displayOrder: sortOrder,
      isActive,
      enabled: isActive,
      settings,
      config: settings,
      createdAt: section.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    await setDoc(docRef, sanitized, { merge: true });
    return true;
  } catch (error) {
    console.error('Error creating homepage section:', error);
    return false;
  }
}

export async function updateHomepageSectionInFirestore(id: string, updated: Partial<HomepageSection>): Promise<boolean> {
  try {
    if (!id) return false;
    const docRef = doc(db, 'homepageSections', id);
    const updateData: Record<string, any> = { ...updated, id };
    
    if (updated.sortOrder !== undefined) {
      updateData.sortOrder = Number(updated.sortOrder);
      updateData.displayOrder = Number(updated.sortOrder);
    } else if (updated.displayOrder !== undefined) {
      updateData.sortOrder = Number(updated.displayOrder);
      updateData.displayOrder = Number(updated.displayOrder);
    }
    
    if (updated.isActive !== undefined) {
      updateData.isActive = Boolean(updated.isActive);
      updateData.enabled = Boolean(updated.isActive);
    } else if (updated.enabled !== undefined) {
      updateData.isActive = Boolean(updated.enabled);
      updateData.enabled = Boolean(updated.enabled);
    }
    
    if (updated.sectionType !== undefined) {
      updateData.sectionType = updated.sectionType;
      updateData.type = updated.sectionType;
    } else if (updated.type !== undefined) {
      updateData.sectionType = updated.type;
      updateData.type = updated.type;
    }
    
    if (updated.settings !== undefined) {
      updateData.settings = updated.settings;
      updateData.config = updated.settings;
    } else if (updated.config !== undefined) {
      updateData.settings = updated.config;
      updateData.config = updated.config;
    }
    
    updateData.updatedAt = new Date().toISOString();
    const sanitized = sanitizePayload(updateData);
    await setDoc(docRef, sanitized, { merge: true });
    return true;
  } catch (error) {
    console.error('Error updating homepage section:', error);
    return false;
  }
}

export async function setHomepageSectionInFirestore(id: string, section: Partial<HomepageSection>): Promise<boolean> {
  return updateHomepageSectionInFirestore(id, section);
}

export async function deleteHomepageSectionFromFirestore(id: string): Promise<boolean> {
  try {
    if (!id) return false;
    await deleteDoc(doc(db, 'homepageSections', id));
    return true;
  } catch (error) {
    console.error('Error deleting homepage section:', error);
    return false;
  }
}

export async function toggleHomepageSectionStatusInFirestore(id: string, isActive: boolean): Promise<boolean> {
  return updateHomepageSectionInFirestore(id, { isActive, enabled: isActive });
}

export async function reorderHomepageSectionsInFirestore(sectionOrders: { id: string; sortOrder: number }[]): Promise<boolean> {
  try {
    if (!sectionOrders || sectionOrders.length === 0) return true;
    const batch = writeBatch(db);
    const now = new Date().toISOString();
    
    sectionOrders.forEach(item => {
      if (item && item.id) {
        const docRef = doc(db, 'homepageSections', String(item.id));
        const orderNum = typeof item.sortOrder === 'number' ? item.sortOrder : 0;
        const data = sanitizePayload({
          sortOrder: orderNum,
          displayOrder: orderNum,
          updatedAt: now
        });
        batch.set(docRef, data, { merge: true });
      }
    });
    
    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error reordering homepage sections via batch:', error);
    // Fallback to individual updates
    try {
      for (const item of sectionOrders) {
        if (item && item.id) {
          const docRef = doc(db, 'homepageSections', String(item.id));
          const orderNum = typeof item.sortOrder === 'number' ? item.sortOrder : 0;
          await setDoc(docRef, sanitizePayload({
            sortOrder: orderNum,
            displayOrder: orderNum,
            updatedAt: new Date().toISOString()
          }), { merge: true });
        }
      }
      return true;
    } catch (fallbackErr) {
      console.error('Fallback reorder error:', fallbackErr);
      return false;
    }
  }
}

// ---------------- COUPONS ----------------
export async function getCouponsFromFirestore(): Promise<Coupon[]> {
  try {
    const colRef = collection(db, 'coupons');
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Coupon));
  } catch (error) {
    console.error('Error fetching coupons:', error);
    return [];
  }
}

export function subscribeToCoupons(
  callback: (coupons: Coupon[]) => void,
  errorCallback?: (error: Error) => void
) {
  const colRef = collection(db, 'coupons');
  return onSnapshot(colRef, (snapshot) => {
    const cpn = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Coupon));
    callback(cpn);
  }, (error) => {
    if (errorCallback) {
      errorCallback(error);
    } else {
      console.error('Coupons listener error:', error.message);
    }
  });
}

export async function saveCouponToFirestore(coupon: Partial<Coupon> & { id?: string }): Promise<boolean> {
  try {
    const couponId = coupon.id || doc(collection(db, 'coupons')).id;
    const docRef = doc(db, 'coupons', couponId);
    const sanitized = sanitizePayload({
      ...coupon,
      id: couponId,
      code: (coupon.code || '').trim().toUpperCase(),
      isActive: coupon.isActive !== undefined ? coupon.isActive : true,
      totalUsedCount: coupon.totalUsedCount ?? coupon.usageCount ?? 0,
      usageCount: coupon.totalUsedCount ?? coupon.usageCount ?? 0,
      perUserLimit: coupon.perUserLimit ?? 1,
      usedByUsers: coupon.usedByUsers || [],
      updatedAt: new Date().toISOString(),
      createdAt: coupon.createdAt || new Date().toISOString()
    });
    await setDoc(docRef, sanitized, { merge: true });
    return true;
  } catch (error) {
    console.error('Error saving coupon to Firestore:', error);
    return false;
  }
}

export async function setCouponInFirestore(id: string, coupon: Partial<Coupon>): Promise<boolean> {
  return saveCouponToFirestore({ ...coupon, id });
}

export async function updateCouponInFirestore(id: string, coupon: Partial<Coupon>): Promise<boolean> {
  return saveCouponToFirestore({ ...coupon, id });
}

export async function deleteCouponFromFirestore(id: string): Promise<boolean> {
  try {
    if (!id) return false;
    await deleteDoc(doc(db, 'coupons', id));
    return true;
  } catch (error) {
    console.error('Error deleting coupon:', error);
    return false;
  }
}

/**
 * Executes an atomic Firestore transaction to record coupon usage for an order.
 * Prevents race condition, strictly enforces usage limits and 1 user = 1 time usage rule.
 */
export async function applyCouponAtomicTransaction(params: {
  couponId: string;
  userId?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  orderId: string;
  orderTotal: number;
  discountAmount: number;
  isFreeShippingApplied: boolean;
}): Promise<{ success: boolean; errorMessage?: string }> {
  const { 
    couponId, 
    userId, 
    customerPhone, 
    customerEmail, 
    orderId, 
    orderTotal, 
    discountAmount, 
    isFreeShippingApplied 
  } = params;

  if (!couponId) {
    return { success: false, errorMessage: 'Missing coupon identifier.' };
  }

  const userKey = (userId || customerPhone || '').trim().toLowerCase();

  try {
    const couponRef = doc(db, 'coupons', couponId);
    const usageDocId = `usage_${couponId}_${orderId}`;
    const usageRef = doc(db, 'coupon_usages', usageDocId);

    const result = await runTransaction(db, async (transaction) => {
      const couponDoc = await transaction.get(couponRef);
      if (!couponDoc.exists()) {
        throw new Error('Coupon not found in database.');
      }

      const couponData = couponDoc.data() as Coupon;

      // 1. Status Check
      if (couponData.isActive === false) {
        throw new Error('This coupon is no longer active.');
      }

      // 2. Date Range Verification
      const now = new Date();
      if (couponData.startDate) {
        const start = new Date(couponData.startDate);
        if (!isNaN(start.getTime()) && now < start) {
          throw new Error('This coupon offer has not started yet.');
        }
      }

      const expiryStr = couponData.endDate || couponData.expiryDate;
      if (expiryStr) {
        const end = new Date(expiryStr);
        if (!isNaN(end.getTime()) && now > end) {
          throw new Error('This coupon has expired.');
        }
      }

      // 3. Global Usage Limit Check
      const globalLimit = couponData.globalUsageLimit ?? couponData.usageLimit ?? 0;
      const currentCount = couponData.totalUsedCount ?? couponData.usageCount ?? 0;
      if (globalLimit > 0 && currentCount >= globalLimit) {
        throw new Error('This coupon has reached its maximum global usage limit.');
      }

      // 4. Per User Limit Check (Atomic)
      const existingUsedUsers = (couponData.usedByUsers || []).map(u => (u || '').trim().toLowerCase());
      if (userKey && existingUsedUsers.includes(userKey)) {
        throw new Error('This coupon has already been used by your account.');
      }

      // Safe update
      const newUsedCount = currentCount + 1;
      const updatedUsedUsers = userKey ? [...existingUsedUsers, userKey] : existingUsedUsers;

      const nowIso = new Date().toISOString();

      // Write 1: Update Coupon document counters & user list
      transaction.update(couponRef, {
        totalUsedCount: newUsedCount,
        usageCount: newUsedCount,
        usedByUsers: updatedUsedUsers,
        updatedAt: nowIso
      });

      // Write 2: Create audit trail record in coupon_usages
      const auditPayload: CouponUsageRecord = {
        id: usageDocId,
        couponId,
        couponCode: couponData.code || '',
        userId: userId || customerPhone || 'guest',
        customerPhone: customerPhone || undefined,
        customerEmail: customerEmail || undefined,
        orderId,
        orderTotal,
        discountAmount,
        isFreeShippingApplied,
        usedAt: nowIso
      };

      transaction.set(usageRef, sanitizePayload(auditPayload));

      return { success: true };
    });

    return result;
  } catch (error: any) {
    console.error('Atomic coupon transaction failed:', error);
    return {
      success: false,
      errorMessage: error?.message || 'Failed to apply coupon transaction.'
    };
  }
}

// ---------------- ORDERS ----------------
export async function getOrdersFromFirestore(): Promise<Order[]> {
  try {
    const colRef = collection(db, 'orders');
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
  } catch (error) {
    console.error('Error fetching orders:', error);
    return [];
  }
}

export function subscribeToOrders(
  callback: (orders: Order[]) => void,
  errorCallback?: (error: Error) => void
) {
  const colRef = collection(db, 'orders');
  return onSnapshot(colRef, (snapshot) => {
    const ords = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
    callback(ords);
  }, (error) => {
    if (errorCallback) {
      errorCallback(error);
    } else {
      console.error('Orders listener error:', error.message);
    }
  });
}

export async function createOrderInFirestore(order: Order): Promise<boolean> {
  try {
    const docRef = doc(db, 'orders', order.id);
    const sanitized = sanitizePayload(order);
    await setDoc(docRef, { ...sanitized, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    return true;
  } catch (error) {
    console.error('Error creating order:', error);
    return false;
  }
}

export async function updateOrderStatusInFirestore(
  id: string, 
  status: OrderStatus, 
  trackingNumber?: string,
  extraFields?: Record<string, any>
): Promise<boolean> {
  try {
    const docRef = doc(db, 'orders', id);
    const payload: any = { 
      status, 
      updatedAt: new Date().toISOString(),
      ...(extraFields ? sanitizePayload(extraFields) : {})
    };
    if (trackingNumber !== undefined) payload.trackingNumber = trackingNumber;
    await updateDoc(docRef, payload);
    return true;
  } catch (error) {
    console.error('Error updating order status:', error);
    return false;
  }
}

// ---------------- STORE SETTINGS ----------------
export async function getStoreSettingsFromFirestore(): Promise<StoreSettings | null> {
  try {
    const docRef = doc(db, 'settings', 'store');
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      return snapshot.data() as StoreSettings;
    }
    return null;
  } catch (error) {
    console.error('Error fetching store settings:', error);
    return null;
  }
}

export function subscribeToStoreSettings(callback: (settings: StoreSettings | null) => void) {
  const docRef = doc(db, 'settings', 'store');
  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data() as StoreSettings);
    } else {
      callback(null);
    }
  }, (error) => {
    console.error('Settings listener error:', error.message);
  });
}

export async function saveStoreSettingsToFirestore(settings: Partial<StoreSettings>): Promise<boolean> {
  try {
    const docRef = doc(db, 'settings', 'store');
    const sanitized = sanitizePayload(settings);
    await setDoc(docRef, { ...sanitized, updatedAt: new Date().toISOString() }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error saving settings:', error);
    return false;
  }
}

// ---------------- MARKETING & TRACKING CONFIG ----------------
export async function getMarketingConfigFromFirestore(): Promise<MarketingPixelsConfig | null> {
  try {
    const docRef = doc(db, 'settings', 'marketing');
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      return snapshot.data() as MarketingPixelsConfig;
    }
    return null;
  } catch (error) {
    console.error('Error fetching marketing config:', error);
    return null;
  }
}

export function subscribeToMarketingConfig(
  callback: (config: MarketingPixelsConfig | null) => void,
  errorCallback?: (error: Error) => void
) {
  const docRef = doc(db, 'settings', 'marketing');
  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data() as MarketingPixelsConfig);
    } else {
      callback(null);
    }
  }, (error) => {
    if (errorCallback) {
      errorCallback(error);
    } else {
      console.warn('Marketing config listener warning:', error.message);
    }
  });
}

export async function saveMarketingConfigToFirestore(config: Partial<MarketingPixelsConfig>): Promise<boolean> {
  try {
    if (!auth.currentUser) {
      // In guest or local preview mode, settings are stored in local memory & localStorage
      return true;
    }
    const docRef = doc(db, 'settings', 'marketing');
    const sanitized = sanitizePayload(config);
    await setDoc(docRef, { ...sanitized, updatedAt: new Date().toISOString() }, { merge: true });
    return true;
  } catch (error: any) {
    console.warn('Marketing config persistence status:', error?.message || error);
    return false;
  }
}

// ---------------- GLOBAL SEO CONFIGURATION ----------------
export async function getSeoConfigFromFirestore(): Promise<SeoConfig | null> {
  try {
    const docRef = doc(db, 'settings', 'seo');
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      return snapshot.data() as SeoConfig;
    }
    return null;
  } catch (error) {
    console.error('Error fetching SEO config from Firestore:', error);
    return null;
  }
}

export function subscribeToSeoConfig(
  callback: (config: SeoConfig | null) => void,
  errorCallback?: (error: Error) => void
) {
  const docRef = doc(db, 'settings', 'seo');
  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data() as SeoConfig);
    } else {
      callback(null);
    }
  }, (error) => {
    if (errorCallback) {
      errorCallback(error);
    } else {
      console.warn('SEO config listener warning:', error.message);
    }
  });
}

export async function saveSeoConfigToFirestore(config: Partial<SeoConfig>): Promise<boolean> {
  try {
    const docRef = doc(db, 'settings', 'seo');
    const sanitized = sanitizePayload(config);
    await setDoc(docRef, { ...sanitized, updatedAt: new Date().toISOString() }, { merge: true });
    return true;
  } catch (error: any) {
    console.warn('SEO config persistence status:', error?.message || error);
    return false;
  }
}

// ---------------- PAGE-SPECIFIC SEO CONFIGURATION ----------------
export async function getPageSeoListFromFirestore(): Promise<PageSeoItem[]> {
  try {
    const docRef = doc(db, 'settings', 'pages_seo');
    const snapshot = await getDoc(docRef);
    if (snapshot.exists() && Array.isArray(snapshot.data()?.pages)) {
      return snapshot.data().pages as PageSeoItem[];
    }
    return [];
  } catch (error) {
    console.error('Error fetching page SEO list from Firestore:', error);
    return [];
  }
}

export function subscribeToPageSeoList(
  callback: (pages: PageSeoItem[]) => void,
  errorCallback?: (error: Error) => void
) {
  const docRef = doc(db, 'settings', 'pages_seo');
  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists() && Array.isArray(snapshot.data()?.pages)) {
      callback(snapshot.data().pages as PageSeoItem[]);
    } else {
      callback([]);
    }
  }, (error) => {
    if (errorCallback) {
      errorCallback(error);
    } else {
      console.warn('Page SEO listener warning:', error.message);
    }
  });
}

export async function savePageSeoListToFirestore(pages: PageSeoItem[]): Promise<boolean> {
  try {
    const docRef = doc(db, 'settings', 'pages_seo');
    const sanitized = sanitizePayload({ pages });
    await setDoc(docRef, { ...sanitized, updatedAt: new Date().toISOString() }, { merge: true });
    return true;
  } catch (error: any) {
    console.warn('Page SEO list persistence status:', error?.message || error);
    return false;
  }
}

// ---------------- COURIER SERVICES ----------------
export async function getCourierConfigsFromFirestore(): Promise<CourierServiceConfig[]> {
  try {
    const colRef = collection(db, 'courier_configs');
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CourierServiceConfig));
  } catch (error: any) {
    console.warn('Error fetching courier configs from Firestore:', error?.message || error);
    return [];
  }
}

export function subscribeToCourierConfigs(
  callback: (couriers: CourierServiceConfig[]) => void,
  errorCallback?: (error: Error) => void
) {
  const colRef = collection(db, 'courier_configs');
  return onSnapshot(colRef, (snapshot) => {
    const couriers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CourierServiceConfig));
    callback(couriers);
  }, (error) => {
    if (errorCallback) {
      errorCallback(error);
    } else {
      console.warn('Courier configs listener notice:', error.message);
    }
  });
}

export async function saveCourierConfigToFirestore(courier: CourierServiceConfig): Promise<boolean> {
  try {
    const docRef = doc(db, 'courier_configs', courier.id);
    const sanitized = sanitizePayload({
      ...courier,
      updatedAt: new Date().toISOString()
    });
    await setDoc(docRef, sanitized, { merge: true });
    return true;
  } catch (error: any) {
    console.warn('Error saving courier config:', error?.message || error);
    return false;
  }
}

export async function deleteCourierConfigFromFirestore(courierId: string): Promise<boolean> {
  try {
    const docRef = doc(db, 'courier_configs', courierId);
    await deleteDoc(docRef);
    return true;
  } catch (error: any) {
    console.warn('Error deleting courier config:', error?.message || error);
    return false;
  }
}

// ---------------- SEEDING ----------------
export async function seedInitialDatabaseIfEmpty(initialData?: {
  products?: Product[];
  categories?: Category[];
  banners?: HeroBanner[];
  heroBanners?: HeroBanner[];
  homepageSections?: HomepageSection[];
  coupons?: Coupon[];
  marketingPixels?: MarketingPixelsConfig;
  seoConfig?: SeoConfig;
  pagesSeo?: PageSeoItem[];
}): Promise<void> {
  try {
    if (!initialData) return;
    
    // Seed products if provided
    if (initialData.products && initialData.products.length > 0) {
      for (const p of initialData.products) {
        await createProductInFirestore(p, p.id);
      }
    }
    // Seed categories if provided
    if (initialData.categories && initialData.categories.length > 0) {
      for (const c of initialData.categories) {
        await setCategoryInFirestore(c.id, c);
      }
    }
    // Seed hero banners if provided
    const bannersToSeed = initialData.heroBanners || initialData.banners;
    if (bannersToSeed && bannersToSeed.length > 0) {
      for (const b of bannersToSeed) {
        await setHeroBannerInFirestore(b.id, b);
      }
    }
    // Seed homepage sections if provided
    if (initialData.homepageSections && initialData.homepageSections.length > 0) {
      for (const s of initialData.homepageSections) {
        await setHomepageSectionInFirestore(s.id, s);
      }
    }
    // Seed coupons if provided
    if (initialData.coupons && initialData.coupons.length > 0) {
      for (const cp of initialData.coupons) {
        await setCouponInFirestore(cp.id, cp);
      }
    }
    // Seed marketing config if provided
    if (initialData.marketingPixels) {
      await saveMarketingConfigToFirestore(initialData.marketingPixels);
    }
    // Seed SEO config if provided
    if (initialData.seoConfig) {
      await saveSeoConfigToFirestore(initialData.seoConfig);
    }
    // Seed Pages SEO if provided
    if (initialData.pagesSeo && initialData.pagesSeo.length > 0) {
      await savePageSeoListToFirestore(initialData.pagesSeo);
    }
  } catch (error) {
    console.error('Error in seedInitialDatabaseIfEmpty:', error);
  }
}
