/**
 * Server-Side Courier Types & Contracts
 * Strongly-typed interfaces for Courier Adapters, Priority Dispatch, and Tracking
 * Fully compatible with existing Houseofmahi order structures and courier configurations.
 */

export type ServerCourierProviderId = 
  | 'steadfast' 
  | 'pathao' 
  | 'redx' 
  | 'paperfly' 
  | 'ecourier' 
  | 'sundarban' 
  | 'custom';

export type ServerCourierBookingStatus = 'unbooked' | 'booking_in_progress' | 'booked' | 'failed';

export interface ServerCourierConfig {
  id: string;
  name: string;
  provider: ServerCourierProviderId;
  isActive: boolean;
  isDefault: boolean;
  priority: number; // 1 = highest priority, 2, 3, etc.
  apiKey: string;
  secretKey?: string;
  apiBaseUrl?: string;
  merchantId?: string;
  webhookSecret?: string;
  senderName?: string;
  senderPhone?: string;
  senderAddress?: string;
  autoAssignOnConfirm: boolean;
  notes?: string;
  lastTestedAt?: string;
  lastTestStatus?: 'success' | 'failed';
  lastTestMessage?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ServerCourierBookingPayload {
  orderId: string;
  orderNumber: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  recipientDistrict: string;
  recipientThana?: string;
  codAmount: number; // 0 for prepaid, or total order amount for COD
  parcelWeightKg?: number;
  parcelNote?: string;
  itemCount?: number;
}

export interface ServerCourierBookingResult {
  success: boolean;
  provider: ServerCourierProviderId;
  courierName: string;
  consignmentId?: string;
  trackingCode?: string;
  trackingUrl?: string;
  status: 'booked' | 'failed' | 'pending';
  errorMessage?: string;
  statusCode?: number;
  rawResponse?: Record<string, unknown>;
}

export interface ServerCourierTrackingHistoryItem {
  status: string;
  timestamp: string;
  note?: string;
}

export interface ServerCourierTrackingResult {
  success: boolean;
  provider: ServerCourierProviderId;
  trackingCode: string;
  consignmentId?: string;
  currentStatus: string;
  statusDetails?: string;
  location?: string;
  lastUpdated?: string;
  history?: ServerCourierTrackingHistoryItem[];
  errorMessage?: string;
}

export interface ServerCourierTestResult {
  success: boolean;
  provider: ServerCourierProviderId;
  courierName: string;
  message: string;
  statusCode?: number;
  testedAt: string;
}

/**
 * Standard Adapter Interface for all Courier Providers
 * Any provider (Steadfast, Pathao, RedX, etc.) must implement this interface.
 */
export interface ICourierAdapter {
  readonly providerId: ServerCourierProviderId;
  readonly defaultName: string;
  readonly defaultBaseUrl: string;

  /**
   * Book a parcel/shipment with the courier provider API
   */
  bookOrder(
    payload: ServerCourierBookingPayload, 
    config: ServerCourierConfig
  ): Promise<ServerCourierBookingResult>;

  /**
   * Track a shipment status using trackingCode or consignmentId
   */
  trackOrder?(
    trackingCode: string, 
    config: ServerCourierConfig
  ): Promise<ServerCourierTrackingResult>;

  /**
   * Verify API credentials / test connection with the courier
   */
  testConnection?(
    config: ServerCourierConfig
  ): Promise<ServerCourierTestResult>;
}

/**
 * HTTP Request/Response Payloads for Express API endpoints
 */
export interface DispatchOrderRequest {
  orderId: string;
  specificCarrier?: ServerCourierProviderId;
  customConfig?: Partial<ServerCourierConfig>;
}

export interface DispatchOrderResponse {
  success: boolean;
  message: string;
  orderId: string;
  orderNumber?: string;
  courierName?: string;
  provider?: ServerCourierProviderId;
  consignmentId?: string;
  trackingCode?: string;
  trackingUrl?: string;
  status?: string;
  error?: string;
  attemptedProviders?: {
    provider: ServerCourierProviderId;
    success: boolean;
    error?: string;
  }[];
}

export interface TestCourierConfigRequest {
  config: ServerCourierConfig;
}

export interface TestCourierConfigResponse {
  success: boolean;
  message: string;
  provider: ServerCourierProviderId;
  testedAt: string;
}
