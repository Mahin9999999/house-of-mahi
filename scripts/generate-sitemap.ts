/**
 * scripts/generate-sitemap.ts
 *
 * Automated Sitemap Generator for House of Mahi
 * Fetches real active products and categories directly from Firestore
 * Filters out drafts, unindexed, or private items
 * Generates standards-compliant XML at public/sitemap.xml
 */

import * as fs from 'fs';
import * as path from 'path';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

// 1. Firebase Client Configuration (public configuration matching src/firebase/config.ts)
const firebaseConfig = {
  apiKey: "AIzaSyC6XtHomMNSLF33-s-WzqyMnBOUJLU2820",
  authDomain: "houseofmahi.firebaseapp.com",
  projectId: "houseofmahi",
  storageBucket: "houseofmahi.appspot.com",
  messagingSenderId: "455966279427",
  appId: "1:455966279427:web:ec46a04b527c8c1ba8cb36"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

const BASE_URL = 'https://houseofmahibd.com';

// Helper: Escape XML special characters
function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Helper: Format date to YYYY-MM-DD
function formatDate(dateInput?: any): string {
  try {
    if (!dateInput) return new Date().toISOString().split('T')[0];
    if (typeof dateInput === 'string') {
      const d = new Date(dateInput);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    }
    if (dateInput?.toDate && typeof dateInput.toDate === 'function') {
      return dateInput.toDate().toISOString().split('T')[0];
    }
    if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
      return dateInput.toISOString().split('T')[0];
    }
    if (typeof dateInput === 'number') {
      const d = new Date(dateInput);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    }
  } catch {
    // fallback
  }
  return new Date().toISOString().split('T')[0];
}

interface SitemapUrlEntry {
  loc: string;
  lastmod: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: string;
}

async function generateSitemap(): Promise<void> {
  console.log('🚀 Starting sitemap generation for House of Mahi...');
  const today = new Date().toISOString().split('T')[0];
  const urlEntries: SitemapUrlEntry[] = [];

  // 1. Core Public Static Pages (Strictly canonical, excluding admin/checkout/cart/account)
  const corePages: SitemapUrlEntry[] = [
    { loc: `${BASE_URL}/`, lastmod: today, changefreq: 'daily', priority: '1.0' },
    { loc: `${BASE_URL}/shop`, lastmod: today, changefreq: 'daily', priority: '0.9' },
    { loc: `${BASE_URL}/about`, lastmod: today, changefreq: 'monthly', priority: '0.7' },
    { loc: `${BASE_URL}/contact`, lastmod: today, changefreq: 'monthly', priority: '0.7' },
    { loc: `${BASE_URL}/faq`, lastmod: today, changefreq: 'monthly', priority: '0.6' }
  ];
  urlEntries.push(...corePages);

  // 2. Fetch real active categories from Firestore
  try {
    console.log('📦 Fetching categories from Firestore...');
    const catCollection = collection(db, 'categories');
    const catSnapshot = await getDocs(catCollection);
    const addedCatSlugs = new Set<string>();

    catSnapshot.forEach((docSnap) => {
      const data = docSnap.data();

      // 1. CATEGORY NOINDEX FILTER: skip if explicitly marked noindex
      if (data.indexStatus === 'noindex') {
        return;
      }

      const rawSlug = data.slug || data.id || docSnap.id;
      if (!rawSlug) return;

      const slug = String(rawSlug).toLowerCase().trim().replace(/\s+/g, '-');
      if (slug && !addedCatSlugs.has(slug)) {
        addedCatSlugs.add(slug);
        urlEntries.push({
          loc: `${BASE_URL}/category/${encodeURIComponent(slug)}`,
          lastmod: formatDate(data.updatedAt || data.createdAt),
          changefreq: 'weekly',
          priority: '0.8'
        });
      }
    });

    console.log(`✅ Loaded ${addedCatSlugs.size} active categories.`);
  } catch (catError) {
    console.error('❌ CRITICAL ERROR fetching categories from Firestore:', catError);
    console.warn('⚠️ Continuing build without categories (sitemap will be partial).');
  }

  // 3. Fetch real active products from Firestore
  try {
    console.log('💎 Fetching products from Firestore...');
    const prodCollection = collection(db, 'products');
    const prodSnapshot = await getDocs(prodCollection);
    let activeProductCount = 0;
    const addedProductSlugs = new Set<string>();

    prodSnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const rawProductId = docSnap.id || data.id;

      // Filter: Skip invalid IDs or drafts/unpublished
      if (!rawProductId) return;
      if (data.status === 'draft' || data.isPublished === false) return;
      if (data.seo?.indexStatus === 'noindex') return;

      // Filter: Skip test / dummy / hardcoded old demo items if any
      const lowerId = String(rawProductId).toLowerCase();
      if (lowerId.startsWith('dummy-') || lowerId === 'test') return;

      // 2. PRODUCT URL SLUG SYNC: Sync with App.tsx priority (seo.slug || slug || id)
      const rawSlug = data.seo?.slug || data.slug || rawProductId;
      const productSlug = String(rawSlug).trim();
      if (!productSlug) return;

      // Prevent duplicate URLs for the same product
      const normalizedSlugKey = productSlug.toLowerCase();
      if (addedProductSlugs.has(normalizedSlugKey)) return;
      addedProductSlugs.add(normalizedSlugKey);

      activeProductCount++;
      const lastModDate = formatDate(data.updatedAt || data.createdAt || data.dateAdded);

      urlEntries.push({
        loc: `${BASE_URL}/product/${encodeURIComponent(productSlug)}`,
        lastmod: lastModDate,
        changefreq: 'weekly',
        priority: '0.8'
      });
    });

    console.log(`✅ Loaded ${activeProductCount} active, indexable products.`);
  } catch (prodError) {
    console.error('❌ CRITICAL ERROR fetching products from Firestore:', prodError);
    console.warn('⚠️ Continuing build without products (sitemap will be partial).');
  }

  // 4. Construct valid XML string
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  for (const entry of urlEntries) {
    xml += `  <url>\n`;
    xml += `    <loc>${escapeXml(entry.loc)}</loc>\n`;
    xml += `    <lastmod>${entry.lastmod}</lastmod>\n`;
    xml += `    <changefreq>${entry.changefreq}</changefreq>\n`;
    xml += `    <priority>${entry.priority}</priority>\n`;
    xml += `  </url>\n`;
  }

  xml += `</urlset>\n`;

  // 5. Write to public/sitemap.xml
  const publicDir = path.resolve(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const outputPath = path.join(publicDir, 'sitemap.xml');
  fs.writeFileSync(outputPath, xml, 'utf8');

  console.log(`🎉 Sitemap successfully generated at: ${outputPath}`);
  console.log(`📊 Total URL count: ${urlEntries.length}`);
}

// Execute generator
generateSitemap()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Fatal error generating sitemap:', err);
    console.warn('⚠️ Build will continue; sitemap may be stale.');
    process.exit(0);
  });
