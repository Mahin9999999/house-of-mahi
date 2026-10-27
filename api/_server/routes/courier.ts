import { Router, Response } from 'express';
import { requireAdminAuth, AuthenticatedRequest } from '../middleware/auth';
import { courierManager } from '../courier/courierManager';
import { 
  ServerCourierBookingPayload, 
  ServerCourierConfig, 
  ServerCourierProviderId 
} from '../courier/types';

export const courierRouter = Router();

// Apply admin authentication to all courier endpoints
courierRouter.use(requireAdminAuth);

/**
 * GET /api/courier/providers
 * Returns list of registered/supported courier providers on this server
 */
courierRouter.get('/providers', (_req: AuthenticatedRequest, res: Response): void => {
  const providers = courierManager.getRegisteredProviders();
  res.json({
    success: true,
    providers
  });
});

/**
 * POST /api/courier/dispatch
 * Dispatches an order to the courier API (with priority fallback support)
 */
courierRouter.post('/dispatch', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { 
      payload, 
      configs, 
      preferredProvider 
    }: {
      payload?: ServerCourierBookingPayload;
      configs?: ServerCourierConfig[];
      preferredProvider?: ServerCourierProviderId;
    } = req.body;

    if (!payload || !payload.orderId || !payload.recipientPhone || !payload.recipientAddress) {
      res.status(400).json({
        success: false,
        error: 'Invalid payload: orderId, recipientPhone, and recipientAddress are required.'
      });
      return;
    }

    if (!configs || !Array.isArray(configs) || configs.length === 0) {
      res.status(400).json({
        success: false,
        error: 'No active courier configurations provided in request.'
      });
      return;
    }

    const dispatchResult = await courierManager.dispatchBooking(
      payload,
      configs,
      preferredProvider
    );

    if (dispatchResult.result.success) {
      res.status(200).json({
        success: true,
        message: `Successfully booked with ${dispatchResult.result.courierName}`,
        booking: dispatchResult.result,
        attempts: dispatchResult.attempts
      });
    } else {
      res.status(422).json({
        success: false,
        error: dispatchResult.result.errorMessage || 'Failed to dispatch parcel to courier.',
        booking: dispatchResult.result,
        attempts: dispatchResult.attempts
      });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error while processing courier dispatch.';
    res.status(500).json({
      success: false,
      error: message
    });
  }
});

/**
 * POST /api/courier/generate-token
 * Generates an OAuth 2.0 Access Token for couriers that support password/OAuth flow (e.g. Pathao)
 */
courierRouter.post('/generate-token', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { config }: { config?: ServerCourierConfig } = req.body;

    if (!config || !config.provider) {
      res.status(400).json({
        success: false,
        error: 'Valid courier configuration object with provider is required.'
      });
      return;
    }

    if (config.provider === 'pathao') {
      const clientId = (config.apiKey || '').trim();
      const clientSecret = (config.secretKey || '').trim();
      const username = (config.merchantId || '').trim();
      const password = (config.webhookSecret || '').trim();
      const baseUrl = (config.apiBaseUrl || 'https://api-hermes.pathao.com').replace(/\/+$/, '');

      if (!clientId || !clientSecret) {
        res.status(400).json({
          success: false,
          error: 'Pathao Client ID এবং Client Secret আবশ্যক।'
        });
        return;
      }

      if (!username || !password) {
        res.status(400).json({
          success: false,
          error: 'Pathao Username/Email এবং Password আবশ্যক।'
        });
        return;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

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
        res.status(200).json({
          success: true,
          accessToken: tokenData.access_token,
          refreshToken: typeof tokenData.refresh_token === 'string' ? tokenData.refresh_token : undefined,
          expiresIn: typeof tokenData.expires_in === 'number' ? tokenData.expires_in : undefined,
          tokenType: typeof tokenData.token_type === 'string' ? tokenData.token_type : 'Bearer',
          message: 'Pathao OAuth 2.0 Access Token সফলভাবে জেনারেট হয়েছে।'
        });
        return;
      }

      const errorMsg = tokenData?.message || tokenData?.error_description || tokenData?.error || `Pathao Authentication failed (HTTP ${tokenRes.status})`;
      res.status(401).json({
        success: false,
        error: String(errorMsg)
      });
      return;
    }

    res.status(400).json({
      success: false,
      error: `Token generation is not applicable for provider "${config.provider}".`
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error while generating courier token.';
    res.status(500).json({
      success: false,
      error: message
    });
  }
});

/**
 * POST /api/courier/test-connection
 * Tests API connection and credentials for a specific courier configuration
 */
courierRouter.post('/test-connection', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { config }: { config?: ServerCourierConfig } = req.body;

    if (!config || !config.provider) {
      res.status(400).json({
        success: false,
        error: 'Valid courier configuration object with provider is required.'
      });
      return;
    }

    const testResult = await courierManager.testCourierConnection(config);

    if (testResult.success) {
      res.status(200).json({
        success: true,
        message: testResult.message,
        statusCode: testResult.statusCode,
        testedAt: testResult.testedAt
      });
    } else {
      res.status(400).json({
        success: false,
        message: testResult.message,
        statusCode: testResult.statusCode,
        testedAt: testResult.testedAt
      });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error while testing courier connection.';
    res.status(500).json({
      success: false,
      error: message
    });
  }
});

/**
 * POST /api/courier/track
 * Tracks an order status using the given courier config and tracking code
 */
courierRouter.post('/track', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { 
      trackingCode, 
      config 
    }: { 
      trackingCode?: string; 
      config?: ServerCourierConfig 
    } = req.body;

    if (!trackingCode || !config) {
      res.status(400).json({
        success: false,
        error: 'trackingCode and config are required for tracking.'
      });
      return;
    }

    const trackingResult = await courierManager.trackBooking(trackingCode, config);

    res.status(trackingResult.success ? 200 : 400).json({
      success: trackingResult.success,
      tracking: trackingResult
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error while tracking courier status.';
    res.status(500).json({
      success: false,
      error: message
    });
  }
});
