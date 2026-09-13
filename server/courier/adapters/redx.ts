import { 
  ICourierAdapter, 
  ServerCourierConfig, 
  ServerCourierBookingPayload, 
  ServerCourierBookingResult, 
  ServerCourierTrackingResult, 
  ServerCourierTestResult 
} from '../types';

/**
 * RedX Logistics Server Adapter
 * Direct Server-to-Server communication with RedX OpenAPI (openapi.redx.com.bd)
 * Handles parcel creation, status tracking, and connection tests.
 */
export class RedXServerAdapter implements ICourierAdapter {
  readonly providerId = 'redx' as const;
  readonly defaultName = 'RedX Logistics';
  readonly defaultBaseUrl = 'https://openapi.redx.com.bd/v1.0.0-beta';

  /**
   * Book an order parcel with RedX Logistics API
   */
  async bookOrder(
    payload: ServerCourierBookingPayload,
    config: ServerCourierConfig
  ): Promise<ServerCourierBookingResult> {
    const baseUrl = (config.apiBaseUrl || this.defaultBaseUrl).replace(/\/+$/, '');
    const apiKey = (config.apiKey || '').trim();

    if (!apiKey) {
      return {
        success: false,
        provider: this.providerId,
        courierName: config.name || this.defaultName,
        status: 'failed',
        errorMessage: 'RedX API Key / Access Token is missing in courier configuration.'
      };
    }

    // Prepare token formatted with Bearer prefix if not already present
    const authHeader = apiKey.startsWith('Bearer ') ? apiKey : `Bearer ${apiKey}`;

    // RedX accepts parcel weight in grams (default 500g)
    const weightInGrams = Math.round((payload.parcelWeightKg || 0.5) * 1000);

    const requestBody = {
      customer_name: payload.recipientName,
      customer_phone: payload.recipientPhone,
      delivery_area: payload.recipientDistrict,
      customer_address: payload.recipientAddress,
      merchant_invoice_id: payload.orderNumber || payload.orderId,
      cash_collection_amount: payload.codAmount,
      parcel_weight: weightInGrams,
      instruction: payload.parcelNote || 'Houseofmahi Package'
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    try {
      const response = await fetch(`${baseUrl}/parcel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'API-ACCESS-TOKEN': authHeader
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const data = await response.json().catch(() => null) as Record<string, unknown> | null;

      if (response.ok && data && data.tracking_id) {
        const trackingId = String(data.tracking_id);
        const trackingUrl = `https://redx.com.bd/track?trackingId=${encodeURIComponent(trackingId)}`;

        return {
          success: true,
          provider: this.providerId,
          courierName: config.name || this.defaultName,
          consignmentId: trackingId,
          trackingCode: trackingId,
          trackingUrl,
          status: 'booked',
          statusCode: response.status
        };
      }

      // Handle RedX error responses
      let errorDetails = `RedX returned HTTP status ${response.status}`;
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
        ? 'Connection to RedX timed out after 15 seconds.' 
        : (err instanceof Error ? err.message : 'Unknown network failure communicating with RedX API.');

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
   * Track an order via RedX tracking endpoint
   */
  async trackOrder(
    trackingCode: string,
    config: ServerCourierConfig
  ): Promise<ServerCourierTrackingResult> {
    const baseUrl = (config.apiBaseUrl || this.defaultBaseUrl).replace(/\/+$/, '');
    const apiKey = (config.apiKey || '').trim();

    if (!apiKey) {
      return {
        success: false,
        provider: this.providerId,
        trackingCode,
        currentStatus: 'Unknown',
        errorMessage: 'Missing RedX API credentials for tracking.'
      };
    }

    const authHeader = apiKey.startsWith('Bearer ') ? apiKey : `Bearer ${apiKey}`;

    try {
      const response = await fetch(`${baseUrl}/parcel/track/${encodeURIComponent(trackingCode)}`, {
        method: 'GET',
        headers: {
          'API-ACCESS-TOKEN': authHeader
        }
      });

      const data = await response.json().catch(() => null) as Record<string, unknown> | null;

      if (response.ok && data && data.tracking) {
        const tracking = data.tracking as Record<string, unknown>;
        return {
          success: true,
          provider: this.providerId,
          trackingCode,
          consignmentId: trackingCode,
          currentStatus: String(tracking.status || 'In Transit'),
          statusDetails: tracking.message ? String(tracking.message) : undefined,
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
        errorMessage: err instanceof Error ? err.message : 'Network error during RedX tracking'
      };
    }
  }

  /**
   * Test RedX API connection and credentials
   */
  async testConnection(
    config: ServerCourierConfig
  ): Promise<ServerCourierTestResult> {
    const baseUrl = (config.apiBaseUrl || this.defaultBaseUrl).replace(/\/+$/, '');
    const apiKey = (config.apiKey || '').trim();

    if (!apiKey) {
      return {
        success: false,
        provider: this.providerId,
        courierName: config.name || this.defaultName,
        message: 'RedX API Key / Access Token is required to test connection.',
        testedAt: new Date().toISOString()
      };
    }

    const authHeader = apiKey.startsWith('Bearer ') ? apiKey : `Bearer ${apiKey}`;

    try {
      // RedX pickup store check
      const response = await fetch(`${baseUrl}/pickup/stores`, {
        method: 'GET',
        headers: {
          'API-ACCESS-TOKEN': authHeader
        }
      });

      const data = await response.json().catch(() => null) as Record<string, unknown> | null;

      if (response.ok && data) {
        const storeCount = Array.isArray(data.pickup_stores) ? ` (${data.pickup_stores.length} Pickup Stores)` : '';
        return {
          success: true,
          provider: this.providerId,
          courierName: config.name || this.defaultName,
          message: `Connected successfully to RedX API${storeCount}`,
          statusCode: response.status,
          testedAt: new Date().toISOString()
        };
      }

      return {
        success: false,
        provider: this.providerId,
        courierName: config.name || this.defaultName,
        message: data?.message ? String(data.message) : `Authentication failed with RedX (HTTP ${response.status})`,
        statusCode: response.status,
        testedAt: new Date().toISOString()
      };
    } catch (err: unknown) {
      return {
        success: false,
        provider: this.providerId,
        courierName: config.name || this.defaultName,
        message: err instanceof Error ? err.message : 'Network failure during RedX connection test',
        testedAt: new Date().toISOString()
      };
    }
  }
}
