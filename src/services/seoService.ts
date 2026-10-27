// Houseofmahi Centralized SEO & Structured Data Service Engine
// Handles DOM Head Injection, Real-time Previews, JSON-LD Schema generation, Sitemap & Deterministic SEO Audits

import { SeoConfig, PageSeoItem, Product, Category, SeoAuditSummary, SeoAuditIssue } from '../types';

export interface ActiveSeoState {
  title: string;
  description: string;
  keywords: string;
  canonicalUrl: string;
  robots: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogType: string;
  ogUrl: string;
  twitterCard: 'summary' | 'summary_large_image';
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
  schemaJson?: object | object[];
}

class SeoService {
  private currentAppliedState: ActiveSeoState | null = null;

  /**
   * Helper to safely sanitize strings for meta tags
   */
  public sanitizeMetaText(text?: string, maxLength = 300): string {
    if (!text) return '';
    return text
      .replace(/<[^>]*>?/gm, '') // Strip HTML tags
      .replace(/\s+/g, ' ') // Collapse extra whitespaces
      .trim()
      .slice(0, maxLength);
  }

  /**
   * Helper to sanitize URL, strip tracking/filter params and hash fragments (#) for canonical SEO conformity
   */
  public cleanCanonicalUrl(url?: string, fallbackBase = 'https://houseofmahibd.com'): string {
    if (!url) return `${fallbackBase.replace(/\/+$/, '')}/`;
    const trimmed = url.trim();
    if (!trimmed) return `${fallbackBase.replace(/\/+$/, '')}/`;

    const baseClean = fallbackBase.replace(/\/+$/, '');

    // If it's a hash-based path like /#product-xxx or #product-xxx, convert to clean path
    if (trimmed.includes('#product-')) {
      const slug = trimmed.split('#product-')[1]?.split('?')[0] || '';
      return `${baseClean}/product/${encodeURIComponent(slug)}`;
    }
    if (trimmed.includes('#category-')) {
      const slug = trimmed.split('#category-')[1]?.split('?')[0] || '';
      return `${baseClean}/category/${encodeURIComponent(slug)}`;
    }
    if (trimmed.includes('#shop')) {
      return `${baseClean}/shop`;
    }

    // Strip hash and query parameters (search, filters, fbclid, utm_*) for pure self-referencing canonical
    let clean = trimmed.split('#')[0];
    try {
      const parsed = new URL(clean, baseClean);
      parsed.search = '';
      clean = parsed.toString();
    } catch {
      clean = clean.split('?')[0];
    }

    const normalized = clean.replace(/\/+$/, '');
    return normalized === baseClean ? `${baseClean}/` : normalized;
  }

  /**
   * Helper to escape JSON string for safe inclusion in an inline <script type="application/ld+json"> tag
   * Prevents XSS via </script> injection
   */
  public serializeSchemaJson(schema: object | object[]): string {
    return JSON.stringify(schema)
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/&/g, '\\u0026');
  }

  /**
   * Resolve complete SEO state with hierarchical fallbacks:
   * Page/Product/Category Specific SEO -> Global Defaults
   */
  public resolveSeoState(params: {
    pageType: 'home' | 'shop' | 'about' | 'contact' | 'cart' | 'wishlist' | 'account' | 'product' | 'category' | 'other';
    globalConfig: SeoConfig;
    pageSeoItem?: PageSeoItem;
    product?: Product;
    category?: Category;
    customUrl?: string;
  }): ActiveSeoState {
    const { pageType, globalConfig, pageSeoItem, product, category, customUrl } = params;

    const brand = globalConfig.brandName || 'House of Mahi';
    const baseUrl = globalConfig.canonicalBaseUrl?.replace(/\/+$/, '') || (typeof window !== 'undefined' ? window.location.origin : 'https://houseofmahibd.com');
    const fullCurrentUrl = customUrl || (typeof window !== 'undefined' ? window.location.href : baseUrl);

    let title = globalConfig.homepageTitle || `${brand} | Premium Jewellery & Fashion Accessories`;
    let description = globalConfig.homepageDescription || 'Discover exquisite jewellery, bangles, and fashion accessories at House of Mahi Bangladesh. Explore curated collections for every festive occasion.';
    let keywords = globalConfig.siteKeywords || 'House of Mahi, jewellery Bangladesh, bangles, necklaces, earrings, rings, fashion accessories';
    let canonicalUrl = this.cleanCanonicalUrl(fullCurrentUrl, baseUrl);
    let robots = `${globalConfig.robotsIndex ? 'index' : 'noindex'}, ${globalConfig.robotsFollow ? 'follow' : 'nofollow'}`;
    let ogTitle = globalConfig.defaultOgTitle || title;
    let ogDescription = globalConfig.defaultOgDescription || description;
    let ogImage = globalConfig.defaultOgImage || 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&q=80&w=1200&h=630';
    let ogType = 'website';
    let twitterCard: 'summary' | 'summary_large_image' = globalConfig.defaultTwitterCard || 'summary_large_image';
    let twitterTitle = globalConfig.defaultTwitterTitle || ogTitle;
    let twitterDescription = globalConfig.defaultTwitterDescription || ogDescription;
    let twitterImage = globalConfig.defaultTwitterImage || ogImage;
    let schemaJson: object | object[] | undefined = undefined;

    // 1. PRODUCT PAGE RESOLUTION
    if (pageType === 'product' && product) {
      ogType = 'product';
      const prodSeo = product.seo || {};
      const prodSlug = prodSeo.slug || (product as any).seoSlug || (product as any).slug || product.id;
      
      // Clean path canonical URL (No hash)
      const rawCanonical = prodSeo.canonicalUrl || (product as any).canonicalUrl || `${baseUrl}/product/${encodeURIComponent(prodSlug)}`;
      canonicalUrl = this.cleanCanonicalUrl(rawCanonical, baseUrl);

      // Custom SEO Title override -> Direct Product seoTitle -> Default Auto Title
      title = prodSeo.seoTitle || (product as any).seoTitle || `${product.name} | ${brand}`;
      
      // Custom Meta Description override -> Direct Product metaDescription / seoDescription -> Short Description -> Generic Fallback
      description = prodSeo.metaDescription || (product as any).metaDescription || (product as any).seoDescription || 
        this.sanitizeMetaText(product.shortDescription || product.description, 160) || 
        `${product.name} crafted by ${brand}. Available at ৳${product.price.toLocaleString()}.`;

      // Keywords resolution
      const secKeywords = prodSeo.secondaryKeywords || (product as any).secondaryKeywords || [];
      const primKeyword = prodSeo.primaryKeyword || (product as any).primaryKeyword;
      keywords = [primKeyword, ...secKeywords, product.categoryLabel, ...(product.tags || [])].filter(Boolean).join(', ');
      
      // Robots directives resolution
      const pIndex = prodSeo.indexStatus || (product as any).indexStatus || (globalConfig.robotsIndex ? 'index' : 'noindex');
      const pFollow = prodSeo.followStatus || (product as any).followStatus || (globalConfig.robotsFollow ? 'follow' : 'nofollow');
      robots = `${pIndex}, ${pFollow}`;

      // OpenGraph overrides
      ogTitle = prodSeo.ogTitle || (product as any).ogTitle || title;
      ogDescription = prodSeo.ogDescription || (product as any).ogDescription || description;
      ogImage = prodSeo.ogImage || (product as any).ogImage || product.image || ogImage;

      // Twitter / X overrides
      twitterCard = prodSeo.twitterCard || (product as any).twitterCard || twitterCard;
      twitterTitle = prodSeo.twitterTitle || (product as any).twitterTitle || ogTitle;
      twitterDescription = prodSeo.twitterDescription || (product as any).twitterDescription || ogDescription;
      twitterImage = prodSeo.twitterImage || (product as any).twitterImage || ogImage;

      // Generate structured product schema + BreadcrumbList schema
      const prodSchema = this.generateProductSchema(product, globalConfig, canonicalUrl);
      const breadcrumbSchema = this.generateBreadcrumbSchema({
        baseUrl,
        items: [
          { name: 'Home', url: `${baseUrl}/` },
          { name: product.categoryLabel || product.category || 'Jewellery', url: `${baseUrl}/category/${encodeURIComponent(product.category || 'all')}` },
          { name: product.name, url: canonicalUrl }
        ]
      });

      if (Array.isArray(prodSchema)) {
        schemaJson = [...prodSchema, breadcrumbSchema];
      } else {
        schemaJson = [prodSchema, breadcrumbSchema];
      }
    }
    // 2. CATEGORY PAGE RESOLUTION
    else if (pageType === 'category' && category) {
      const catSlug = category.slug || category.id;
      const rawCatCanonical = category.canonicalUrl || `${baseUrl}/category/${encodeURIComponent(catSlug)}`;
      canonicalUrl = this.cleanCanonicalUrl(rawCatCanonical, baseUrl);
      
      title = category.seoTitle || `${category.name} Collection | ${brand}`;
      description = category.seoDescription || this.sanitizeMetaText(category.description, 160) || 
        `Explore our exclusive ${category.name} collection at ${brand}. Handcrafted jewellery with exceptional quality.`;
      
      const secCatKeywords = category.secondaryKeywords || [];
      keywords = [category.primaryKeyword, ...secCatKeywords, category.name, brand].filter(Boolean).join(', ');

      const cIndex = category.indexStatus || (globalConfig.robotsIndex ? 'index' : 'noindex');
      const cFollow = category.followStatus || (globalConfig.robotsFollow ? 'follow' : 'nofollow');
      robots = `${cIndex}, ${cFollow}`;

      ogTitle = category.ogTitle || title;
      ogDescription = category.ogDescription || description;
      ogImage = category.ogImage || category.image || ogImage;

      twitterTitle = ogTitle;
      twitterDescription = ogDescription;
      twitterImage = ogImage;

      const collSchema = this.generateCollectionSchema(category, globalConfig, canonicalUrl);
      const breadcrumbSchema = this.generateBreadcrumbSchema({
        baseUrl,
        items: [
          { name: 'Home', url: `${baseUrl}/` },
          { name: category.name, url: canonicalUrl }
        ]
      });

      schemaJson = [collSchema, breadcrumbSchema];
    }
    // 3. SPECIFIC STATIC PAGE RESOLUTION (Home, Shop, About, Contact, etc.)
    else if (pageSeoItem) {
      title = pageSeoItem.title || title;
      description = pageSeoItem.description || description;
      keywords = [pageSeoItem.primaryKeyword, ...(pageSeoItem.secondaryKeywords || [])].filter(Boolean).join(', ') || keywords;
      
      const pageCleanPath = pageSeoItem.path === '/' ? '' : (pageSeoItem.path.startsWith('/') ? pageSeoItem.path : `/${pageSeoItem.path}`);
      const rawPageCanonical = pageSeoItem.canonicalUrl || `${baseUrl}${pageCleanPath}`;
      canonicalUrl = this.cleanCanonicalUrl(rawPageCanonical, baseUrl);
      robots = `${pageSeoItem.indexStatus}, ${pageSeoItem.followStatus}`;

      ogTitle = pageSeoItem.ogTitle || title;
      ogDescription = pageSeoItem.ogDescription || description;
      ogImage = pageSeoItem.ogImage || ogImage;

      twitterCard = pageSeoItem.twitterCard || twitterCard;
      twitterTitle = pageSeoItem.twitterTitle || ogTitle;
      twitterDescription = pageSeoItem.twitterDescription || ogDescription;
      twitterImage = pageSeoItem.twitterImage || ogImage;

      if (pageType === 'home') {
        schemaJson = [
          this.generateOrganizationSchema(globalConfig),
          this.generateWebSiteSchema(globalConfig)
        ];
      } else if (pageType === 'shop' || pageType === 'about' || pageType === 'contact') {
        schemaJson = [
          this.generateBreadcrumbSchema({
            baseUrl,
            items: [
              { name: 'Home', url: `${baseUrl}/` },
              { name: pageSeoItem.pageName || title, url: canonicalUrl }
            ]
          })
        ];
      }
    }

    return {
      title,
      description,
      keywords,
      canonicalUrl,
      robots,
      ogTitle,
      ogDescription,
      ogImage,
      ogType,
      ogUrl: canonicalUrl,
      twitterCard,
      twitterTitle,
      twitterDescription,
      twitterImage,
      schemaJson
    };
  }

  /**
   * Apply meta tags and JSON-LD structured data directly to the HTML document <head>
   */
  public applyToDomHead(state: ActiveSeoState): void {
    if (typeof document === 'undefined') return;

    this.currentAppliedState = state;

    // 1. Update Document Title
    document.title = state.title;

    // 2. Helper for Updating or Creating <meta> tags
    const setMetaTag = (attrName: 'name' | 'property', attrValue: string, content: string) => {
      if (!content) return;
      let el = document.querySelector(`meta[${attrName}="${attrValue}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attrName, attrValue);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    // Standard SEO Tags
    setMetaTag('name', 'description', state.description);
    if (state.keywords) setMetaTag('name', 'keywords', state.keywords);
    setMetaTag('name', 'robots', state.robots);

    // Canonical Tag - update existing or create if absent without creating duplicates
    let canonicalEl = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (state.canonicalUrl) {
      if (!canonicalEl) {
        canonicalEl = document.createElement('link');
        canonicalEl.setAttribute('rel', 'canonical');
        canonicalEl.id = 'canonical-link';
        document.head.appendChild(canonicalEl);
      }
      canonicalEl.setAttribute('href', state.canonicalUrl);
    }

    // OpenGraph Tags
    setMetaTag('property', 'og:title', state.ogTitle);
    setMetaTag('property', 'og:description', state.ogDescription);
    setMetaTag('property', 'og:url', state.ogUrl);
    setMetaTag('property', 'og:type', state.ogType);
    if (state.ogImage) {
      setMetaTag('property', 'og:image', state.ogImage);
      setMetaTag('property', 'og:image:secure_url', state.ogImage);
    }

    // Twitter / X Card Tags
    setMetaTag('name', 'twitter:card', state.twitterCard);
    setMetaTag('name', 'twitter:title', state.twitterTitle);
    setMetaTag('name', 'twitter:description', state.twitterDescription);
    if (state.twitterImage) setMetaTag('name', 'twitter:image', state.twitterImage);

    // 3. JSON-LD Structured Data Injection without schema duplication
    // Remove any legacy initial schema scripts if present
    const legacyInitialScript = document.getElementById('houseofmahi-initial-schema');
    if (legacyInitialScript) {
      legacyInitialScript.remove();
    }

    let schemaScript = document.getElementById('houseofmahi-seo-schema') as HTMLScriptElement | null;

    if (state.schemaJson) {
      if (!schemaScript) {
        schemaScript = document.createElement('script');
        schemaScript.id = 'houseofmahi-seo-schema';
        schemaScript.type = 'application/ld+json';
        document.head.appendChild(schemaScript);
      }
      schemaScript.textContent = this.serializeSchemaJson(state.schemaJson);
    } else if (schemaScript) {
      // If no page-specific schema, keep clean
      schemaScript.remove();
    }
  }

  /**
   * Structured Data: BreadcrumbList Schema (Valid Google Rich Result)
   */
  public generateBreadcrumbSchema(params: {
    baseUrl: string;
    items: { name: string; url: string }[];
  }): object {
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: params.items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: item.url
      }))
    };
  }

  /**
   * Structured Data: Organization Schema
   */
  public generateOrganizationSchema(config: SeoConfig): object {
    const baseUrl = config.canonicalBaseUrl?.replace(/\/+$/, '') || 'https://houseofmahibd.com';
    const sameAs: string[] = [
      config.socialFacebookUrl || 'https://facebook.com/houseofmahi',
      config.socialInstagramUrl || 'https://instagram.com/houseofmahi',
      config.socialYoutubeUrl,
      config.socialTiktokUrl,
      config.socialPinterestUrl
    ].filter(Boolean) as string[];

    return {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': `${baseUrl}/#organization`,
      name: config.orgName || config.brandName || 'House of Mahi',
      legalName: config.orgLegalName || 'House of Mahi Bangladesh',
      url: config.orgUrl || baseUrl,
      logo: config.orgLogo || `${baseUrl}/icon-512.png`,
      email: config.orgEmail || 'mahimamahi456789@gmail.com',
      telephone: config.orgPhone || '+8801400031902',
      address: {
        '@type': 'PostalAddress',
        streetAddress: config.orgAddressStreet || 'E-76 Jalkuri Majpara, Jalkuri-1420',
        addressLocality: config.orgAddressLocality || 'Siddirganj, Narayanganj',
        addressRegion: config.orgAddressRegion || 'Dhaka Division',
        postalCode: config.orgPostalCode || '1420',
        addressCountry: config.orgCountry || 'BD'
      },
      sameAs,
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: config.orgPhone || '+8801400031902',
        contactType: 'Customer Service',
        areaServed: 'BD',
        availableLanguage: ['Bengali', 'English']
      }
    };
  }

  /**
   * Structured Data: WebSite Schema with SearchAction
   */
  public generateWebSiteSchema(config: SeoConfig): object {
    const baseUrl = config.canonicalBaseUrl?.replace(/\/+$/, '') || 'https://houseofmahibd.com';
    return {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${baseUrl}/#website`,
      url: baseUrl,
      name: config.brandName || 'House of Mahi',
      publisher: {
        '@id': `${baseUrl}/#organization`
      },
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${baseUrl}/shop?search={search_term_string}`
        },
        'query-input': 'required name=search_term_string'
      }
    };
  }

  /**
   * Structured Data: Real Product Schema (Strictly Authentic Data, No Fake Reviews)
   */
  public generateProductSchema(product: Product, config: SeoConfig, canonicalUrl: string): object | object[] {
    const prodSeo = product.seo || {};
    const baseUrl = config.canonicalBaseUrl?.replace(/\/+$/, '') || 'https://houseofmahibd.com';

    const schemaObj: any = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      '@id': `${canonicalUrl}#product`,
      name: product.name,
      description: this.sanitizeMetaText(prodSeo.metaDescription || product.description, 400),
      image: [product.image, ...(product.galleryImages || [])].filter(Boolean),
      sku: product.sku || product.id,
      brand: {
        '@type': 'Brand',
        name: prodSeo.brand || config.brandName || 'House of Mahi'
      },
      category: product.categoryLabel || product.category,
      offers: {
        '@type': 'Offer',
        url: canonicalUrl,
        priceCurrency: 'BDT',
        price: product.price,
        priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        itemCondition: `https://schema.org/${prodSeo.condition || 'NewCondition'}`,
        availability: product.inStock && (product.stockQuantity ?? 1) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        seller: {
          '@type': 'Organization',
          name: config.brandName || 'House of Mahi',
          url: baseUrl
        },
        shippingDetails: {
          '@type': 'OfferShippingDetails',
          shippingRate: {
            '@type': 'MonetaryAmount',
            value: '80',
            currency: 'BDT'
          },
          shippingDestination: {
            '@type': 'DefinedRegion',
            addressCountry: 'BD'
          },
          deliveryTime: {
            '@type': 'ShippingDeliveryTime',
            handlingTime: {
              '@type': 'QuantitativeValue',
              minValue: 0,
              maxValue: 1,
              unitCode: 'd'
            },
            transitTime: {
              '@type': 'QuantitativeValue',
              minValue: 1,
              maxValue: 4,
              unitCode: 'd'
            }
          }
        },
        hasMerchantReturnPolicy: {
          '@type': 'MerchantReturnPolicy',
          applicableCountry: 'BD',
          returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
          merchantReturnDays: 7,
          returnMethod: 'https://schema.org/ReturnByMail',
          returnFees: 'https://schema.org/FreeReturn'
        }
      }
    };

    // Authentic AggregateRating: Only add if there are verified real reviews and positive rating
    if (product.rating > 0 && product.reviewsCount > 0) {
      schemaObj.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: Number(product.rating.toFixed(1)),
        reviewCount: product.reviewsCount,
        bestRating: 5,
        worstRating: 1
      };
    }

    // Authentic Individual Reviews: Include if real approved reviews array is populated
    if (Array.isArray(product.reviews) && product.reviews.length > 0) {
      const validReviews = product.reviews
        .filter(r => r.status === 'approved' && r.comment && r.rating)
        .slice(0, 5)
        .map(r => ({
          '@type': 'Review',
          author: {
            '@type': 'Person',
            name: r.userName || 'Verified Buyer'
          },
          datePublished: r.date || new Date().toISOString().split('T')[0],
          reviewBody: r.comment,
          reviewRating: {
            '@type': 'Rating',
            ratingValue: r.rating,
            bestRating: 5,
            worstRating: 1
          }
        }));

      if (validReviews.length > 0) {
        schemaObj.review = validReviews;
      }
    }

    // Include GTIN or MPN only if actually defined on the product
    if (prodSeo.gtin || (product as any).gtin) {
      schemaObj.gtin = prodSeo.gtin || (product as any).gtin;
    }
    if (prodSeo.mpn || (product as any).mpn) {
      schemaObj.mpn = prodSeo.mpn || (product as any).mpn;
    }

    // FAQs structured data attached as FAQPage if present
    const productFaqs = prodSeo.faqs || (product as any).faqs || [];
    if (productFaqs.length > 0) {
      const faqSchema = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        '@id': `${canonicalUrl}#faq`,
        mainEntity: productFaqs.map((faq: { question: string; answer: string }) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer
          }
        }))
      };

      return [schemaObj, faqSchema];
    }

    return schemaObj;
  }

  /**
   * Structured Data: CollectionPage Schema for Categories
   */
  public generateCollectionSchema(category: Category, config: SeoConfig, canonicalUrl: string): object {
    return {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      '@id': `${canonicalUrl}#collection`,
      name: category.seoTitle || `${category.name} Collection`,
      description: this.sanitizeMetaText(category.seoDescription || category.description, 300),
      url: canonicalUrl,
      about: {
        '@type': 'Thing',
        name: category.name
      }
    };
  }

  /**
   * Deterministic Real-time SEO Scoring & Issue Detection Engine
   */
  public auditEntireStore(params: {
    globalConfig: SeoConfig;
    pages: PageSeoItem[];
    products: Product[];
    categories: Category[];
  }): SeoAuditSummary {
    const { globalConfig, pages, products, categories } = params;
    const issues: SeoAuditIssue[] = [];

    let missingTitles = 0;
    let missingDescriptions = 0;
    let missingOgImages = 0;
    let missingImageAlts = 0;

    // 1. Global Checks
    if (!globalConfig.brandName?.trim()) {
      issues.push({
        id: 'global-missing-brand',
        type: 'error',
        category: 'technical',
        title: 'Missing Brand / Store Name',
        message: 'Global brand name is required for clean search snippet attribution.',
        targetType: 'global',
        actionText: 'Configure Brand Name'
      });
    }

    if (!globalConfig.homepageTitle || globalConfig.homepageTitle.length < 15) {
      issues.push({
        id: 'global-short-title',
        type: 'warning',
        category: 'content',
        title: 'Homepage Title is Too Short or Missing',
        message: 'A title between 30 and 60 characters with your core keywords provides the highest click-through rate.',
        targetType: 'global',
        actionText: 'Update Homepage Title'
      });
      missingTitles++;
    }

    if (!globalConfig.homepageDescription || globalConfig.homepageDescription.length < 50) {
      issues.push({
        id: 'global-short-desc',
        type: 'warning',
        category: 'content',
        title: 'Homepage Meta Description is Too Short',
        message: 'Recommended length is 120-160 characters describing your brand identity and offers.',
        targetType: 'global',
        actionText: 'Expand Homepage Description'
      });
      missingDescriptions++;
    }

    if (!globalConfig.defaultOgImage) {
      issues.push({
        id: 'global-missing-og',
        type: 'warning',
        category: 'social',
        title: 'Default Open Graph / Social Sharing Image Missing',
        message: 'Social networks like Facebook, WhatsApp and Twitter will show a blank thumbnail without this.',
        targetType: 'global',
        actionText: 'Upload OG Image'
      });
      missingOgImages++;
    }

    // 2. Static Pages Checks
    pages.forEach((p) => {
      if (!p.title || p.title.trim().length === 0) {
        missingTitles++;
        issues.push({
          id: `page-missing-title-${p.id}`,
          type: 'error',
          category: 'technical',
          title: `Missing SEO Title on "${p.pageName}"`,
          message: `The ${p.pageName} page needs a unique title for search engines.`,
          targetType: 'page',
          targetId: p.id,
          targetName: p.pageName,
          actionText: 'Edit Page Title'
        });
      }

      if (!p.description || p.description.trim().length === 0) {
        missingDescriptions++;
        issues.push({
          id: `page-missing-desc-${p.id}`,
          type: 'warning',
          category: 'content',
          title: `Missing Meta Description on "${p.pageName}"`,
          message: `Add a description to guide search engines on what ${p.pageName} offers.`,
          targetType: 'page',
          targetId: p.id,
          targetName: p.pageName,
          actionText: 'Add Description'
        });
      }
    });

    // 3. Products Checks
    products.forEach((prod) => {
      const prodSeo = prod.seo || {};

      // Title check
      if (!prodSeo.seoTitle && !prod.name) {
        missingTitles++;
        issues.push({
          id: `prod-missing-title-${prod.id}`,
          type: 'error',
          category: 'technical',
          title: `Product Title Missing (${prod.name || prod.id})`,
          message: 'Product must have a defined SEO title for indexability.',
          targetType: 'product',
          targetId: prod.id,
          targetName: prod.name,
          actionText: 'Set Title'
        });
      }

      // Meta Description check
      if (!prodSeo.metaDescription && (!prod.shortDescription || prod.shortDescription.length < 20)) {
        missingDescriptions++;
        issues.push({
          id: `prod-missing-desc-${prod.id}`,
          type: 'warning',
          category: 'content',
          title: `Product Description Weak (${prod.name})`,
          message: 'Provide at least 60-160 characters describing materials, finish, and style.',
          targetType: 'product',
          targetId: prod.id,
          targetName: prod.name,
          actionText: 'Add Product SEO Desc'
        });
      }

      // Image ALT Text Check
      const hasAlt = prod.imageAlt?.trim() || prodSeo.imageSeoList?.some((img) => img.altText?.trim());
      if (!hasAlt && prod.image) {
        missingImageAlts++;
        issues.push({
          id: `prod-missing-alt-${prod.id}`,
          type: 'notice',
          category: 'images',
          title: `Missing Image ALT Text on "${prod.name}"`,
          message: 'Descriptive alt text helps Google Image Search index your jewelry pieces.',
          targetType: 'product',
          targetId: prod.id,
          targetName: prod.name,
          actionText: 'Add Image Alt'
        });
      }

      // Primary Keyword check
      if (!prodSeo.primaryKeyword) {
        issues.push({
          id: `prod-missing-kw-${prod.id}`,
          type: 'notice',
          category: 'content',
          title: `No Target Keyword Assigned (${prod.name})`,
          message: 'Define a primary target keyword (e.g. "Gold Plated Bridal Necklace") to track density.',
          targetType: 'product',
          targetId: prod.id,
          targetName: prod.name,
          actionText: 'Assign Keyword'
        });
      }
    });

    // 4. Categories Checks
    categories.forEach((cat) => {
      if (!cat.seoTitle && !cat.name) {
        missingTitles++;
        issues.push({
          id: `cat-missing-title-${cat.id}`,
          type: 'warning',
          category: 'technical',
          title: `Category Missing SEO Title (${cat.name})`,
          message: `Optimize category title for collection keywords.`,
          targetType: 'category',
          targetId: cat.id,
          targetName: cat.name,
          actionText: 'Set Category Title'
        });
      }
      if (!cat.seoDescription && !cat.description) {
        missingDescriptions++;
      }
    });

    const totalIndexablePages = 1 + pages.length + products.length + categories.length;
    const errorsCount = issues.filter((i) => i.type === 'error').length;
    const warningsCount = issues.filter((i) => i.type === 'warning').length;

    // Calculate score out of 100 based on penalties
    let calculatedScore = 100 - (errorsCount * 12 + warningsCount * 4 + missingImageAlts * 2);
    calculatedScore = Math.max(10, Math.min(100, calculatedScore));

    const optimizedCount = Math.max(0, totalIndexablePages - (errorsCount + warningsCount));

    return {
      overallScore: calculatedScore,
      totalIndexablePages,
      optimizedCount,
      warningsCount,
      errorsCount,
      missingTitlesCount: missingTitles,
      missingDescriptionsCount: missingDescriptions,
      missingOgImagesCount: missingOgImages,
      missingImageAltCount: missingImageAlts,
      issues
    };
  }

  /**
   * Calculate single item deterministic SEO Score
   */
  public calculateSingleItemScore(item: {
    title?: string;
    description?: string;
    primaryKeyword?: string;
    canonicalUrl?: string;
    ogImage?: string;
    imageAlt?: string;
  }): { score: number; checklist: { label: string; passed: boolean; tip: string }[] } {
    const checklist: { label: string; passed: boolean; tip: string }[] = [];

    // Title Length Check (30 - 65 chars)
    const titleLen = item.title?.trim().length || 0;
    const titlePassed = titleLen >= 30 && titleLen <= 65;
    checklist.push({
      label: 'SEO Title Length (30-65 chars)',
      passed: titlePassed,
      tip: `Current length: ${titleLen} characters. Search engines typically display the first 50-60 characters.`
    });

    // Description Length Check (100 - 165 chars)
    const descLen = item.description?.trim().length || 0;
    const descPassed = descLen >= 100 && descLen <= 165;
    checklist.push({
      label: 'Meta Description Length (100-165 chars)',
      passed: descPassed,
      tip: `Current length: ${descLen} characters. Aim for concise, compelling copy with key incentives.`
    });

    // Target Keyword Existence
    const kw = item.primaryKeyword?.trim().toLowerCase() || '';
    const kwPassed = Boolean(kw.length >= 3);
    checklist.push({
      label: 'Primary Keyword Defined',
      passed: kwPassed,
      tip: kwPassed ? `Targeting: "${kw}"` : 'Define a focused target keyword for content guidance.'
    });

    // Keyword in Title
    const titleHasKw = Boolean(kw && item.title?.toLowerCase().includes(kw));
    checklist.push({
      label: 'Primary Keyword in Title',
      passed: titleHasKw,
      tip: titleHasKw ? 'Primary keyword is placed in the title.' : 'Include your target keyword near the beginning of the title.'
    });

    // Keyword in Description
    const descHasKw = Boolean(kw && item.description?.toLowerCase().includes(kw));
    checklist.push({
      label: 'Primary Keyword in Description',
      passed: descHasKw,
      tip: descHasKw ? 'Keyword is featured in description snippet.' : 'Naturally include the keyword once in the meta description.'
    });

    // OpenGraph Image Available
    const ogPassed = Boolean(item.ogImage && item.ogImage.length > 5);
    checklist.push({
      label: 'Social Sharing Image (OG)',
      passed: ogPassed,
      tip: ogPassed ? 'Preview image configured for social feeds.' : 'Add an image (1200x630px recommended) for Facebook & WhatsApp cards.'
    });

    // Image ALT Text
    const altPassed = Boolean(item.imageAlt && item.imageAlt.trim().length > 3);
    checklist.push({
      label: 'Descriptive Image ALT Text',
      passed: altPassed,
      tip: altPassed ? 'ALT text configured for image discovery.' : 'Provide alt text describing product color, material and pattern.'
    });

    const passedCount = checklist.filter((c) => c.passed).length;
    const score = Math.round((passedCount / checklist.length) * 100);

    return { score, checklist };
  }

  /**
   * Generate Live XML Sitemap with Clean Canonical URLs (No Hash)
   */
  public generateXmlSitemap(config: SeoConfig, pages: PageSeoItem[], products: Product[], categories: Category[]): string {
    const baseUrl = config.canonicalBaseUrl?.replace(/\/+$/, '') || 'https://houseofmahibd.com';
    const now = new Date().toISOString().split('T')[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

    // 1. Homepage
    xml += `  <url>\n    <loc>${baseUrl}/</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;

    // 2. Static Pages
    pages.filter((p) => p.indexStatus === 'index').forEach((p) => {
      const cleanPath = p.path.startsWith('http') ? p.path : `${baseUrl}${p.path.startsWith('/') ? '' : '/'}${p.path}`;
      const loc = this.cleanCanonicalUrl(cleanPath, baseUrl);
      xml += `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
    });

    // 3. Category Pages (Clean Path URLs)
    categories.filter((c) => (c.indexStatus || 'index') === 'index').forEach((c) => {
      const catSlug = c.slug || c.id;
      const loc = `${baseUrl}/category/${encodeURIComponent(catSlug)}`;
      xml += `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.85</priority>\n  </url>\n`;
    });

    // 4. Product Pages (Clean Path URLs)
    products.filter((p) => (p.seo?.indexStatus || (p as any).indexStatus || 'index') === 'index').forEach((p) => {
      const prodSlug = p.seo?.slug || (p as any).seoSlug || (p as any).slug || p.id;
      const loc = `${baseUrl}/product/${encodeURIComponent(prodSlug)}`;
      xml += `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n`;
      if (p.image) {
        const altTitle = (p.imageAlt || p.seo?.imageSeoList?.[0]?.altText || p.name || 'Jewelry')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        const safeImgUrl = p.image.replace(/&/g, '&amp;');
        xml += `    <image:image>\n      <image:loc>${safeImgUrl}</image:loc>\n      <image:title>${altTitle}</image:title>\n    </image:image>\n`;
      }
      xml += `  </url>\n`;
    });

    xml += `</urlset>`;
    return xml;
  }

  /**
   * Generate Safe Robots.txt Content (Strictly adheres to crawl standards)
   */
  public generateRobotsTxt(config: SeoConfig): string {
    const baseUrl = config.canonicalBaseUrl?.replace(/\/+$/, '') || 'https://houseofmahibd.com';

    if (!config.allowSearchEngines || !config.robotsIndex) {
      return `# Robots.txt - Search Engine Crawling Disabled by Admin\nUser-agent: *\nDisallow: /\n`;
    }

    if (config.customRobotsTxt?.trim()) {
      return config.customRobotsTxt.trim();
    }

    return `# House of Mahi Production Robots Directives
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
  }
}

export const seoService = new SeoService();
