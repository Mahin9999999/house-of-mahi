import { 
  ICourierAdapter, 
  ServerCourierConfig, 
  ServerCourierBookingPayload, 
  ServerCourierBookingResult, 
  ServerCourierTrackingResult, 
  ServerCourierTestResult 
} from '../types';

interface PathaoCity {
  city_id: number;
  city_name: string;
}

interface PathaoZone {
  zone_id: number;
  zone_name: string;
}

interface CacheEntry<T> {
  data: T;
  cachedAt: number;
}

// In-memory caching to avoid redundant round-trips to Pathao API during high traffic
const CITY_CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour
const ZONE_CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour
const STORE_CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes

let cachedCityList: CacheEntry<PathaoCity[]> | null = null;
const cachedZoneLists = new Map<number, CacheEntry<PathaoZone[]>>();
const cachedStoreIdMap = new Map<string, CacheEntry<number>>();

function cleanText(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

// Common alternate spellings and aliases for Bangladesh districts
const DISTRICT_ALIASES: Record<string, string[]> = {
  dhaka: ['dhaka', 'dhakacity', 'dhakanorth', 'dhakasouth'],
  chattogram: ['chittagong', 'chattogram', 'ctg'],
  chittagong: ['chattogram', 'chittagong', 'ctg'],
  barishal: ['barisal', 'barishal'],
  barisal: ['barishal', 'barisal'],
  bogura: ['bogra', 'bogura'],
  bogra: ['bogura', 'bogra'],
  jashore: ['jessore', 'jashore'],
  jessore: ['jashore', 'jessore'],
  cumilla: ['comilla', 'cumilla'],
  comilla: ['cumilla', 'comilla'],
  brahmanbaria: ['bbaria', 'brahmanbaria', 'bbaria'],
  coxsbazar: ['coxsbazar', 'coxsbazar'],
  moulvibazar: ['maulvibazar', 'moulvibazar', 'moulovibazar'],
  chapainawabganj: ['nawabganj', 'chapainawabganj'],
  netrokona: ['netrakona', 'netrokona']
};

/**
 * Pathao Courier Server Adapter
 * Direct Server-to-Server communication with Pathao Hermes API (api-hermes.pathao.com)
 * Handles token negotiation, order dispatch, status tracking, and connection tests.
 */
export class PathaoServerAdapter implements ICourierAdapter {
  readonly providerId = 'pathao' as const;
  readonly defaultName = 'Pathao Courier';
  readonly defaultBaseUrl = 'https://api-hermes.pathao.com';

  /**
   * Helper: Resolves a valid Bearer Access Token for Pathao API
   * Supports:
   * 1. Explicit Access Token in config.notes (e.g. "TOKEN:<token>") or config.apiKey
   * 2. Full OAuth 2.0 Password Grant token exchange using client_id, client_secret, username, password.
   */
  async getAccessToken(config: ServerCourierConfig, baseUrl: string): Promise<string | null> {
    // 1. Check if token is explicitly saved in notes or apiKey
    if (config.notes && config.notes.startsWith('TOKEN:')) {
      const explicitToken = config.notes.replace('TOKEN:', '').trim();
      if (explicitToken) return explicitToken;
    }

    const clientId = (config.apiKey || '').trim();
    const clientSecret = (config.secretKey || '').trim();
    const username = (config.merchantId || '').trim();
    const password = (config.webhookSecret || '').trim();

    // If only apiKey is provided without secretKey/password (direct token mode)
    if (clientId && !clientSecret && !username && !password) {
      return clientId;
    }

    // 2. Full OAuth 2.0 Password Grant issue-token
    if (clientId && clientSecret && username && password) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);

        const tokenRes = await fetch(`${baseUrl}/aladdin/api/v1/issue-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            client_id: clientId,
            client_secret: clientSecret,
            username: username,
            password: password,
            grant_type: 'password'
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        const tokenData = await tokenRes.json().catch(() => null) as Record<string, unknown> | null;

        if (tokenRes.ok && tokenData && typeof tokenData.access_token === 'string') {
          return tokenData.access_token;
        }

        return null;
      } catch {
        return null;
      }
    }

    return null;
  }

  /**
   * Helper: Resolves the merchant's active numeric Store ID
   * 1. Checks config.notes for STORE_ID:<number>
   * 2. Checks if config.merchantId is already a positive integer
   * 3. Calls Pathao API /aladdin/api/v1/stores to fetch the merchant's registered store ID
   */
  async resolveStoreId(
    accessToken: string,
    baseUrl: string,
    config: ServerCourierConfig
  ): Promise<{ storeId: number | null; error?: string }> {
    // 1. Check notes for explicit STORE_ID:<number>
    if (config.notes) {
      const match = config.notes.match(/STORE(?:_ID)?\s*[:=]\s*(\d+)/i);
      if (match && match[1]) {
        const parsed = parseInt(match[1], 10);
        if (!isNaN(parsed) && parsed > 0) return { storeId: parsed };
      }
    }

    // 2. Check if merchantId itself is purely numeric
    if (config.merchantId && /^\d+$/.test(config.merchantId.trim())) {
      const parsed = parseInt(config.merchantId.trim(), 10);
      if (!isNaN(parsed) && parsed > 0) return { storeId: parsed };
    }

    // 3. Check memory cache
    const cacheKey = `${baseUrl}_${config.apiKey || 'default'}`;
    const cached = cachedStoreIdMap.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < STORE_CACHE_TTL_MS) {
      return { storeId: cached.data };
    }

    // 4. Fetch from Pathao Aladdin API
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${baseUrl}/aladdin/api/v1/stores`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const data = await response.json().catch(() => null) as Record<string, unknown> | null;

      if (response.ok && data) {
        const rawStores = (data.data && typeof data.data === 'object' && 'data' in data.data && Array.isArray((data.data as Record<string, unknown>).data))
          ? (data.data as Record<string, unknown>).data as Record<string, unknown>[]
          : Array.isArray(data.data)
          ? data.data as Record<string, unknown>[]
          : [];

        if (rawStores.length > 0) {
          // Find first active store or fallback to the first store
          const activeStore = rawStores.find(s => s.is_active === 1 || s.is_active === true || s.status === 'active') || rawStores[0];
          const rawId = activeStore.store_id ?? activeStore.id;
          const numId = typeof rawId === 'number' ? rawId : parseInt(String(rawId || ''), 10);

          if (!isNaN(numId) && numId > 0) {
            cachedStoreIdMap.set(cacheKey, { data: numId, cachedAt: Date.now() });
            return { storeId: numId };
          }
        }
      }

      return {
        storeId: null,
        error: 'Pathao Store ID could not be found. Please ensure at least one active store is created in your Pathao merchant dashboard, or add "STORE_ID: <number>" in courier settings notes.'
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error';
      return {
        storeId: null,
        error: `Failed to fetch Pathao stores (${msg}). Please verify network connection or set STORE_ID in settings notes.`
      };
    }
  }

  /**
   * Helper: Fetches and caches Pathao city list
   */
  async fetchCityList(accessToken: string, baseUrl: string): Promise<PathaoCity[]> {
    if (cachedCityList && Date.now() - cachedCityList.cachedAt < CITY_CACHE_TTL_MS) {
      return cachedCityList.data;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      // Pathao Bangladesh country ID is 1
      let response = await fetch(`${baseUrl}/aladdin/api/v1/countries/1/city-list`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        signal: controller.signal
      });

      if (!response.ok && response.status === 404) {
        // Fallback endpoint if country-nested route is not used
        response = await fetch(`${baseUrl}/aladdin/api/v1/city-list`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          signal: controller.signal
        });
      }

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json().catch(() => null) as Record<string, unknown> | null;
        const list = (data?.data && typeof data.data === 'object' && 'data' in data.data && Array.isArray((data.data as Record<string, unknown>).data))
          ? (data.data as Record<string, unknown>).data as Record<string, unknown>[]
          : Array.isArray(data?.data)
          ? data.data as Record<string, unknown>[]
          : [];

        const cities: PathaoCity[] = list
          .map(c => ({
            city_id: typeof c.city_id === 'number' ? c.city_id : parseInt(String(c.city_id || c.id || ''), 10),
            city_name: String(c.city_name || c.name || '').trim()
          }))
          .filter(c => !isNaN(c.city_id) && c.city_id > 0 && c.city_name.length > 0);

        if (cities.length > 0) {
          cachedCityList = { data: cities, cachedAt: Date.now() };
          return cities;
        }
      }
    } catch {
      // Continue and return empty list on network failure
    }

    return cachedCityList?.data || [];
  }

  /**
   * Helper: Fetches and caches Pathao zone list for a specific city
   */
  async fetchZoneList(cityId: number, accessToken: string, baseUrl: string): Promise<PathaoZone[]> {
    const cached = cachedZoneLists.get(cityId);
    if (cached && Date.now() - cached.cachedAt < ZONE_CACHE_TTL_MS) {
      return cached.data;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const response = await fetch(`${baseUrl}/aladdin/api/v1/cities/${cityId}/zone-list`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json().catch(() => null) as Record<string, unknown> | null;
        const list = (data?.data && typeof data.data === 'object' && 'data' in data.data && Array.isArray((data.data as Record<string, unknown>).data))
          ? (data.data as Record<string, unknown>).data as Record<string, unknown>[]
          : Array.isArray(data?.data)
          ? data.data as Record<string, unknown>[]
          : [];

        const zones: PathaoZone[] = list
          .map(z => ({
            zone_id: typeof z.zone_id === 'number' ? z.zone_id : parseInt(String(z.zone_id || z.id || ''), 10),
            zone_name: String(z.zone_name || z.name || '').trim()
          }))
          .filter(z => !isNaN(z.zone_id) && z.zone_id > 0 && z.zone_name.length > 0);

        if (zones.length > 0) {
          cachedZoneLists.set(cityId, { data: zones, cachedAt: Date.now() });
          return zones;
        }
      }
    } catch {
      // Continue and return empty list on network failure
    }

    return cached?.data || [];
  }

  /**
   * Helper: Resolves numeric Pathao City ID and Zone ID matching recipient location
   * Validates City -> Zone relationship strictly to prevent 422 errors.
   */
  async resolveCityAndZone(
    accessToken: string,
    baseUrl: string,
    district?: string,
    thana?: string,
    address?: string
  ): Promise<{ cityId: number | null; cityName?: string; zoneId: number | null; zoneName?: string; error?: string }> {
    const cities = await this.fetchCityList(accessToken, baseUrl);

    if (!cities || cities.length === 0) {
      return {
        cityId: null,
        zoneId: null,
        error: 'Unable to retrieve Pathao city list. Please check Pathao API connectivity and credentials.'
      };
    }

    // 1. Match City from recipient district or address
    let matchedCity: PathaoCity | null = null;
    const cleanDistrict = cleanText(district || '');

    if (cleanDistrict) {
      // Direct clean match
      matchedCity = cities.find(c => cleanText(c.city_name) === cleanDistrict) || null;

      // Alias match
      if (!matchedCity) {
        const aliases = DISTRICT_ALIASES[cleanDistrict] || [];
        matchedCity = cities.find(c => {
          const cClean = cleanText(c.city_name);
          return aliases.includes(cClean) || (DISTRICT_ALIASES[cClean] && DISTRICT_ALIASES[cClean].includes(cleanDistrict));
        }) || null;
      }

      // Substring match (min 4 characters)
      if (!matchedCity && cleanDistrict.length >= 4) {
        matchedCity = cities.find(c => {
          const cClean = cleanText(c.city_name);
          return cClean.length >= 4 && (cleanDistrict.includes(cClean) || cClean.includes(cleanDistrict));
        }) || null;
      }
    }

    // Fallback: search address for city name
    if (!matchedCity && address) {
      const cleanAddr = cleanText(address);
      const sortedCities = [...cities].sort((a, b) => b.city_name.length - a.city_name.length);
      for (const c of sortedCities) {
        const cClean = cleanText(c.city_name);
        if (cClean.length >= 4 && cleanAddr.includes(cClean)) {
          matchedCity = c;
          break;
        }
      }
    }

    if (!matchedCity) {
      const sampleCities = cities.slice(0, 10).map(c => c.city_name).join(', ');
      return {
        cityId: null,
        zoneId: null,
        error: `Pathao City could not be matched for district "${district || 'Not Provided'}". Available Pathao cities include: ${sampleCities}...`
      };
    }

    // 2. Fetch Zones strictly for the matched City
    const zones = await this.fetchZoneList(matchedCity.city_id, accessToken, baseUrl);

    if (!zones || zones.length === 0) {
      return {
        cityId: matchedCity.city_id,
        cityName: matchedCity.city_name,
        zoneId: null,
        error: `No Pathao zones found for city "${matchedCity.city_name}" (City ID: ${matchedCity.city_id}).`
      };
    }

    // 3. Match Zone strictly within the city
    let matchedZone: PathaoZone | null = null;
    const cleanThana = cleanText(thana || '');

    if (cleanThana) {
      // Direct clean match
      matchedZone = zones.find(z => cleanText(z.zone_name) === cleanThana) || null;

      // Substring match (min 3 characters)
      if (!matchedZone && cleanThana.length >= 3) {
        matchedZone = zones.find(z => {
          const zClean = cleanText(z.zone_name);
          return zClean.length >= 3 && (cleanThana.includes(zClean) || zClean.includes(cleanThana));
        }) || null;
      }
    }

    // Search address for zone name within this city
    if (!matchedZone && address) {
      const cleanAddr = cleanText(address);
      const sortedZones = [...zones].sort((a, b) => b.zone_name.length - a.zone_name.length);
      for (const z of sortedZones) {
        const zClean = cleanText(z.zone_name);
        if (zClean.length >= 4 && cleanAddr.includes(zClean)) {
          matchedZone = z;
          break;
        }
      }
    }

    // Sadar or city center fallback if thana is empty or specifies sadar
    if (!matchedZone) {
      if (!cleanThana || cleanThana.includes('sadar') || cleanThana === cleanText(matchedCity.city_name)) {
        matchedZone = zones.find(z => cleanText(z.zone_name).includes('sadar') || cleanText(z.zone_name) === cleanText(matchedCity!.city_name)) || null;
      }
    }

    if (!matchedZone) {
      const sampleZones = zones.slice(0, 10).map(z => z.zone_name).join(', ');
      return {
        cityId: matchedCity.city_id,
        cityName: matchedCity.city_name,
        zoneId: null,
        error: `Pathao Zone could not be matched for thana/area "${thana || 'Not Provided'}" in ${matchedCity.city_name}. Available zones: ${sampleZones}...`
      };
    }

    return {
      cityId: matchedCity.city_id,
      cityName: matchedCity.city_name,
      zoneId: matchedZone.zone_id,
      zoneName: matchedZone.zone_name
    };
  }

  /**
   * Book an order parcel with Pathao Courier API
   * Ensures store_id, recipient_city, and recipient_zone are resolved to valid integer IDs
   */
  async bookOrder(
    payload: ServerCourierBookingPayload,
    config: ServerCourierConfig
  ): Promise<ServerCourierBookingResult> {
    const baseUrl = (config.apiBaseUrl || this.defaultBaseUrl).replace(/\/+$/, '');
    const accessToken = await this.getAccessToken(config, baseUrl);

    if (!accessToken) {
      return {
        success: false,
        provider: this.providerId,
        courierName: config.name || this.defaultName,
        status: 'failed',
        errorMessage: 'Pathao API Bearer Token / Client Credentials missing in courier configuration.'
      };
    }

    // 1. Resolve valid numeric Store ID (integer)
    const storeResolution = await this.resolveStoreId(accessToken, baseUrl, config);
    if (!storeResolution.storeId) {
      return {
        success: false,
        provider: this.providerId,
        courierName: config.name || this.defaultName,
        status: 'failed',
        errorMessage: storeResolution.error || 'Pathao store_id is required but could not be resolved.'
      };
    }
    const storeId = storeResolution.storeId;

    // 2. Resolve valid numeric City ID and Zone ID (integers with validated relationship)
    const locationResolution = await this.resolveCityAndZone(
      accessToken,
      baseUrl,
      payload.recipientDistrict,
      payload.recipientThana,
      payload.recipientAddress
    );

    if (!locationResolution.cityId || !locationResolution.zoneId) {
      return {
        success: false,
        provider: this.providerId,
        courierName: config.name || this.defaultName,
        status: 'failed',
        errorMessage: locationResolution.error || 'Failed to match Pathao recipient city or zone.'
      };
    }

    const cityId = locationResolution.cityId;
    const zoneId = locationResolution.zoneId;

    // 3. Construct booking payload strictly conforming to Pathao Aladdin API specifications
    const requestBody: Record<string, unknown> = {
      store_id: storeId,
      merchant_order_id: payload.orderNumber || payload.orderId,
      recipient_name: payload.recipientName,
      recipient_phone: payload.recipientPhone,
      recipient_address: payload.recipientAddress,
      recipient_city: cityId,
      recipient_zone: zoneId,
      amount_to_collect: payload.codAmount,
      item_type: 2, // Parcel (2 = Parcel, 1 = Document per Pathao docs)
      item_quantity: payload.itemCount || 1,
      item_weight: payload.parcelWeightKg || 0.5,
      item_description: payload.parcelNote || 'Houseofmahi Parcel',
      delivery_type: 48 // 48 hours normal delivery standard
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    try {
      const response = await fetch(`${baseUrl}/aladdin/api/v1/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const data = await response.json().catch(() => null) as Record<string, unknown> | null;

      if (response.ok && data && (data.data || data.type === 'success')) {
        const orderData = (data.data as Record<string, unknown>) || data;
        const consignmentId = String(orderData.consignment_id || orderData.order_id || '');
        const trackingCode = String(orderData.consignment_id || orderData.order_id || consignmentId);
        const trackingUrl = `https://pathao.com/courier/tracking/?consignment_id=${encodeURIComponent(consignmentId)}`;

        return {
          success: true,
          provider: this.providerId,
          courierName: config.name || this.defaultName,
          consignmentId,
          trackingCode,
          trackingUrl,
          status: 'booked',
          statusCode: response.status
        };
      }

      // Handle Pathao error responses with sanitization (never leak tokens/secrets)
      let errorDetails = `Pathao returned HTTP status ${response.status}`;
      if (data) {
        if (data.errors && typeof data.errors === 'object') {
          errorDetails = Object.entries(data.errors)
            .map(([field, errs]) => `${field}: ${Array.isArray(errs) ? errs.join(', ') : errs}`)
            .join('; ');
        } else if (typeof data.message === 'string') {
          errorDetails = data.message;
        }
      }

      return {
        success: false,
        provider: this.providerId,
        courierName: config.name || this.defaultName,
        status: 'failed',
        errorMessage: errorDetails,
        statusCode: response.status
      };
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const isAbort = err instanceof Error && err.name === 'AbortError';
      const errMsg = isAbort 
        ? 'Connection to Pathao timed out after 15 seconds.' 
        : (err instanceof Error ? err.message : 'Unknown network failure communicating with Pathao API.');

      return {
        success: false,
        provider: this.providerId,
        courierName: config.name || this.defaultName,
        status: 'failed',
        errorMessage: errMsg
      };
    }
  }

  /**
   * Track an order via Pathao consignment ID
   */
  async trackOrder(
    trackingCode: string,
    config: ServerCourierConfig
  ): Promise<ServerCourierTrackingResult> {
    const baseUrl = (config.apiBaseUrl || this.defaultBaseUrl).replace(/\/+$/, '');
    const accessToken = await this.getAccessToken(config, baseUrl);

    if (!accessToken) {
      return {
        success: false,
        provider: this.providerId,
        trackingCode,
        currentStatus: 'Unknown',
        errorMessage: 'Missing Pathao API credentials for tracking.'
      };
    }

    try {
      const response = await fetch(`${baseUrl}/aladdin/api/v1/orders/${encodeURIComponent(trackingCode)}/info`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      });

      const data = await response.json().catch(() => null) as Record<string, unknown> | null;

      if (response.ok && data && data.data) {
        const info = data.data as Record<string, unknown>;
        return {
          success: true,
          provider: this.providerId,
          trackingCode,
          consignmentId: info.consignment_id ? String(info.consignment_id) : trackingCode,
          currentStatus: String(info.order_status || 'In Transit'),
          statusDetails: `Delivery: ${info.delivery_type || 'Standard'}`,
          lastUpdated: new Date().toISOString()
        };
      }

      return {
        success: false,
        provider: this.providerId,
        trackingCode,
        currentStatus: 'Pending',
        errorMessage: data?.message ? String(data.message) : `Failed to fetch tracking status (${response.status})`
      };
    } catch (err: unknown) {
      return {
        success: false,
        provider: this.providerId,
        trackingCode,
        currentStatus: 'Unknown',
        errorMessage: err instanceof Error ? err.message : 'Network error during Pathao tracking'
      };
    }
  }

  /**
   * Test Pathao API connection and credentials
   */
  async testConnection(
    config: ServerCourierConfig
  ): Promise<ServerCourierTestResult> {
    const baseUrl = (config.apiBaseUrl || this.defaultBaseUrl).replace(/\/+$/, '');
    const accessToken = await this.getAccessToken(config, baseUrl);

    if (!accessToken) {
      return {
        success: false,
        provider: this.providerId,
        courierName: config.name || this.defaultName,
        message: 'Pathao API Bearer Token / Credentials required to test connection.',
        testedAt: new Date().toISOString()
      };
    }

    try {
      // Pathao user/merchant info endpoint
      const response = await fetch(`${baseUrl}/aladdin/api/v1/user/info`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      });

      const data = await response.json().catch(() => null) as Record<string, unknown> | null;

      if (response.ok && data) {
        const userInfo = data.data as Record<string, unknown> | undefined;
        const merchantName = userInfo?.name ? ` (Merchant: ${userInfo.name})` : '';

        // Attempt store ID resolution check
        const storeCheck = await this.resolveStoreId(accessToken, baseUrl, config);
        const storeInfo = storeCheck.storeId ? ` | Store ID: ${storeCheck.storeId}` : '';

        return {
          success: true,
          provider: this.providerId,
          courierName: config.name || this.defaultName,
          message: `Connected successfully to Pathao API${merchantName}${storeInfo}`,
          statusCode: response.status,
          testedAt: new Date().toISOString()
        };
      }

      return {
        success: false,
        provider: this.providerId,
        courierName: config.name || this.defaultName,
        message: data?.message ? String(data.message) : `Authentication failed with Pathao (HTTP ${response.status})`,
        statusCode: response.status,
        testedAt: new Date().toISOString()
      };
    } catch (err: unknown) {
      return {
        success: false,
        provider: this.providerId,
        courierName: config.name || this.defaultName,
        message: err instanceof Error ? err.message : 'Network failure during Pathao connection test',
        testedAt: new Date().toISOString()
      };
    }
  }
}

