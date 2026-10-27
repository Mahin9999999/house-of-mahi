import { 
  CourierProviderId, 
  CourierServiceConfig, 
  CourierBookingPayload, 
  CourierBookingResult, 
  CourierTrackingResult, 
  Order 
} from '../types';
import { auth } from '../firebase/config';

/**
 * Default Courier Configurations for initial store seeding (zero client secrets)
 */
export const INITIAL_COURIER_CONFIGS: CourierServiceConfig[] = [
  {
    id: 'steadfast',
    name: 'Steadfast Courier',
    provider: 'steadfast',
    isActive: true,
    isDefault: true,
    priority: 1,
    apiKey: '',
    secretKey: '',
    apiBaseUrl: 'https://portal.packzy.com/api/v1',
    autoAssignOnConfirm: true,
    notes: 'Primary fast courier across Bangladesh with automated COD reconciliation.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'pathao',
    name: 'Pathao Courier',
    provider: 'pathao',
    isActive: true,
    isDefault: false,
    priority: 2,
    apiKey: '',
    secretKey: '',
    merchantId: '',
    apiBaseUrl: 'https://api-hermes.pathao.com',
    autoAssignOnConfirm: false,
    notes: 'Direct inside Dhaka city and nation-wide door-to-door network.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'redx',
    name: 'RedX Logistics',
    provider: 'redx',
    isActive: false,
    isDefault: false,
    priority: 3,
    apiKey: '',
    apiBaseUrl: 'https://openapi.redx.com.bd/v1.0.0-beta',
    autoAssignOnConfirm: false,
    notes: 'Nationwide logistics coverage with digital parcel tracking.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'paperfly',
    name: 'Paperfly Courier',
    provider: 'paperfly',
    isActive: false,
    isDefault: false,
    priority: 4,
    apiKey: '',
    apiBaseUrl: 'https://api.paperfly.com.bd',
    autoAssignOnConfirm: false,
    notes: 'Extensive doorstep delivery to union-level points.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'ecourier',
    name: 'eCourier',
    provider: 'ecourier',
    isActive: false,
    isDefault: false,
    priority: 5,
    apiKey: '',
    apiBaseUrl: 'https://backoffice.ecourier.com.bd/api',
    autoAssignOnConfirm: false,
    notes: 'Premium city delivery and tracking services.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'sundarban',
    name: 'Sundarban Courier Service',
    provider: 'sundarban',
    isActive: false,
    isDefault: false,
    priority: 6,
    apiKey: '',
    autoAssignOnConfirm: false,
    notes: 'Branch-to-branch parcel transport network.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

/**
 * Format Order into Standard Courier Booking Payload
 */
export function buildCourierPayloadFromOrder(order: Order): CourierBookingPayload {
  const isPrepaid = order.paymentStatus === 'paid';
  const codAmount = isPrepaid ? 0 : (order.total || 0);

  // Safe concatenation of full address
  const addressParts = [
    order.customer.address,
    order.customer.thana ? `Thana: ${order.customer.thana}` : '',
    order.customer.district || 'Dhaka'
  ].filter(Boolean);

  const fullAddress = addressParts.join(', ');

  // Calculate approximate total items
  const itemCount = order.items?.reduce((acc, item) => acc + (item.quantity || 1), 0) || 1;

  return {
    orderId: order.id,
    orderNumber: order.orderNumber || order.id,
    recipientName: order.customer.name || 'Valued Customer',
    recipientPhone: order.customer.phone || '',
    recipientAddress: fullAddress,
    recipientDistrict: order.customer.district || 'Dhaka',
    recipientThana: order.customer.thana,
    codAmount: Math.max(0, Math.round(codAmount)),
    parcelWeightKg: 0.5,
    parcelNote: order.customer.note ? `Note: ${order.customer.note}` : 'Houseofmahi Luxury Parcel - Handle with care',
    itemCount
  };
}

/**
 * Helper to get fresh Bearer ID Token from current Firebase Admin user
 */
async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      if (token) {
        return { 'Authorization': `Bearer ${token}` };
      }
    }
  } catch (err) {
    console.warn('Failed to retrieve Firebase ID Token for courier API request:', err);
  }
  return {};
}

/**
 * Courier Adapter Interface for compatibility with UI components
 */
export interface ICourierAdapter {
  provider: CourierProviderId;
  createOrder(payload: CourierBookingPayload, config: CourierServiceConfig): Promise<CourierBookingResult>;
  trackOrder(trackingCode: string, config: CourierServiceConfig): Promise<CourierTrackingResult>;
  testConnection(config: CourierServiceConfig): Promise<{ success: boolean; message: string }>;
}

/**
 * Backend-Only Courier Proxy Adapter:
 * Routes all operations strictly through Express server endpoints (/api/courier/*).
 * Zero direct browser API calls to courier gateways.
 */
class BackendCourierProxyAdapter implements ICourierAdapter {
  provider: CourierProviderId;

  constructor(provider: CourierProviderId) {
    this.provider = provider;
  }

  async createOrder(payload: CourierBookingPayload, config: CourierServiceConfig): Promise<CourierBookingResult> {
    try {
      const authHeaders = await getAuthHeader();
      const response = await fetch('/api/courier/dispatch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({
          payload,
          configs: [config],
          preferredProvider: config.provider
        })
      });

      const data = await response.json().catch(() => null);

      if (response.ok && data?.success && data.booking) {
        return data.booking as CourierBookingResult;
      }

      if (data?.booking && data.booking.status === 'failed') {
        return data.booking as CourierBookingResult;
      }

      return {
        success: false,
        provider: this.provider,
        courierName: config.name,
        status: 'failed',
        errorMessage: data?.error || data?.message || 'Courier service is temporarily unavailable. Please retry.'
      };
    } catch {
      return {
        success: false,
        provider: this.provider,
        courierName: config.name,
        status: 'failed',
        errorMessage: 'Courier service is temporarily unavailable. Please retry.'
      };
    }
  }

  async trackOrder(trackingCode: string, config: CourierServiceConfig): Promise<CourierTrackingResult> {
    return trackCourierOrderViaServer(trackingCode, config);
  }

  async testConnection(config: CourierServiceConfig): Promise<{ success: boolean; message: string }> {
    return testCourierConnectionViaServer(config);
  }
}

/**
 * Factory providing secure backend-proxy adapter
 */
export function getCourierAdapter(provider: CourierProviderId): ICourierAdapter {
  return new BackendCourierProxyAdapter(provider);
}

/**
 * Generate OAuth 2.0 Access Token strictly via Server-Side API endpoint (/api/courier/generate-token)
 */
export async function generateCourierTokenViaServer(
  config: CourierServiceConfig
): Promise<{ 
  success: boolean; 
  accessToken?: string; 
  refreshToken?: string; 
  expiresIn?: number; 
  message?: string;
  error?: string;
}> {
  try {
    const authHeaders = await getAuthHeader();
    const response = await fetch('/api/courier/generate-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders
      },
      body: JSON.stringify({ config })
    });

    const data = await response.json().catch(() => null);

    if (response.ok && data?.success && data.accessToken) {
      return {
        success: true,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresIn: data.expiresIn,
        message: data.message || 'OAuth 2.0 Access Token সফলভাবে জেনারেট হয়েছে।'
      };
    }

    const errorMsg = data?.error || data?.message || `টোকেন জেনারেশন ব্যর্থ হয়েছে (HTTP ${response.status})`;
    return {
      success: false,
      error: errorMsg,
      message: errorMsg
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'সার্ভারের সাথে সংযোগ স্থাপন করা সম্ভব হয়নি।';
    return {
      success: false,
      error: message,
      message: message
    };
  }
}

/**
 * Test courier connection strictly via Server-Side API endpoint (/api/courier/test-connection)
 */
export async function testCourierConnectionViaServer(
  config: CourierServiceConfig
): Promise<{ success: boolean; message: string }> {
  try {
    const authHeaders = await getAuthHeader();
    const response = await fetch('/api/courier/test-connection', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders
      },
      body: JSON.stringify({ config })
    });

    const data = await response.json().catch(() => null);

    if (response.ok && data?.success) {
      return {
        success: true,
        message: data.message || 'Server verified courier connection successfully.'
      };
    }

    if (data?.message) {
      return { success: false, message: data.message };
    }

    return {
      success: false,
      message: 'Courier service is temporarily unavailable. Please retry.'
    };
  } catch {
    return {
      success: false,
      message: 'Courier service is temporarily unavailable. Please retry.'
    };
  }
}

/**
 * Track courier order strictly via Server-Side API endpoint (/api/courier/track)
 */
export async function trackCourierOrderViaServer(
  trackingCode: string,
  config: CourierServiceConfig
): Promise<CourierTrackingResult> {
  try {
    const authHeaders = await getAuthHeader();
    const response = await fetch('/api/courier/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders
      },
      body: JSON.stringify({ trackingCode, config })
    });

    const data = await response.json().catch(() => null);

    if (response.ok && data?.success && data.tracking) {
      return data.tracking as CourierTrackingResult;
    }

    return {
      success: false,
      provider: config.provider,
      trackingCode,
      currentStatus: 'Unavailable',
      statusDetails: data?.error || data?.message || 'Courier service is temporarily unavailable. Please retry.',
      lastUpdated: new Date().toISOString()
    };
  } catch {
    return {
      success: false,
      provider: config.provider,
      trackingCode,
      currentStatus: 'Unavailable',
      statusDetails: 'Courier service is temporarily unavailable. Please retry.',
      lastUpdated: new Date().toISOString()
    };
  }
}

/**
 * Core Orchestrator: Automatic Courier Booking via Backend Server Dispatch Only.
 * Zero client-side gateway calls and zero client-side fallback booking.
 */
export async function executeAutoCourierBooking(
  order: Order,
  couriers: CourierServiceConfig[],
  forcedCourierId?: string
): Promise<CourierBookingResult> {
  // 1. Duplicate Booking Protection Check
  if (order.courierConsignmentId || (order.trackingNumber && order.courierBookingStatus === 'booked')) {
    return {
      success: true,
      provider: (order.courierName?.toLowerCase().includes('steadfast') ? 'steadfast' : 'custom') as CourierProviderId,
      courierName: order.courierName || 'Assigned Courier',
      consignmentId: order.courierConsignmentId || order.trackingNumber,
      trackingCode: order.trackingNumber || order.courierConsignmentId,
      trackingUrl: order.courierTrackingUrl,
      status: 'booked',
      errorMessage: 'Order is already booked with a courier. Duplicate booking prevented.'
    };
  }

  // 2. Validate Order details
  if (!order.customer?.phone) {
    return {
      success: false,
      provider: 'custom',
      courierName: 'None',
      status: 'failed',
      errorMessage: 'Customer phone number is required for courier delivery booking.'
    };
  }

  const payload = buildCourierPayloadFromOrder(order);

  // 3. Filter Active Couriers and Sort by Priority
  let candidateCouriers = couriers.filter(c => c.isActive);

  if (forcedCourierId) {
    const specified = couriers.find(c => c.id === forcedCourierId);
    if (specified) {
      candidateCouriers = [specified];
    }
  }

  if (candidateCouriers.length === 0) {
    return {
      success: false,
      provider: 'custom',
      courierName: 'None',
      status: 'failed',
      errorMessage: 'No active courier service configured. Please enable at least one courier in Courier Management.'
    };
  }

  // Sort by priority ascending (1 = highest priority)
  candidateCouriers.sort((a, b) => a.priority - b.priority);

  // 4. Server-Side Dispatch Execution (Strictly Backend-Only)
  try {
    const authHeaders = await getAuthHeader();
    const preferredProvider = forcedCourierId ? candidateCouriers[0]?.provider : undefined;

    const serverRes = await fetch('/api/courier/dispatch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders
      },
      body: JSON.stringify({
        payload,
        configs: candidateCouriers,
        preferredProvider
      })
    });

    const serverData = await serverRes.json().catch(() => null);

    if (serverRes.ok && serverData?.success && serverData.booking) {
      return serverData.booking as CourierBookingResult;
    }

    if (serverData?.booking && serverData.booking.status === 'failed') {
      // Backend returned sanitized failure information
      return serverData.booking as CourierBookingResult;
    }

    return {
      success: false,
      provider: candidateCouriers[0]?.provider || 'custom',
      courierName: candidateCouriers[0]?.name || 'Courier',
      status: 'failed',
      errorMessage: serverData?.error || serverData?.message || 'Courier service is temporarily unavailable. Please retry.'
    };
  } catch (serverErr) {
    console.warn('Backend courier dispatch failed:', serverErr);
    return {
      success: false,
      provider: candidateCouriers[0]?.provider || 'custom',
      courierName: candidateCouriers[0]?.name || 'Courier',
      status: 'failed',
      errorMessage: 'Courier service is temporarily unavailable. Please retry.'
    };
  }
}
