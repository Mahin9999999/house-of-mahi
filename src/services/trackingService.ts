import { MarketingPixelsConfig, Product, CartItem, Order } from '../types';

// Declare global third-party tracking interfaces on window
declare global {
  interface Window {
    fbq?: any;
    _fbq?: any;
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
    google_tag_manager?: any;
    ttq?: any;
    clarity?: any;
  }
}

export interface PlatformHealthStatus {
  id: string;
  name: string;
  category: 'social' | 'analytics' | 'tag_manager' | 'ads' | 'ux' | 'custom';
  enabled: boolean;
  configuredId: string;
  status: 'active' | 'configured' | 'disabled' | 'error';
  statusLabel: string;
  statusColor: string;
  details: string;
  // Specific distinct metrics - no faking
  isConfigured: boolean;
  scriptInjected: boolean;
  runtimeDetected: boolean;
  platformVerifiedNote: string;
}

export interface TrackingEventPayload {
  eventName: string;
  timestamp: string;
  platforms: string[];
  data: Record<string, any>;
}

class TrackingService {
  private config: MarketingPixelsConfig | null = null;
  private injectedScripts: Set<string> = new Set();
  private firedPurchases: Set<string> = new Set();
  private lastPageView: { url: string; timestamp: number } = { url: '', timestamp: 0 };
  private eventLog: TrackingEventPayload[] = [];
  private listeners: ((event: TrackingEventPayload) => void)[] = [];

  constructor() {
    // Load previously deduplicated purchase IDs from sessionStorage if available
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem('hom_fired_purchases');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            parsed.forEach((id) => this.firedPurchases.add(id));
          }
        }
      } catch (e) {
        // ignore storage errors
      }
    }
  }

  /**
   * Helper: Get cookie value safely from document.cookie
   */
  private getCookie(name: string): string | undefined {
    if (typeof document === 'undefined') return undefined;
    const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
    return match ? decodeURIComponent(match[3]) : undefined;
  }

  /**
   * Helper: Securely dispatch authoritative purchase event to server-side endpoint
   * Sends exact eventId for Meta CAPI deduplication while passing order details and config
   */
  private async dispatchServerPurchase(orderId: string, eventId: string, order?: Order) {
    try {
      const fbp = this.getCookie('_fbp');
      const fbc = this.getCookie('_fbc');
      const gaCookie = this.getCookie('_ga');
      const clientId = gaCookie ? gaCookie.replace(/^GA1\.\d+\./, '') : undefined;

      await fetch('/api/tracking/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          orderData: order,
          eventId,
          fbp,
          fbc,
          clientId,
          config: this.config,
          clientSourceUrl: typeof window !== 'undefined' ? window.location.href : undefined,
          testEventCode: this.config?.metaTestEventCode || undefined,
          sendGa4Fallback: false // Client GA4 already fired authoritative purchase
        })
      });
    } catch (err) {
      console.warn('[TrackingService] Server purchase dispatch notification error:', err);
    }
  }

  /**
   * Sync active configuration and bootstrap / refresh all tracking scripts
   */
  public syncConfig(config: MarketingPixelsConfig) {
    this.config = config;
    if (typeof window === 'undefined') return;

    // 1. Meta / Facebook Pixel (valid Meta pixel IDs are numeric, 10+ digits)
    const metaId = (config.metaPixelId || '').trim();
    if (config.metaPixelEnabled && /^\d{10,20}$/.test(metaId)) {
      this.initMetaPixel(metaId, config.metaAdvancedMatching, config.metaTestEventCode);
    }

    // 2. Google Analytics 4 (valid GA4 measurement IDs look like G-XXXXXXXXXX)
    const ga4Id = (config.ga4MeasurementId || '').trim();
    if (config.ga4Enabled && /^G-[A-Z0-9]{6,12}$/.test(ga4Id)) {
      this.initGA4(ga4Id, config.ga4Currency || 'BDT', config.ga4DebugMode);
    }

    // 3. Google Tag Manager (valid container IDs look like GTM-XXXXXXX)
    const gtmId = (config.gtmContainerId || '').trim();
    if (config.gtmEnabled && /^GTM-[A-Z0-9]{4,10}$/.test(gtmId)) {
      this.initGTM(gtmId);
    }

    // 4. Google Ads Conversion (valid conversion IDs look like AW-XXXXXXXXXX)
    const gAdsId = (config.googleAdsConversionId || '').trim();
    if (config.googleAdsEnabled && /^AW-[0-9]{6,15}$/.test(gAdsId)) {
      this.initGoogleAds(gAdsId);
    }

    // 5. TikTok Pixel (alphanumeric, 10+ chars)
    const ttId = (config.tiktokPixelId || '').trim();
    if (config.tiktokEnabled && /^[A-Z0-9]{10,25}$/i.test(ttId)) {
      this.initTikTokPixel(ttId);
    }

    // 6. Microsoft Clarity
    const clarityId = (config.clarityProjectId || '').trim();
    if (config.clarityEnabled && clarityId.length >= 3) {
      this.initClarity(clarityId);
    }

    // 7. Custom Scripts
    if (config.customScriptEnabled) {
      if (config.customHeaderScript) {
        this.injectCustomScript('custom-header-script', config.customHeaderScript, 'head');
      }
      if (config.customBodyScript) {
        this.injectCustomScript('custom-body-script', config.customBodyScript, 'body');
      }
    }
  }

  // ==========================================
  // SCRIPT INJECTION LOGIC (ZERO-DUPLICATION)
  // ==========================================

  private initMetaPixel(pixelId: string, advancedMatching?: boolean, testEventCode?: string) {
    const scriptId = `meta-pixel-${pixelId}`;
    if (!this.injectedScripts.has(scriptId)) {
      /* eslint-disable */
      (function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
        if (f.fbq) return;
        n = f.fbq = function () {
          n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
        };
        if (!f._fbq) f._fbq = n;
        n.push = n;
        n.loaded = !0;
        n.version = '2.0';
        n.queue = [];
        t = b.createElement(e);
        t.async = !0;
        t.id = scriptId;
        t.src = v;
        s = b.getElementsByTagName(e)[0];
        if (s && s.parentNode) {
          s.parentNode.insertBefore(t, s);
        } else {
          document.head.appendChild(t);
        }
      })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
      /* eslint-enable */
      this.injectedScripts.add(scriptId);
    }

    if (window.fbq) {
      window.fbq('init', pixelId, advancedMatching ? { em: 'auto', ph: 'auto' } : undefined);
      if (testEventCode && testEventCode.trim()) {
        window.fbq('set', 'test_event_code', testEventCode.trim());
      }
    }
  }

  private initGA4(measurementId: string, currency: string, debugMode?: boolean) {
    window.dataLayer = window.dataLayer || [];
    if (!window.gtag) {
      window.gtag = function () {
        window.dataLayer?.push(arguments);
      };
      window.gtag('js', new Date());
    }

    const scriptId = `ga4-gtag-${measurementId}`;
    if (!this.injectedScripts.has(scriptId) && !document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
      document.head.appendChild(script);
      this.injectedScripts.add(scriptId);
    }

    window.gtag('config', measurementId, {
      currency: currency || 'BDT',
      debug_mode: Boolean(debugMode),
      send_page_view: false // Managed manually for SPA route changes
    });
  }

  private initGTM(containerId: string) {
    window.dataLayer = window.dataLayer || [];
    const scriptId = `gtm-script-${containerId}`;
    if (!this.injectedScripts.has(scriptId) && !document.getElementById(scriptId)) {
      /* eslint-disable */
      (function (w: any, d: any, s: any, l: any, i: any) {
        w[l] = w[l] || [];
        w[l].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
        const f = d.getElementsByTagName(s)[0];
        const j = d.createElement(s);
        const dl = l != 'dataLayer' ? '&l=' + l : '';
        j.async = true;
        j.id = scriptId;
        j.src = 'https://www.googletagmanager.com/gtm.js?id=' + i + dl;
        if (f && f.parentNode) {
          f.parentNode.insertBefore(j, f);
        } else {
          d.head.appendChild(j);
        }
      })(window, document, 'script', 'dataLayer', containerId);
      /* eslint-enable */
      this.injectedScripts.add(scriptId);
    }
  }

  private initGoogleAds(conversionId: string) {
    window.dataLayer = window.dataLayer || [];
    if (!window.gtag) {
      window.gtag = function () {
        window.dataLayer?.push(arguments);
      };
      window.gtag('js', new Date());
    }

    const scriptId = `google-ads-gtag-${conversionId}`;
    if (!this.injectedScripts.has(scriptId) && !document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${conversionId}`;
      document.head.appendChild(script);
      this.injectedScripts.add(scriptId);
    }

    window.gtag('config', conversionId);
  }

  private initTikTokPixel(pixelId: string) {
    const scriptId = `tiktok-pixel-${pixelId}`;
    if (!this.injectedScripts.has(scriptId)) {
      /* eslint-disable */
      (function (w: any, d: any, t: any) {
        w.TiktokAnalyticsObject = t;
        const ttq = (w[t] = w[t] || []);
        ttq.methods = [
          'page',
          'track',
          'identify',
          'instances',
          'debug',
          'on',
          'off',
          'once',
          'ready',
          'alias',
          'group',
          'enableCookie',
          'disableCookie'
        ];
        ttq.setAndDefer = function (t: any, e: any) {
          t[e] = function () {
            t.push([e].concat(Array.prototype.slice.call(arguments, 0)));
          };
        };
        for (let i = 0; i < ttq.methods.length; i++) {
          ttq.setAndDefer(ttq, ttq.methods[i]);
        }
        ttq.instance = function (t: any) {
          const e = ttq._i[t] || [];
          for (let n = 0; n < ttq.methods.length; n++) {
            ttq.setAndDefer(e, ttq.methods[n]);
          }
          return e;
        };
        ttq.load = function (e: any, n: any) {
          const i = 'https://analytics.tiktok.com/i18n/pixel/events.js';
          ttq._i = ttq._i || {};
          ttq._i[e] = [];
          ttq._i[e]._u = i;
          ttq._t = ttq._t || {};
          ttq._t[e] = +new Date();
          ttq._o = ttq._o || {};
          ttq._o[e] = n || {};
          const o = d.createElement('script');
          o.type = 'text/javascript';
          o.async = !0;
          o.id = scriptId;
          o.src = i + '?sdkid=' + e + '&lib=' + t;
          const a = d.getElementsByTagName('script')[0];
          if (a && a.parentNode) {
            a.parentNode.insertBefore(o, a);
          } else {
            d.head.appendChild(o);
          }
        };
        ttq.load(pixelId);
        ttq.page();
      })(window, document, 'ttq');
      /* eslint-enable */
      this.injectedScripts.add(scriptId);
    }
  }

  private initClarity(projectId: string) {
    const scriptId = `clarity-script-${projectId}`;
    if (!this.injectedScripts.has(scriptId) && !document.getElementById(scriptId)) {
      /* eslint-disable */
      (function (c: any, l: any, a: any, r: any, i: any, t?: any, y?: any) {
        c[a] =
          c[a] ||
          function () {
            (c[a].q = c[a].q || []).push(arguments);
          };
        t = l.createElement(r);
        t.async = 1;
        t.id = scriptId;
        t.src = 'https://www.clarity.ms/tag/' + i;
        y = l.getElementsByTagName(r)[0];
        if (y && y.parentNode) {
          y.parentNode.insertBefore(t, y);
        } else {
          l.head.appendChild(t);
        }
      })(window, document, 'clarity', 'script', projectId);
      /* eslint-enable */
      this.injectedScripts.add(scriptId);
    }
  }

  private injectCustomScript(id: string, scriptContent: string, target: 'head' | 'body') {
    if (this.injectedScripts.has(id)) return;
    try {
      const container = target === 'head' ? document.head : document.body;
      const scriptEl = document.createElement('script');
      scriptEl.id = id;
      scriptEl.type = 'text/javascript';
      scriptEl.text = scriptContent;
      container.appendChild(scriptEl);
      this.injectedScripts.add(id);
    } catch (err) {
      console.warn(`Failed to inject custom ${target} script:`, err);
    }
  }

  // ==========================================
  // CENTRAL EVENT DISPATCHER & LOGGER
  // ==========================================

  private logEvent(eventName: string, data: Record<string, any>, platforms: string[]) {
    const entry: TrackingEventPayload = {
      eventName,
      timestamp: new Date().toLocaleTimeString(),
      platforms,
      data
    };
    this.eventLog.unshift(entry);
    if (this.eventLog.length > 50) this.eventLog.pop();

    if (this.config?.testModeEnabled) {
      console.group(`📡 [Marketing & Analytics Event] ${eventName}`);
      console.log('Platforms:', platforms.join(', '));
      console.log('Payload:', data);
      console.groupEnd();
    }

    this.listeners.forEach((listener) => {
      try {
        listener(entry);
      } catch (e) {
        // ignore listener errors
      }
    });
  }

  public subscribeToEvents(listener: (event: TrackingEventPayload) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public getRecentLogs(): TrackingEventPayload[] {
    return [...this.eventLog];
  }

  // ==========================================
  // E-COMMERCE STANDARD EVENTS
  // ==========================================

  /**
   * 1. PageView
   */
  public trackPageView(pageUrl?: string, pageTitle?: string) {
    const url = pageUrl || (typeof window !== 'undefined' ? window.location.href : '');
    const title = pageTitle || (typeof document !== 'undefined' ? document.title : '');
    const now = Date.now();

    // SPA Duplicate PageView debounce within 1 second for same URL
    if (this.lastPageView.url === url && now - this.lastPageView.timestamp < 1000) {
      return;
    }
    this.lastPageView = { url, timestamp: now };

    const activePlatforms: string[] = [];

    // Meta Pixel
    if (this.config?.metaPixelEnabled && window.fbq) {
      window.fbq('track', 'PageView');
      activePlatforms.push('Meta Pixel');
    }

    // GA4
    if (this.config?.ga4Enabled && window.gtag && this.config.ga4MeasurementId) {
      window.gtag('event', 'page_view', {
        page_location: url,
        page_title: title,
        page_path: typeof window !== 'undefined' ? window.location.pathname : '/'
      });
      activePlatforms.push('GA4');
    }

    // GTM
    if (this.config?.gtmEnabled && window.dataLayer) {
      window.dataLayer.push({
        event: 'page_view',
        page_location: url,
        page_title: title
      });
      activePlatforms.push('GTM');
    }

    // TikTok
    if (this.config?.tiktokEnabled && window.ttq) {
      window.ttq.page();
      activePlatforms.push('TikTok Pixel');
    }

    this.logEvent('page_view', { url, title }, activePlatforms);
  }

  /**
   * 2. ViewContent / view_item
   */
  public trackViewItem(product: Product) {
    if (!product) return;
    const activePlatforms: string[] = [];
    const currency = this.config?.ga4Currency || 'BDT';

    const itemData = {
      item_id: product.id,
      item_name: product.name,
      price: product.price,
      item_category: product.categoryLabel || product.category,
      currency: currency
    };

    // Meta Pixel: ViewContent
    if (this.config?.metaPixelEnabled && window.fbq) {
      window.fbq('track', 'ViewContent', {
        content_ids: [product.id],
        content_name: product.name,
        content_category: product.categoryLabel || product.category,
        content_type: 'product',
        value: product.price,
        currency: currency
      });
      activePlatforms.push('Meta Pixel');
    }

    // GA4: view_item
    if (this.config?.ga4Enabled && window.gtag && this.config.ga4MeasurementId) {
      window.gtag('event', 'view_item', {
        currency: currency,
        value: product.price,
        items: [itemData]
      });
      activePlatforms.push('GA4');
    }

    // GTM: view_item
    if (this.config?.gtmEnabled && window.dataLayer) {
      window.dataLayer.push({
        event: 'view_item',
        ecommerce: {
          currency: currency,
          value: product.price,
          items: [itemData]
        }
      });
      activePlatforms.push('GTM');
    }

    // TikTok: ViewContent
    if (this.config?.tiktokEnabled && window.ttq) {
      window.ttq.track('ViewContent', {
        content_id: product.id,
        content_type: 'product',
        content_name: product.name,
        price: product.price,
        value: product.price,
        currency: currency
      });
      activePlatforms.push('TikTok Pixel');
    }

    this.logEvent('view_item', { productId: product.id, name: product.name, price: product.price, currency }, activePlatforms);
  }

  /**
   * 3. Search
   */
  public trackSearch(searchQuery: string) {
    if (!searchQuery || !searchQuery.trim()) return;
    const query = searchQuery.trim();
    const activePlatforms: string[] = [];

    // Meta Pixel: Search
    if (this.config?.metaPixelEnabled && window.fbq) {
      window.fbq('track', 'Search', {
        search_string: query
      });
      activePlatforms.push('Meta Pixel');
    }

    // GA4: search
    if (this.config?.ga4Enabled && window.gtag && this.config.ga4MeasurementId) {
      window.gtag('event', 'search', {
        search_term: query
      });
      activePlatforms.push('GA4');
    }

    // GTM: search
    if (this.config?.gtmEnabled && window.dataLayer) {
      window.dataLayer.push({
        event: 'search',
        search_term: query
      });
      activePlatforms.push('GTM');
    }

    // TikTok: Search
    if (this.config?.tiktokEnabled && window.ttq) {
      window.ttq.track('Search', {
        query: query
      });
      activePlatforms.push('TikTok Pixel');
    }

    this.logEvent('search', { query }, activePlatforms);
  }

  /**
   * 4. AddToCart
   */
  public trackAddToCart(product: Product, quantity: number = 1, selectedFinish?: string, selectedSize?: string) {
    if (!product) return;
    const activePlatforms: string[] = [];
    const currency = this.config?.ga4Currency || 'BDT';
    const totalValue = product.price * quantity;

    const itemData = {
      item_id: product.id,
      item_name: product.name,
      price: product.price,
      quantity: quantity,
      item_category: product.categoryLabel || product.category,
      item_variant: [selectedFinish, selectedSize].filter(Boolean).join(' / ') || undefined
    };

    // Meta Pixel: AddToCart
    if (this.config?.metaPixelEnabled && window.fbq) {
      window.fbq('track', 'AddToCart', {
        content_ids: [product.id],
        content_name: product.name,
        content_type: 'product',
        value: totalValue,
        currency: currency,
        quantity: quantity
      });
      activePlatforms.push('Meta Pixel');
    }

    // GA4: add_to_cart
    if (this.config?.ga4Enabled && window.gtag && this.config.ga4MeasurementId) {
      window.gtag('event', 'add_to_cart', {
        currency: currency,
        value: totalValue,
        items: [itemData]
      });
      activePlatforms.push('GA4');
    }

    // GTM: add_to_cart
    if (this.config?.gtmEnabled && window.dataLayer) {
      window.dataLayer.push({
        event: 'add_to_cart',
        ecommerce: {
          currency: currency,
          value: totalValue,
          items: [itemData]
        }
      });
      activePlatforms.push('GTM');
    }

    // TikTok: AddToCart
    if (this.config?.tiktokEnabled && window.ttq) {
      window.ttq.track('AddToCart', {
        content_id: product.id,
        content_type: 'product',
        content_name: product.name,
        quantity: quantity,
        price: product.price,
        value: totalValue,
        currency: currency
      });
      activePlatforms.push('TikTok Pixel');
    }

    this.logEvent('add_to_cart', { productId: product.id, name: product.name, quantity, totalValue, currency }, activePlatforms);
  }

  /**
   * 5. ViewCart
   */
  public trackViewCart(cartItems: CartItem[], subtotal: number) {
    const activePlatforms: string[] = [];
    const currency = this.config?.ga4Currency || 'BDT';

    const items = cartItems.map((item) => ({
      item_id: item.product.id,
      item_name: item.product.name,
      price: item.product.price,
      quantity: item.quantity,
      item_category: item.product.categoryLabel || item.product.category
    }));

    // GA4: view_cart
    if (this.config?.ga4Enabled && window.gtag && this.config.ga4MeasurementId) {
      window.gtag('event', 'view_cart', {
        currency: currency,
        value: subtotal,
        items
      });
      activePlatforms.push('GA4');
    }

    // GTM: view_cart
    if (this.config?.gtmEnabled && window.dataLayer) {
      window.dataLayer.push({
        event: 'view_cart',
        ecommerce: {
          currency: currency,
          value: subtotal,
          items
        }
      });
      activePlatforms.push('GTM');
    }

    this.logEvent('view_cart', { itemCount: cartItems.length, subtotal, currency }, activePlatforms);
  }

  /**
   * 6. InitiateCheckout / begin_checkout
   */
  public trackBeginCheckout(cartItems: CartItem[], totalAmount: number, couponCode?: string) {
    const activePlatforms: string[] = [];
    const currency = this.config?.ga4Currency || 'BDT';

    const contentIds = cartItems.map((item) => item.product.id);
    const items = cartItems.map((item) => ({
      item_id: item.product.id,
      item_name: item.product.name,
      price: item.product.price,
      quantity: item.quantity,
      item_category: item.product.categoryLabel || item.product.category
    }));

    // Meta Pixel: InitiateCheckout
    if (this.config?.metaPixelEnabled && window.fbq) {
      window.fbq('track', 'InitiateCheckout', {
        content_ids: contentIds,
        content_type: 'product',
        num_items: cartItems.reduce((sum, i) => sum + i.quantity, 0),
        value: totalAmount,
        currency: currency
      });
      activePlatforms.push('Meta Pixel');
    }

    // GA4: begin_checkout
    if (this.config?.ga4Enabled && window.gtag && this.config.ga4MeasurementId) {
      window.gtag('event', 'begin_checkout', {
        currency: currency,
        value: totalAmount,
        coupon: couponCode || undefined,
        items
      });
      activePlatforms.push('GA4');
    }

    // GTM: begin_checkout
    if (this.config?.gtmEnabled && window.dataLayer) {
      window.dataLayer.push({
        event: 'begin_checkout',
        ecommerce: {
          currency: currency,
          value: totalAmount,
          coupon: couponCode || undefined,
          items
        }
      });
      activePlatforms.push('GTM');
    }

    // TikTok: InitiateCheckout
    if (this.config?.tiktokEnabled && window.ttq) {
      window.ttq.track('InitiateCheckout', {
        contents: cartItems.map((i) => ({
          content_id: i.product.id,
          content_name: i.product.name,
          quantity: i.quantity,
          price: i.product.price
        })),
        value: totalAmount,
        currency: currency
      });
      activePlatforms.push('TikTok Pixel');
    }

    this.logEvent('begin_checkout', { itemCount: cartItems.length, totalAmount, couponCode, currency }, activePlatforms);
  }

  /**
   * 7. AddPaymentInfo / add_payment_info
   */
  public trackAddPaymentInfo(paymentType: string, totalAmount: number, cartItems: CartItem[]) {
    const activePlatforms: string[] = [];
    const currency = this.config?.ga4Currency || 'BDT';

    const items = cartItems.map((item) => ({
      item_id: item.product.id,
      item_name: item.product.name,
      price: item.product.price,
      quantity: item.quantity
    }));

    // Meta Pixel: AddPaymentInfo
    if (this.config?.metaPixelEnabled && window.fbq) {
      window.fbq('track', 'AddPaymentInfo', {
        value: totalAmount,
        currency: currency,
        content_category: paymentType
      });
      activePlatforms.push('Meta Pixel');
    }

    // GA4: add_payment_info
    if (this.config?.ga4Enabled && window.gtag && this.config.ga4MeasurementId) {
      window.gtag('event', 'add_payment_info', {
        currency: currency,
        value: totalAmount,
        payment_type: paymentType,
        items
      });
      activePlatforms.push('GA4');
    }

    // GTM: add_payment_info
    if (this.config?.gtmEnabled && window.dataLayer) {
      window.dataLayer.push({
        event: 'add_payment_info',
        ecommerce: {
          currency: currency,
          value: totalAmount,
          payment_type: paymentType,
          items
        }
      });
      activePlatforms.push('GTM');
    }

    this.logEvent('add_payment_info', { paymentType, totalAmount, currency }, activePlatforms);
  }

  /**
   * 8. Purchase (Guaranteed Deduplication Engine)
   */
  public trackPurchase(order: Order) {
    if (!order || !order.id) return;
    const orderId = order.orderNumber || order.id;

    // STRICT DEDUPLICATION: Do not re-fire purchase if already processed in this browser session
    if (this.firedPurchases.has(orderId)) {
      if (this.config?.testModeEnabled) {
        console.warn(`⚠️ [Tracking Deduplication] Purchase event for order ${orderId} already emitted. Skipping duplicate.`);
      }
      return;
    }

    this.firedPurchases.add(orderId);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('hom_fired_purchases', JSON.stringify(Array.from(this.firedPurchases)));
      } catch (e) {
        // ignore
      }
    }

    const activePlatforms: string[] = [];
    const currency = this.config?.ga4Currency || 'BDT';
    const contentIds = (order.items || []).map((i) => i.product?.id || 'item');
    const items = (order.items || []).map((item) => ({
      item_id: item.product?.id || 'unknown',
      item_name: item.product?.name || 'Jewelry Item',
      price: item.product?.price || 0,
      quantity: item.quantity || 1,
      item_category: item.product?.categoryLabel || item.product?.category || 'Jewelry'
    }));

    const eventId = `order_${orderId}`;

    // 1. Meta Pixel: Purchase (with eventID for exact Meta CAPI Deduplication)
    if (this.config?.metaPixelEnabled && window.fbq) {
      window.fbq(
        'track',
        'Purchase',
        {
          content_ids: contentIds,
          content_type: 'product',
          value: order.total,
          currency: currency,
          num_items: (order.items || []).reduce((sum, i) => sum + i.quantity, 0),
          order_id: orderId
        },
        { eventID: eventId }
      );
      activePlatforms.push('Meta Pixel');
    }

    // 2. GA4: purchase
    if (this.config?.ga4Enabled && window.gtag && this.config.ga4MeasurementId) {
      window.gtag('event', 'purchase', {
        transaction_id: orderId,
        value: order.total,
        currency: currency,
        tax: 0,
        shipping: order.shippingCharge || 0,
        coupon: order.discount > 0 ? 'COUPON_APPLIED' : undefined,
        items
      });
      activePlatforms.push('GA4');
    }

    // 3. Google Ads Conversion
    if (
      this.config?.googleAdsEnabled &&
      window.gtag &&
      this.config.googleAdsConversionId &&
      this.config.googleAdsConversionLabel
    ) {
      const sendToTag = `${this.config.googleAdsConversionId}/${this.config.googleAdsConversionLabel}`;
      window.gtag('event', 'conversion', {
        send_to: sendToTag,
        value: order.total,
        currency: currency,
        transaction_id: orderId
      });
      activePlatforms.push('Google Ads');
    }

    // 4. GTM: purchase
    if (this.config?.gtmEnabled && window.dataLayer) {
      window.dataLayer.push({
        event: 'purchase',
        ecommerce: {
          transaction_id: orderId,
          value: order.total,
          currency: currency,
          tax: 0,
          shipping: order.shippingCharge || 0,
          items
        }
      });
      activePlatforms.push('GTM');
    }

    // 5. TikTok Pixel: CompletePayment / PlaceAnOrder
    if (this.config?.tiktokEnabled && window.ttq) {
      window.ttq.track('CompletePayment', {
        contents: (order.items || []).map((i) => ({
          content_id: i.product?.id,
          content_name: i.product?.name,
          quantity: i.quantity,
          price: i.product?.price
        })),
        content_type: 'product',
        value: order.total,
        currency: currency,
        order_id: orderId
      });
      activePlatforms.push('TikTok Pixel');
    }

    this.logEvent('purchase', { orderId, total: order.total, currency, itemsCount: items.length }, activePlatforms);

    // 6. Server-Side Authoritative Verification & Meta CAPI Deduplicated Event
    // Dispatches orderId and matching eventId to server without exposing server secrets to client
    this.dispatchServerPurchase(orderId, eventId, order);
  }

  /**
   * 9. Auth & Registration Events
   */
  public trackAuthEvent(type: 'login' | 'signup', method: string = 'email_phone', userEmail?: string) {
    const activePlatforms: string[] = [];

    // GA4
    if (this.config?.ga4Enabled && window.gtag && this.config.ga4MeasurementId) {
      const eventName = type === 'signup' ? 'sign_up' : 'login';
      window.gtag('event', eventName, { method });
      activePlatforms.push('GA4');
    }

    // TikTok: CompleteRegistration
    if (type === 'signup' && this.config?.tiktokEnabled && window.ttq) {
      window.ttq.track('CompleteRegistration');
      activePlatforms.push('TikTok Pixel');
    }

    // Meta Pixel: Lead / CompleteRegistration
    if (type === 'signup' && this.config?.metaPixelEnabled && window.fbq) {
      window.fbq('track', 'CompleteRegistration', {
        status: 'completed'
      });
      activePlatforms.push('Meta Pixel');
    }

    // Google Ads: Lead Conversion if configured
    if (this.config?.googleAdsEnabled && window.gtag && this.config.googleAdsConversionId) {
      window.gtag('event', 'conversion', {
        send_to: this.config.googleAdsConversionId
      });
      activePlatforms.push('Google Ads');
    }

    this.logEvent(type === 'signup' ? 'sign_up' : 'login', { method, userEmail }, activePlatforms);
  }

  // ==========================================
  // DIAGNOSTIC HEALTH CHECK INSPECTOR
  // ==========================================

  /**
   * Evaluates the real-time health and runtime injection of each tracking platform
   */
  public inspectTrackingHealth(customConfig?: MarketingPixelsConfig): PlatformHealthStatus[] {
    const config = customConfig || this.config || ({} as MarketingPixelsConfig);
    const isBrowser = typeof window !== 'undefined';

    // 1. Meta Pixel
    const metaId = config.metaPixelId?.trim() || '';
    const metaConfigured = Boolean(metaId.length >= 4);
    const metaRuntime = isBrowser && typeof (window as any).fbq === 'function' && Boolean((window as any).fbq.loaded || (window as any)._fbq || (window as any).fbq.version);
    const metaScriptInjected = isBrowser && Boolean(
      (metaId && document.getElementById(`meta-pixel-${metaId}`)) ||
      document.querySelector('script[src*="connect.facebook.net"]') ||
      document.querySelector('script[src*="fbevents.js"]')
    );

    let metaStatus: 'active' | 'configured' | 'disabled' | 'error' = 'disabled';
    let metaDetails = 'Integration is disabled by administrator.';
    if (!config.metaPixelEnabled) {
      metaStatus = 'disabled';
      metaDetails = 'Pixel is switched OFF in configuration.';
    } else if (!metaConfigured) {
      metaStatus = 'error';
      metaDetails = 'Meta Pixel ID is missing or invalid.';
    } else if (metaRuntime) {
      metaStatus = 'active';
      metaDetails = 'Meta Pixel SDK (fbq) initialized in browser window.';
    } else if (metaScriptInjected) {
      metaStatus = 'configured';
      metaDetails = 'Meta script element injected in DOM; waiting for SDK initialization.';
    } else {
      metaStatus = 'configured';
      metaDetails = 'Configured in store; ready for injection.';
    }

    // 2. Google Analytics 4
    const ga4Id = config.ga4MeasurementId?.trim() || '';
    const ga4Configured = Boolean(ga4Id.startsWith('G-') && ga4Id.length > 3);
    const ga4Runtime = isBrowser && typeof (window as any).gtag === 'function' && Array.isArray((window as any).dataLayer);
    const ga4ScriptInjected = isBrowser && Boolean(
      (ga4Id && document.getElementById(`ga4-gtag-${ga4Id}`)) ||
      document.querySelector('script[src*="googletagmanager.com/gtag/js"]')
    );

    let ga4Status: 'active' | 'configured' | 'disabled' | 'error' = 'disabled';
    let ga4Details = 'GA4 tracking is disabled.';
    if (!config.ga4Enabled) {
      ga4Status = 'disabled';
      ga4Details = 'GA4 is switched OFF in configuration.';
    } else if (!ga4Configured) {
      ga4Status = 'error';
      ga4Details = 'Measurement ID should start with "G-".';
    } else if (ga4Runtime) {
      ga4Status = 'active';
      ga4Details = 'GA4 gtag.js & dataLayer initialized in browser window.';
    } else if (ga4ScriptInjected) {
      ga4Status = 'configured';
      ga4Details = 'GA4 script tag injected in DOM; awaiting dataLayer response.';
    } else {
      ga4Status = 'configured';
      ga4Details = 'Measurement ID configured; ready for injection.';
    }

    // 3. Google Tag Manager
    const gtmId = config.gtmContainerId?.trim() || '';
    const gtmConfigured = Boolean(gtmId.startsWith('GTM-') && gtmId.length > 4);
    const gtmRuntime = isBrowser && Boolean((window as any).google_tag_manager || (Array.isArray((window as any).dataLayer) && (window as any).dataLayer.some((item: any) => item && item['gtm.start'])));
    const gtmScriptInjected = isBrowser && Boolean(
      (gtmId && document.getElementById(`gtm-script-${gtmId}`)) ||
      document.querySelector('script[src*="googletagmanager.com/gtm.js"]')
    );

    let gtmStatus: 'active' | 'configured' | 'disabled' | 'error' = 'disabled';
    let gtmDetails = 'GTM is disabled.';
    if (!config.gtmEnabled) {
      gtmStatus = 'disabled';
      gtmDetails = 'GTM container is switched OFF in configuration.';
    } else if (!gtmConfigured) {
      gtmStatus = 'error';
      gtmDetails = 'GTM Container ID should start with "GTM-".';
    } else if (gtmRuntime) {
      gtmStatus = 'active';
      gtmDetails = 'GTM dataLayer & container runtime detected.';
    } else if (gtmScriptInjected) {
      gtmStatus = 'configured';
      gtmDetails = 'GTM script injected in document head.';
    } else {
      gtmStatus = 'configured';
      gtmDetails = 'Container ID configured.';
    }

    // 4. Google Ads
    const gAdsId = config.googleAdsConversionId?.trim() || '';
    const gAdsLabel = config.googleAdsConversionLabel?.trim() || '';
    const gAdsConfigured = Boolean(gAdsId.length > 3);
    const gAdsRuntime = isBrowser && typeof (window as any).gtag === 'function';
    const gAdsScriptInjected = isBrowser && Boolean(
      (gAdsId && document.getElementById(`google-ads-gtag-${gAdsId}`)) ||
      document.querySelector('script[src*="googletagmanager.com/gtag/js"]')
    );

    let gAdsStatus: 'active' | 'configured' | 'disabled' | 'error' = 'disabled';
    let gAdsDetails = 'Google Ads tracking is disabled.';
    if (!config.googleAdsEnabled) {
      gAdsStatus = 'disabled';
      gAdsDetails = 'Google Ads Conversion tracking is switched OFF.';
    } else if (!gAdsConfigured) {
      gAdsStatus = 'error';
      gAdsDetails = 'Conversion ID (e.g. AW-XXXXXXXXXX) is required.';
    } else if (gAdsRuntime) {
      gAdsStatus = 'active';
      gAdsDetails = gAdsLabel ? `Google Ads tag initialized with label ${gAdsLabel}.` : 'Google Ads gtag runtime initialized.';
    } else if (gAdsScriptInjected) {
      gAdsStatus = 'configured';
      gAdsDetails = 'Google Ads script tag injected in DOM.';
    } else {
      gAdsStatus = 'configured';
      gAdsDetails = 'Conversion ID saved.';
    }

    // 5. TikTok Pixel
    const ttId = config.tiktokPixelId?.trim() || '';
    const ttConfigured = Boolean(ttId.length >= 4);
    const ttRuntime = isBrowser && typeof (window as any).ttq?.track === 'function';
    const ttScriptInjected = isBrowser && Boolean(
      (ttId && document.getElementById(`tiktok-pixel-${ttId}`)) ||
      document.querySelector('script[src*="analytics.tiktok.com"]')
    );

    let ttStatus: 'active' | 'configured' | 'disabled' | 'error' = 'disabled';
    let ttDetails = 'TikTok Pixel is disabled.';
    if (!config.tiktokEnabled) {
      ttStatus = 'disabled';
      ttDetails = 'TikTok Pixel is switched OFF in configuration.';
    } else if (!ttConfigured) {
      ttStatus = 'error';
      ttDetails = 'TikTok Pixel ID is missing or invalid.';
    } else if (ttRuntime) {
      ttStatus = 'active';
      ttDetails = 'TikTok Pixel SDK (ttq) initialized in browser window.';
    } else if (ttScriptInjected) {
      ttStatus = 'configured';
      ttDetails = 'TikTok script tag injected into DOM.';
    } else {
      ttStatus = 'configured';
      ttDetails = 'TikTok Pixel ID saved.';
    }

    // 6. Microsoft Clarity
    const clarityId = config.clarityProjectId?.trim() || '';
    const clarityConfigured = Boolean(clarityId.length >= 3);
    const clarityRuntime = isBrowser && typeof (window as any).clarity === 'function';
    const clarityScriptInjected = isBrowser && Boolean(
      (clarityId && document.getElementById(`clarity-script-${clarityId}`)) ||
      document.querySelector('script[src*="clarity.ms"]')
    );

    let clarityStatus: 'active' | 'configured' | 'disabled' | 'error' = 'disabled';
    let clarityDetails = 'Clarity is disabled.';
    if (!config.clarityEnabled) {
      clarityStatus = 'disabled';
      clarityDetails = 'Microsoft Clarity is switched OFF in configuration.';
    } else if (!clarityConfigured) {
      clarityStatus = 'error';
      clarityDetails = 'Project ID is missing.';
    } else if (clarityRuntime) {
      clarityStatus = 'active';
      clarityDetails = 'Clarity session recording engine active.';
    } else if (clarityScriptInjected) {
      clarityStatus = 'configured';
      clarityDetails = 'Clarity script injected into DOM.';
    } else {
      clarityStatus = 'configured';
      clarityDetails = 'Project ID saved.';
    }

    // Helper for labels and colors
    const formatStatus = (s: 'active' | 'configured' | 'disabled' | 'error') => {
      switch (s) {
        case 'active':
          return { label: 'Active & Detected', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
        case 'configured':
          return { label: 'Configured', color: 'text-blue-700 bg-blue-50 border-blue-200' };
        case 'error':
          return { label: 'Misconfigured', color: 'text-red-700 bg-red-50 border-red-200' };
        default:
          return { label: 'Disabled', color: 'text-neutral-500 bg-neutral-100 border-neutral-200' };
      }
    };

    return [
      {
        id: 'meta',
        name: 'Meta / Facebook Pixel',
        category: 'social',
        enabled: Boolean(config.metaPixelEnabled),
        configuredId: metaId,
        isConfigured: metaConfigured,
        status: metaStatus,
        statusLabel: formatStatus(metaStatus).label,
        statusColor: formatStatus(metaStatus).color,
        details: metaDetails,
        runtimeDetected: metaRuntime,
        scriptInjected: metaScriptInjected,
        platformVerifiedNote: 'Platform dashboard verification required (Events Manager)'
      },
      {
        id: 'ga4',
        name: 'Google Analytics 4',
        category: 'analytics',
        enabled: Boolean(config.ga4Enabled),
        configuredId: ga4Id,
        isConfigured: ga4Configured,
        status: ga4Status,
        statusLabel: formatStatus(ga4Status).label,
        statusColor: formatStatus(ga4Status).color,
        details: ga4Details,
        runtimeDetected: ga4Runtime,
        scriptInjected: ga4ScriptInjected,
        platformVerifiedNote: 'Platform dashboard verification required (GA4 DebugView)'
      },
      {
        id: 'gtm',
        name: 'Google Tag Manager',
        category: 'tag_manager',
        enabled: Boolean(config.gtmEnabled),
        configuredId: gtmId,
        isConfigured: gtmConfigured,
        status: gtmStatus,
        statusLabel: formatStatus(gtmStatus).label,
        statusColor: formatStatus(gtmStatus).color,
        details: gtmDetails,
        runtimeDetected: gtmRuntime,
        scriptInjected: gtmScriptInjected,
        platformVerifiedNote: 'Platform dashboard verification required (GTM Preview Mode)'
      },
      {
        id: 'google_ads',
        name: 'Google Ads Conversion',
        category: 'ads',
        enabled: Boolean(config.googleAdsEnabled),
        configuredId: gAdsId,
        isConfigured: gAdsConfigured,
        status: gAdsStatus,
        statusLabel: formatStatus(gAdsStatus).label,
        statusColor: formatStatus(gAdsStatus).color,
        details: gAdsDetails,
        runtimeDetected: gAdsRuntime,
        scriptInjected: gAdsScriptInjected,
        platformVerifiedNote: 'Platform dashboard verification required (Google Ads Conversions)'
      },
      {
        id: 'tiktok',
        name: 'TikTok Pixel',
        category: 'social',
        enabled: Boolean(config.tiktokEnabled),
        configuredId: ttId,
        isConfigured: ttConfigured,
        status: ttStatus,
        statusLabel: formatStatus(ttStatus).label,
        statusColor: formatStatus(ttStatus).color,
        details: ttDetails,
        runtimeDetected: ttRuntime,
        scriptInjected: ttScriptInjected,
        platformVerifiedNote: 'Platform dashboard verification required (TikTok Events Manager)'
      },
      {
        id: 'clarity',
        name: 'Microsoft Clarity',
        category: 'ux',
        enabled: Boolean(config.clarityEnabled),
        configuredId: clarityId,
        isConfigured: clarityConfigured,
        status: clarityStatus,
        statusLabel: formatStatus(clarityStatus).label,
        statusColor: formatStatus(clarityStatus).color,
        details: clarityDetails,
        runtimeDetected: clarityRuntime,
        scriptInjected: clarityScriptInjected,
        platformVerifiedNote: 'Platform dashboard verification required (Clarity Live Recordings)'
      }
    ];
  }
}

export const trackingService = new TrackingService();
