import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { Order, MarketingPixelsConfig } from '../../src/types';

export const trackingRouter = Router();

// Helper: Secure SHA-256 Hashing for user data (PII compliance)
function hashSha256(value?: string | null): string | undefined {
  if (!value) return undefined;
  const clean = value.trim().toLowerCase();
  if (!clean) return undefined;
  return crypto.createHash('sha256').update(clean).digest('hex');
}

// Helper: Normalize and hash phone numbers for Meta CAPI
function hashPhone(phone?: string | null): string | undefined {
  if (!phone) return undefined;
  let digits = phone.replace(/\D/g, '');
  if (!digits) return undefined;
  // If Bangladesh local number (e.g. 017xxxxxxxx), prepend country code 88
  if (digits.startsWith('01') && digits.length === 11) {
    digits = '88' + digits;
  }
  return crypto.createHash('sha256').update(digits).digest('hex');
}

// Helper: Extract client IP address accurately from headers
function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    return forwarded[0].trim();
  }
  return req.socket?.remoteAddress || '';
}

/**
 * GET /api/tracking/status
 * Diagnostic endpoint to report server tracking readiness WITHOUT exposing secrets
 */
trackingRouter.get('/status', async (_req: Request, res: Response): Promise<void> => {
  try {
    const serverCapiToken = process.env.META_CAPI_ACCESS_TOKEN;
    const pixelId = process.env.META_PIXEL_ID;
    const testCode = process.env.META_TEST_EVENT_CODE;
    const ga4Secret = process.env.GA4_API_SECRET || process.env.GA4_MEASUREMENT_PROTOCOL_API_SECRET;
    const ga4MeasurementId = process.env.GA4_MEASUREMENT_ID;

    res.json({
      success: true,
      metaCapi: {
        isConfigured: Boolean(serverCapiToken && serverCapiToken.trim().length > 10),
        pixelIdConfigured: Boolean(pixelId && pixelId.trim().length > 0),
        testEventCodeConfigured: Boolean(testCode && testCode.trim().length > 0)
      },
      ga4MeasurementProtocol: {
        isConfigured: Boolean(ga4Secret && ga4Secret.trim().length > 5),
        measurementIdConfigured: Boolean(ga4MeasurementId && ga4MeasurementId.trim().length > 0)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to inspect tracking status' });
  }
});

/**
 * POST /api/tracking/purchase
 * Server-Side Purchase Tracking with:
 * 1. Validated Order Data (Directly payload-backed to avoid client-side Firestore gRPC permission locks)
 * 2. Meta Conversions API (CAPI) with Exact Deduplication event_id matching the browser
 * 3. Optional GA4 Server Fallback (only when explicitly requested, preventing double counting)
 */
trackingRouter.post('/purchase', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      orderId,
      orderData,
      eventId,
      fbp,
      fbc,
      clientSourceUrl,
      testEventCode,
      sendGa4Fallback,
      clientId,
      sessionId,
      config
    }: {
      orderId?: string;
      orderData?: Partial<Order>;
      eventId?: string;
      fbp?: string;
      fbc?: string;
      clientSourceUrl?: string;
      testEventCode?: string;
      sendGa4Fallback?: boolean;
      clientId?: string;
      sessionId?: string;
      config?: Partial<MarketingPixelsConfig>;
    } = req.body;

    // 1. Validate required order identity and payload
    const effectiveOrderId = orderId?.trim() || orderData?.orderNumber?.trim() || orderData?.id?.trim();
    if (!effectiveOrderId) {
      res.status(400).json({
        success: false,
        error: 'Missing order identifier for purchase tracking'
      });
      return;
    }

    const finalEventId = eventId || `order_${effectiveOrderId}`;

    // 2. Validate Order Information
    if (!orderData || typeof orderData.total !== 'number' || orderData.total <= 0) {
      res.status(400).json({
        success: false,
        error: `Invalid or missing order data for order "${effectiveOrderId}".`
      });
      return;
    }

    // 3. Verify Order Payment Status
    if (orderData.paymentStatus === 'refunded' || orderData.paymentDetails?.status === 'failed' || orderData.paymentDetails?.status === 'cancelled') {
      res.status(422).json({
        success: false,
        error: `Order "${effectiveOrderId}" has invalid status for purchase conversion (${orderData.paymentStatus}).`
      });
      return;
    }

    // Resolve marketing credentials (prioritizing secure environment variables, with fallback to config)
    const metaPixelId = (process.env.META_PIXEL_ID || config?.metaPixelId)?.trim();
    const metaCapiAccessToken = (process.env.META_CAPI_ACCESS_TOKEN || (config as any)?.metaCapiAccessToken)?.trim();
    const rawTestCode = (testEventCode || process.env.META_TEST_EVENT_CODE || config?.metaTestEventCode)?.trim() || '';
    const BLOCKED_TEST_CODES = new Set(['TEST12345', 'TEST42528', 'TEST']);
    const effectiveTestCode = BLOCKED_TEST_CODES.has(rawTestCode.toUpperCase()) ? undefined : (rawTestCode || undefined);

    const results: {
      metaCapi?: { sent: boolean; message: string; fbtraceId?: string };
      ga4Server?: { sent: boolean; message: string };
    } = {};

    // 4. DISPATCH TO META CONVERSIONS API (CAPI)
    if (metaPixelId && metaCapiAccessToken) {
      try {
        const clientIp = getClientIp(req);
        const userAgent = req.headers['user-agent'] || '';

        // Extract and hash customer PII securely
        const customer = orderData.customer || ({} as any);
        const hashedEmail = hashSha256(customer.email);
        const hashedPhoneVal = hashPhone(customer.phone);
        const nameParts = (customer.name || '').trim().split(/\s+/);
        const hashedFirstName = nameParts[0] ? hashSha256(nameParts[0]) : undefined;
        const hashedLastName = nameParts.length > 1 ? hashSha256(nameParts[nameParts.length - 1]) : undefined;
        const hashedCity = customer.district ? hashSha256(customer.district) : undefined;

        const orderItems = Array.isArray(orderData.items) ? orderData.items : [];

        const capiPayload = {
          data: [
            {
              event_name: 'Purchase',
              event_time: Math.floor(Date.now() / 1000),
              event_id: finalEventId, // EXACT SAME event_id as browser fbq('track', 'Purchase', ..., { eventID: event_id })
              event_source_url: clientSourceUrl || 'https://houseofmahibd.com/checkout',
              action_source: 'website',
              user_data: {
                em: hashedEmail ? [hashedEmail] : undefined,
                ph: hashedPhoneVal ? [hashedPhoneVal] : undefined,
                fn: hashedFirstName ? [hashedFirstName] : undefined,
                ln: hashedLastName ? [hashedLastName] : undefined,
                ct: hashedCity ? [hashedCity] : undefined,
                country: [hashSha256('bd')],
                client_ip_address: clientIp || undefined,
                client_user_agent: userAgent || undefined,
                fbp: fbp || undefined,
                fbc: fbc || undefined
              },
              custom_data: {
                currency: 'BDT',
                value: orderData.total,
                order_id: effectiveOrderId,
                content_type: 'product',
                contents: orderItems.map(item => ({
                  id: item.product?.id || 'item',
                  quantity: item.quantity || 1,
                  item_price: item.product?.price || 0
                })),
                num_items: orderItems.reduce((sum, item) => sum + (item.quantity || 1), 0)
              }
            }
          ],
          test_event_code: effectiveTestCode || undefined
        };

        const capiRes = await fetch(`https://graph.facebook.com/v19.0/${metaPixelId}/events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${metaCapiAccessToken}`
          },
          body: JSON.stringify(capiPayload)
        });

        const capiData = await capiRes.json().catch(() => ({})) as Record<string, any>;

        if (capiRes.ok) {
          results.metaCapi = {
            sent: true,
            message: `Event received by Meta CAPI (Events processed: ${capiData.events_received || 1})`,
            fbtraceId: capiData.fbtrace_id
          };
        } else {
          console.warn('[TrackingServer] Meta CAPI response warning:', capiData);
          results.metaCapi = {
            sent: false,
            message: capiData.error?.message || `HTTP ${capiRes.status}`
          };
        }
      } catch (err: any) {
        console.error('[TrackingServer] Failed to send Meta CAPI event:', err);
        results.metaCapi = {
          sent: false,
          message: err.message || 'Network exception connecting to Meta Graph API'
        };
      }
    } else {
      results.metaCapi = {
        sent: false,
        message: !metaPixelId ? 'Meta Pixel ID not configured' : 'Meta CAPI Access Token not configured on server'
      };
    }

    // 5. OPTIONAL GA4 MEASUREMENT PROTOCOL FALLBACK
    const ga4MeasurementId = (process.env.GA4_MEASUREMENT_ID || config?.ga4MeasurementId)?.trim();
    const ga4ApiSecret = (process.env.GA4_API_SECRET || process.env.GA4_MEASUREMENT_PROTOCOL_API_SECRET || (config as any)?.ga4ApiSecret)?.trim();

    if (sendGa4Fallback && ga4MeasurementId && ga4ApiSecret) {
      try {
        const orderItems = Array.isArray(orderData.items) ? orderData.items : [];
        const ga4Payload = {
          client_id: clientId || `server.${effectiveOrderId}`,
          events: [
            {
              name: 'purchase',
              params: {
                transaction_id: effectiveOrderId,
                value: orderData.total,
                currency: 'BDT',
                session_id: sessionId || undefined,
                items: orderItems.map(item => ({
                  item_id: item.product?.id || 'unknown',
                  item_name: item.product?.name || 'Item',
                  price: item.product?.price || 0,
                  quantity: item.quantity || 1
                }))
              }
            }
          ]
        };

        const ga4Res = await fetch(
          `https://www.google-analytics.com/mp/collect?measurement_id=${ga4MeasurementId}&api_secret=${ga4ApiSecret}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ga4Payload)
          }
        );

        results.ga4Server = {
          sent: ga4Res.ok,
          message: ga4Res.ok ? 'GA4 Measurement Protocol purchase sent successfully' : `HTTP ${ga4Res.status}`
        };
      } catch (err: any) {
        results.ga4Server = {
          sent: false,
          message: err.message || 'Failed to dispatch to GA4 Measurement Protocol'
        };
      }
    }

    res.json({
      success: true,
      orderId: effectiveOrderId,
      eventId: finalEventId,
      verifiedAmount: orderData.total,
      currency: 'BDT',
      results
    });
  } catch (err: any) {
    console.error('[TrackingServer] Unexpected error in /api/tracking/purchase:', err);
    res.status(500).json({
      success: false,
      error: 'Internal server error processing tracking event'
    });
  }
});

/**
 * POST /api/tracking/test-event
 * Diagnostic endpoint for admin testing of Meta CAPI connectivity
 */
trackingRouter.post('/test-event', async (req: Request, res: Response): Promise<void> => {
  try {
    const { testEventCode, eventName = 'ViewContent', config } = req.body;
    const metaPixelId = (process.env.META_PIXEL_ID || config?.metaPixelId)?.trim();
    const metaCapiAccessToken = (process.env.META_CAPI_ACCESS_TOKEN || (config as any)?.metaCapiAccessToken)?.trim();
    const rawTestCode = (testEventCode || process.env.META_TEST_EVENT_CODE || config?.metaTestEventCode)?.trim() || '';
    const BLOCKED_TEST_CODES = new Set(['TEST12345', 'TEST42528', 'TEST']);
    const effectiveTestCode = BLOCKED_TEST_CODES.has(rawTestCode.toUpperCase()) ? undefined : (rawTestCode || undefined);

    if (!metaPixelId || !metaCapiAccessToken) {
      res.status(400).json({
        success: false,
        error: 'Meta Pixel ID and CAPI Access Token must be configured to run test events.'
      });
      return;
    }

    const testPayload = {
      data: [
        {
          event_name: eventName,
          event_time: Math.floor(Date.now() / 1000),
          event_id: `test_${Date.now()}`,
          event_source_url: 'https://houseofmahibd.com/test-simulation',
          action_source: 'website',
          user_data: {
            client_ip_address: getClientIp(req),
            client_user_agent: req.headers['user-agent'] || 'Houseofmahi Diagnostic Client'
          },
          custom_data: {
            currency: 'BDT',
            value: 990.0,
            content_name: 'Test Diagnostic Item'
          }
        }
      ],
      test_event_code: effectiveTestCode || undefined
    };

    const response = await fetch(`https://graph.facebook.com/v19.0/${metaPixelId}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${metaCapiAccessToken}`
      },
      body: JSON.stringify(testPayload)
    });

    const data = await response.json().catch(() => ({})) as Record<string, any>;

    res.json({
      success: response.ok,
      statusCode: response.status,
      testEventCodeUsed: effectiveTestCode || null,
      response: data
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Test event failed' });
  }
});
