import { 
  ICourierAdapter, 
  ServerCourierConfig, 
  ServerCourierBookingPayload, 
  ServerCourierBookingResult, 
  ServerCourierTrackingResult, 
  ServerCourierTestResult 
} from '../types';

/**
 * Steadfast Courier Server Adapter
 * Direct Server-to-Server communication with Steadfast API (portal.packzy.com)
 * Handles consignment creation, status tracking, and connection tests.
 */
export class SteadfastServerAdapter implements ICourierAdapter {
  readonly providerId = 'steadfast' as const;
  readonly defaultName = 'Steadfast Courier';
  readonly defaultBaseUrl = 'https://portal.packzy.com/api/v1';

  /**
   * Book an order parcel with Steadfast Courier API
   */
  async bookOrder(
    payload: ServerCourierBookingPayload,
    config: ServerCourierConfig
  ): Promise<ServerCourierBookingResult> {
    const baseUrl = (config.apiBaseUrl || this.defaultBaseUrl).replace(/\/+$/, '');
    const apiKey = (config.apiKey || '').trim();
    const secretKey = (config.secretKey || '').trim();

    if (!apiKey || !secretKey) {
      return {
        success: false,
        provider: this.providerId,
        courierName: config.name || this.defaultName,
        status: 'failed',
        errorMessage: 'Steadfast API Key or Secret Key is missing in courier configuration.'
      };
    }

    const requestBody = {
      invoice: payload.orderNumber || payload.orderId,
      recipient_name: payload.recipientName,
      recipient_phone: payload.recipientPhone,
      recipient_address: payload.recipientAddress,
      cod_amount: payload.codAmount,
      note: payload.parcelNote || 'Houseofmahi Package'
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    try {
      const response = await fetch(`${baseUrl}/create_order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Api-Key': apiKey,
          'Secret-Key': secretKey
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const data = await response.json().catch(() => null) as Record<string, unknown> | null;

      if (response.ok && data && (data.status === 200 || data.status === 201) && data.consignment) {
        const consignment = data.consignment as Record<string, unknown>;
        const consignmentId = String(consignment.consignment_id || consignment.id || '');
        const trackingCode = String(consignment.tracking_code || consignmentId);
        const trackingUrl = `https://portal.packzy.com/tracking?tracking_code=${encodeURIComponent(trackingCode)}`;

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

      // Handle Steadfast specific error format
      let errorDetails = `Steadfast returned status ${response.status}`;
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
        ? 'Connection to Steadfast timed out after 15 seconds.' 
        : (err instanceof Error ? err.message : 'Unknown network failure communicating with Steadfast.');

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
   * Track an order via Steadfast status API
   */
  async trackOrder(
    trackingCode: string,
    config: ServerCourierConfig
  ): Promise<ServerCourierTrackingResult> {
    const baseUrl = (config.apiBaseUrl || this.defaultBaseUrl).replace(/\/+$/, '');
    const apiKey = (config.apiKey || '').trim();
    const secretKey = (config.secretKey || '').trim();

    if (!apiKey || !secretKey) {
      return {
        success: false,
        provider: this.providerId,
        trackingCode,
        currentStatus: 'Unknown',
        errorMessage: 'Missing API credentials for tracking.'
      };
    }

    try {
      const response = await fetch(`${baseUrl}/status_by_trackingcode/${encodeURIComponent(trackingCode)}`, {
        method: 'GET',
        headers: {
          'Api-Key': apiKey,
          'Secret-Key': secretKey
        }
      });

      const data = await response.json().catch(() => null) as Record<string, unknown> | null;

      if (response.ok && data && data.status === 200) {
        return {
          success: true,
          provider: this.providerId,
          trackingCode,
          consignmentId: data.consignment_id ? String(data.consignment_id) : undefined,
          currentStatus: String(data.delivery_status || 'In Transit'),
          statusDetails: `Payment: ${data.payment_status || 'Pending'}`,
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
        errorMessage: err instanceof Error ? err.message : 'Network error during tracking'
      };
    }
  }

  /**
   * Test Steadfast API credentials
   */
  async testConnection(
    config: ServerCourierConfig
  ): Promise<ServerCourierTestResult> {
    const baseUrl = (config.apiBaseUrl || this.defaultBaseUrl).replace(/\/+$/, '');
    const apiKey = (config.apiKey || '').trim();
    const secretKey = (config.secretKey || '').trim();

    if (!apiKey || !secretKey) {
      return {
        success: false,
        provider: this.providerId,
        courierName: config.name || this.defaultName,
        message: 'API Key and Secret Key are required to test connection.',
        testedAt: new Date().toISOString()
      };
    }

    try {
      // Steadfast balance check endpoint: GET /get_balance
      const response = await fetch(`${baseUrl}/get_balance`, {
        method: 'GET',
        headers: {
          'Api-Key': apiKey,
          'Secret-Key': secretKey
        }
      });

      const data = await response.json().catch(() => null) as Record<string, unknown> | null;

      if (response.ok && data && (data.status === 200 || data.status === 201)) {
        const balance = data.current_balance !== undefined ? ` (Current Balance: ৳${data.current_balance})` : '';
        return {
          success: true,
          provider: this.providerId,
          courierName: config.name || this.defaultName,
          message: `Connected successfully to Steadfast API${balance}`,
          statusCode: response.status,
          testedAt: new Date().toISOString()
        };
      }

      return {
        success: false,
        provider: this.providerId,
        courierName: config.name || this.defaultName,
        message: data?.message ? String(data.message) : `Authentication failed (HTTP ${response.status})`,
        statusCode: response.status,
        testedAt: new Date().toISOString()
      };
    } catch (err: unknown) {
      return {
        success: false,
        provider: this.providerId,
        courierName: config.name || this.defaultName,
        message: err instanceof Error ? err.message : 'Network failure during Steadfast test',
        testedAt: new Date().toISOString()
      };
    }
  }
}
