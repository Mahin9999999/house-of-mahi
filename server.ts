import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { courierRouter } from './server/routes/courier';
import paymentRouter from './server/routes/payment';
import { trackingRouter } from './server/routes/tracking';
import adminStaffRouter from './server/routes/adminStaff.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middlewares
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      service: 'houseofmahi-api' 
    });
  });

  // Courier API Routes
  app.use('/api/courier', courierRouter);

  // Payment Gateway API Routes
  app.use('/api/payment', paymentRouter);

  // Tracking API Routes (Meta CAPI & GA4 Server Tracking)
  app.use('/api/tracking', trackingRouter);

  // Staff Management API Routes
  app.use('/api/admin/staff', adminStaffRouter);

  // ==========================================
  // PRODUCTION SEO DIRECTIVES & CRAWLER ROUTES
  // ==========================================

  /**
   * GET /robots.txt
   * Returns valid plain-text crawl directives and references the canonical XML sitemap
   */
  app.get('/robots.txt', async (_req, res) => {
    try {
      // Fast fallback configuration
      let baseUrl = 'https://houseofmahibd.com';
      let allowSearchEngines = true;
      let customRobots = '';

      try {
        const { getDoc, doc } = await import('firebase/firestore');
        const { db } = await import('./src/firebase/config.js');
        const seoDocSnap = await getDoc(doc(db, 'settings', 'seo'));
        if (seoDocSnap.exists()) {
          const data = seoDocSnap.data();
          if (data.canonicalBaseUrl) baseUrl = data.canonicalBaseUrl.replace(/\/+$/, '');
          if (data.allowSearchEngines === false || data.robotsIndex === false) allowSearchEngines = false;
          if (data.customRobotsTxt) customRobots = data.customRobotsTxt.trim();
        }
      } catch (err) {
        // Safe fallback to default domain if Firestore is unreachable
      }

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');

      if (!allowSearchEngines) {
        return res.send(`User-agent: *\nDisallow: /\n`);
      }

      if (customRobots) {
        return res.send(customRobots);
      }

      const defaultRobotsTxt = `# House of Mahi Production Robots Directives
User-agent: *
Allow: /
Allow: /shop
Allow: /about
Allow: /contact
Allow: /faq
Allow: /product/
Allow: /category/

# Protect Administrative, Private and Session Endpoints
Disallow: /admin
Disallow: /admin/
Disallow: /secure-management-login
Disallow: /checkout
Disallow: /account
Disallow: /api/

Sitemap: ${baseUrl}/sitemap.xml
`;
      return res.send(defaultRobotsTxt);
    } catch (error) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.send(`User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: https://houseofmahibd.com/sitemap.xml\n`);
    }
  });

  /**
   * GET /sitemap.xml
   * Returns a valid XML Sitemap populated with clean, canonical public URLs
   */
  app.get('/sitemap.xml', async (_req, res) => {
    try {
      let baseUrl = 'https://houseofmahibd.com';
      let productsList: any[] = [];
      let categoriesList: any[] = [];
      let customPages: any[] = [];

      try {
        const { getDoc, getDocs, collection, doc } = await import('firebase/firestore');
        const { db } = await import('./src/firebase/config.js');

        const [seoDocSnap, pagesDocSnap, productsSnap, categoriesSnap] = await Promise.allSettled([
          getDoc(doc(db, 'settings', 'seo')),
          getDoc(doc(db, 'settings', 'pages_seo')),
          getDocs(collection(db, 'products')),
          getDocs(collection(db, 'categories'))
        ]);

        if (seoDocSnap.status === 'fulfilled' && seoDocSnap.value.exists()) {
          const seoData = seoDocSnap.value.data();
          if (seoData.canonicalBaseUrl) {
            baseUrl = seoData.canonicalBaseUrl.replace(/\/+$/, '');
          }
        }

        if (pagesDocSnap.status === 'fulfilled' && pagesDocSnap.value.exists()) {
          const pData = pagesDocSnap.value.data();
          if (Array.isArray(pData.pages)) {
            customPages = pData.pages;
          }
        }

        if (productsSnap.status === 'fulfilled') {
          productsList = productsSnap.value.docs.map(d => ({ id: d.id, ...d.data() }));
        }

        if (categoriesSnap.status === 'fulfilled') {
          categoriesList = categoriesSnap.value.docs.map(d => ({ id: d.id, ...d.data() }));
        }
      } catch (e) {
        // Graceful fallback to static data if Firestore read is deferred
      }

      // If Firestore collections are empty, fall back to initial product/category data
      if (productsList.length === 0 || categoriesList.length === 0) {
        try {
          const { PRODUCTS, CATEGORIES, DEFAULT_PAGES_SEO } = await import('./src/data.js');
          if (productsList.length === 0) productsList = PRODUCTS;
          if (categoriesList.length === 0) categoriesList = CATEGORIES;
          if (customPages.length === 0) customPages = DEFAULT_PAGES_SEO;
        } catch (dataErr) {
          // Ignore import error
        }
      }

      const today = new Date().toISOString().split('T')[0];
      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
      xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

      // 1. Homepage
      xml += `  <url>\n    <loc>${baseUrl}/</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;

      // 2. Public Static Pages (exclude admin, account, checkout, cart)
      const allowedStaticPages = [
        { path: '/shop', changefreq: 'daily', priority: '0.9' },
        { path: '/about', changefreq: 'monthly', priority: '0.7' },
        { path: '/contact', changefreq: 'monthly', priority: '0.7' },
        { path: '/faq', changefreq: 'monthly', priority: '0.6' }
      ];

      for (const sp of allowedStaticPages) {
        xml += `  <url>\n    <loc>${baseUrl}${sp.path}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${sp.changefreq}</changefreq>\n    <priority>${sp.priority}</priority>\n  </url>\n`;
      }

      // 3. Category Pages (Clean URLs - No Hash)
      for (const cat of categoriesList) {
        if (cat.indexStatus && cat.indexStatus !== 'index') continue;
        const slug = cat.slug || cat.id;
        const catUrl = `${baseUrl}/category/${encodeURIComponent(slug)}`;
        xml += `  <url>\n    <loc>${catUrl}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.85</priority>\n  </url>\n`;
      }

      // 4. Product Pages (Clean URLs - No Hash)
      for (const prod of productsList) {
        const prodIndexStatus = prod.seo?.indexStatus || prod.indexStatus || 'index';
        if (prodIndexStatus !== 'index') continue;

        const slug = prod.seo?.slug || prod.slug || prod.id;
        const prodUrl = `${baseUrl}/product/${encodeURIComponent(slug)}`;
        xml += `  <url>\n    <loc>${prodUrl}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n`;

        if (prod.image) {
          const imageTitle = (prod.imageAlt || prod.name || 'Jewelry Piece')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
          const safeImgUrl = prod.image.replace(/&/g, '&amp;');
          xml += `    <image:image>\n      <image:loc>${safeImgUrl}</image:loc>\n      <image:title>${imageTitle}</image:title>\n    </image:image>\n`;
        }

        xml += `  </url>\n`;
      }

      xml += `</urlset>`;

      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
      return res.send(xml);
    } catch (error) {
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      const fallbackXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>https://houseofmahibd.com/</loc></url>\n</urlset>`;
      return res.send(fallbackXml);
    }
  });

  // Development vs Production serving
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Houseofmahi Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
