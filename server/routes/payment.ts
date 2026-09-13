import { Router, Request, Response } from 'express';
import { BkashAdapter } from '../payment/adapters/bkash';
import { NagadAdapter } from '../payment/adapters/nagad';
import { CardGatewayAdapter } from '../payment/adapters/card';
import { paymentConfigStore, PaymentGatewayType } from '../payment/configStore';

const router = Router();

const bkashAdapter = new BkashAdapter();
const nagadAdapter = new NagadAdapter();
const cardAdapter = new CardGatewayAdapter();

function getAdapter(gateway: string) {
  switch (gateway.toLowerCase()) {
    case 'bkash':
      return bkashAdapter;
    case 'nagad':
      return nagadAdapter;
    case 'card':
    case 'sslcommerz':
      return cardAdapter;
    default:
      return null;
  }
}

/**
 * GET /api/payment/gateways/status
 * Public / Checkout endpoint checking which gateways are enabled & configured
 */
router.get('/gateways/status', (req: Request, res: Response) => {
  try {
    const metadata = paymentConfigStore.getAllGatewaysMetadata();
    const status = {
      bkash: {
        isConfigured: metadata.bkash?.isConfigured || false,
        isSandbox: metadata.bkash?.isSandbox || false,
        isEnabled: metadata.bkash?.isEnabled || false,
        missingKeys: metadata.bkash?.missingFields || []
      },
      nagad: {
        isConfigured: metadata.nagad?.isConfigured || false,
        isSandbox: metadata.nagad?.isSandbox || false,
        isEnabled: metadata.nagad?.isEnabled || false,
        missingKeys: metadata.nagad?.missingFields || []
      },
      card: {
        isConfigured: metadata.card?.isConfigured || false,
        isSandbox: metadata.card?.isSandbox || false,
        isEnabled: metadata.card?.isEnabled || false,
        missingKeys: metadata.card?.missingFields || []
      },
      cod: {
        isConfigured: true,
        isSandbox: false,
        isEnabled: metadata.cod?.isEnabled !== false,
        missingKeys: []
      }
    };
    return res.json({ success: true, status });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/payment/config
 * Admin Panel endpoint to view safe metadata for all gateways (no plain secrets)
 */
router.get('/config', (req: Request, res: Response) => {
  try {
    const metadata = paymentConfigStore.getAllGatewaysMetadata();
    return res.json({ success: true, gateways: metadata });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/payment/admin/configure-gateway
 * Unified Admin Endpoint to securely save and encrypt gateway credentials
 */
router.post('/admin/configure-gateway', (req: Request, res: Response) => {
  try {
    const { gatewayId, credentials = {}, isSandbox, isEnabled, adminId, adminEmail } = req.body;
    const gId = (gatewayId || '').toLowerCase();
    const adminUser = adminId || 'admin';
    const adminMail = adminEmail || 'admin@houseofmahi.com';

    if (!gId) {
      return res.status(400).json({ success: false, message: 'gatewayId is required' });
    }

    if (gId === 'bkash') {
      paymentConfigStore.saveBkashConfig(
        {
          appKey: credentials.appKey || credentials.BKASH_APP_KEY,
          appSecret: credentials.appSecret || credentials.BKASH_APP_SECRET,
          username: credentials.username || credentials.BKASH_USERNAME,
          password: credentials.password || credentials.BKASH_PASSWORD,
          isSandbox: typeof isSandbox === 'boolean' ? isSandbox : true,
          isEnabled: typeof isEnabled === 'boolean' ? isEnabled : true
        },
        adminUser,
        adminMail
      );
    } else if (gId === 'nagad') {
      paymentConfigStore.saveNagadConfig(
        {
          merchantId: credentials.merchantId || credentials.NAGAD_MERCHANT_ID,
          pgPublicKey: credentials.pgPublicKey || credentials.NAGAD_PG_PUBLIC_KEY,
          merchantPrivateKey: credentials.merchantPrivateKey || credentials.NAGAD_MERCHANT_PRIVATE_KEY,
          isSandbox: typeof isSandbox === 'boolean' ? isSandbox : true,
          isEnabled: typeof isEnabled === 'boolean' ? isEnabled : true
        },
        adminUser,
        adminMail
      );
    } else if (gId === 'card' || gId === 'sslcommerz') {
      paymentConfigStore.saveSSLCommerzConfig(
        {
          storeId: credentials.storeId || credentials.SSLCOMMERZ_STORE_ID,
          storePassword: credentials.storePassword || credentials.SSLCOMMERZ_STORE_PASSWORD,
          isSandbox: typeof isSandbox === 'boolean' ? isSandbox : true,
          isEnabled: typeof isEnabled === 'boolean' ? isEnabled : true
        },
        adminUser,
        adminMail
      );
    }

    const updatedMetadata = paymentConfigStore.getAllGatewaysMetadata();
    return res.json({
      success: true,
      message: `${gId.toUpperCase()} credentials encrypted and securely saved.`,
      gateways: updatedMetadata
    });
  } catch (error: any) {
    console.error('[Payment Admin Configure Error]:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to save gateway configuration.' });
  }
});

/**
 * POST /api/payment/config/:gateway
 * Admin Panel endpoint to save and encrypt merchant credentials securely
 */
router.post('/config/:gateway', (req: Request, res: Response) => {
  try {
    const { gateway } = req.params;
    const body = req.body;
    const adminId = body.adminId || 'admin';
    const adminEmail = body.adminEmail || 'admin@houseofmahi.com';

    switch (gateway.toLowerCase()) {
      case 'bkash':
        paymentConfigStore.saveBkashConfig(
          {
            appKey: body.appKey,
            appSecret: body.appSecret,
            username: body.username,
            password: body.password,
            isSandbox: body.isSandbox,
            isEnabled: body.isEnabled
          },
          adminId,
          adminEmail
        );
        break;

      case 'nagad':
        paymentConfigStore.saveNagadConfig(
          {
            merchantId: body.merchantId,
            pgPublicKey: body.pgPublicKey,
            merchantPrivateKey: body.merchantPrivateKey,
            isSandbox: body.isSandbox,
            isEnabled: body.isEnabled
          },
          adminId,
          adminEmail
        );
        break;

      case 'card':
      case 'sslcommerz':
        paymentConfigStore.saveSSLCommerzConfig(
          {
            storeId: body.storeId,
            storePassword: body.storePassword,
            isSandbox: body.isSandbox,
            isEnabled: body.isEnabled
          },
          adminId,
          adminEmail
        );
        break;

      default:
        return res.status(400).json({ success: false, message: `Unknown gateway type: ${gateway}` });
    }

    const updatedMetadata = paymentConfigStore.getAllGatewaysMetadata();
    return res.json({
      success: true,
      message: `${gateway.toUpperCase()} configuration encrypted and saved successfully.`,
      gateways: updatedMetadata
    });
  } catch (error: any) {
    console.error('[Payment Route Error - save config]:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to save configuration.' });
  }
});

/**
 * POST /api/payment/config/:gateway/toggle
 * Toggle enabled / disabled or sandbox / live mode
 */
router.post('/config/:gateway/toggle', (req: Request, res: Response) => {
  try {
    const { gateway } = req.params as { gateway: PaymentGatewayType };
    const { isEnabled, isSandbox, adminId, adminEmail } = req.body;

    paymentConfigStore.updateGatewayState(
      gateway,
      { isEnabled, isSandbox },
      adminId || 'admin',
      adminEmail
    );

    const updatedMetadata = paymentConfigStore.getAllGatewaysMetadata();
    return res.json({
      success: true,
      message: `Gateway ${gateway} settings updated.`,
      gateways: updatedMetadata
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/payment/gateways/toggle
 * Toggle gateway state from unified service caller
 */
router.post('/gateways/toggle', (req: Request, res: Response) => {
  try {
    const { gatewayId, isEnabled, isSandbox } = req.body;
    const rawId = (gatewayId || '').toLowerCase();

    if (['bkash', 'nagad', 'card', 'sslcommerz', 'cod'].includes(rawId)) {
      const targetGateway: PaymentGatewayType = rawId === 'sslcommerz' ? 'card' : (rawId as PaymentGatewayType);
      paymentConfigStore.updateGatewayState(
        targetGateway,
        { isEnabled, isSandbox },
        'admin',
        'admin@houseofmahi.com'
      );
    }

    return res.json({ success: true, message: `Gateway ${gatewayId} status updated.` });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/payment/config/:gateway/test
 * Test API connectivity with configured merchant credentials
 */
router.post('/config/:gateway/test', async (req: Request, res: Response) => {
  try {
    const { gateway } = req.params;
    const adapter = getAdapter(gateway);

    if (!adapter) {
      return res.status(400).json({ success: false, message: `Unknown gateway: ${gateway}` });
    }

    if (!adapter.testConnection) {
      return res.status(400).json({ success: false, message: `Test connection not supported for ${gateway}` });
    }

    const testResult = await adapter.testConnection();
    return res.json(testResult);
  } catch (error: any) {
    console.error('[Payment Route Error - test connection]:', error);
    return res.status(500).json({ success: false, message: error.message || 'Connection test failed.' });
  }
});

/**
 * GET /api/payment/config/audit-logs
 * Retrieve security audit logs of gateway credential changes
 */
router.get('/config-audit-logs', (req: Request, res: Response) => {
  try {
    const logs = paymentConfigStore.getAuditLogs(50);
    return res.json({ success: true, logs });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/payment/create-session
 * Initiate a payment session for an order
 */
router.post('/create-session', async (req: Request, res: Response) => {
  try {
    const { orderId, orderNumber, amount, paymentMethod, customer, callbackUrl } = req.body;

    if (!orderId || !orderNumber || !amount || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields (orderId, orderNumber, amount, paymentMethod).'
      });
    }

    if (paymentMethod === 'cod') {
      return res.json({
        success: true,
        status: 'completed',
        message: 'Cash on Delivery selected. No gateway redirect required.'
      });
    }

    const adapter = getAdapter(paymentMethod);
    if (!adapter) {
      return res.status(400).json({
        success: false,
        message: `Unsupported automated payment gateway: ${paymentMethod}`
      });
    }

    const result = await adapter.createPaymentSession({
      orderId,
      orderNumber,
      amount: parseFloat(amount),
      currency: 'BDT',
      customer: customer || { name: '', phone: '', address: '' },
      callbackUrl
    });

    return res.json(result);
  } catch (error: any) {
    console.error('[Payment Route Error - create-session]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error while creating payment session.'
    });
  }
});

/**
 * POST /api/payment/verify
 * Strict server-side verification of payment before marking order as paid
 */
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { orderId, paymentMethod, paymentId, gatewayPaymentId, transactionId, expectedAmount } = req.body;

    if (!orderId || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Missing orderId or paymentMethod for verification.'
      });
    }

    if (paymentMethod === 'cod') {
      return res.json({
        success: true,
        isPaid: false,
        status: 'pending',
        amount: expectedAmount || 0,
        currency: 'BDT',
        message: 'COD orders are marked as unpaid until courier cash delivery.'
      });
    }

    const adapter = getAdapter(paymentMethod);
    if (!adapter) {
      return res.status(400).json({
        success: false,
        message: `Unsupported automated payment gateway: ${paymentMethod}`
      });
    }

    const result = await adapter.verifyPayment({
      orderId,
      paymentId,
      gatewayPaymentId,
      transactionId,
      expectedAmount: parseFloat(expectedAmount || '0')
    });

    return res.json(result);
  } catch (error: any) {
    console.error('[Payment Route Error - verify]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error while verifying payment.'
    });
  }
});

/**
 * POST /api/payment/refund
 * Admin-triggered gateway refund
 */
router.post('/refund', async (req: Request, res: Response) => {
  try {
    const { paymentMethod, paymentId, transactionId, amount, reason } = req.body;

    if (!paymentMethod || !transactionId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Missing required refund fields (paymentMethod, transactionId, amount).'
      });
    }

    const adapter = getAdapter(paymentMethod);
    if (!adapter || !adapter.refundPayment) {
      return res.status(400).json({
        success: false,
        message: `Refund is not supported via API for gateway: ${paymentMethod}`
      });
    }

    const result = await adapter.refundPayment({
      paymentId: paymentId || '',
      transactionId,
      amount: parseFloat(amount),
      reason: reason || 'Merchant Refund'
    });

    return res.json(result);
  } catch (error: any) {
    console.error('[Payment Route Error - refund]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error while executing refund.'
    });
  }
});

/**
 * POST /api/payment/webhook/:gateway
 * Gateway Webhooks / IPN (Instant Payment Notification) with signature and status validation
 */
router.all('/webhook/:gateway', async (req: Request, res: Response) => {
  try {
    const { gateway } = req.params;
    const body = req.body || {};
    const query = req.query || {};

    console.log(`[Payment Webhook/IPN received for ${gateway}]:`, { body, query });

    // Handle gateway-specific IPN validation
    if (gateway.toLowerCase() === 'sslcommerz' || gateway.toLowerCase() === 'card') {
      const valId = body.val_id || query.val_id;
      const tranId = body.tran_id || query.tran_id;
      const amount = body.amount || query.amount;

      if (valId && cardAdapter) {
        const verifyRes = await cardAdapter.verifyPayment({
          orderId: tranId,
          gatewayPaymentId: valId,
          expectedAmount: parseFloat(amount || '0')
        });
        return res.json({ success: true, verified: verifyRes.isPaid, status: verifyRes.status });
      }
    } else if (gateway.toLowerCase() === 'bkash') {
      const paymentID = body.paymentID || query.paymentID;
      const status = body.status || query.status;

      if (paymentID && bkashAdapter) {
        if (status === 'success') {
          const execRes = await bkashAdapter.verifyPayment({
            orderId: body.orderId || '',
            paymentId: paymentID,
            expectedAmount: parseFloat(body.amount || '0')
          });
          return res.json({ success: true, verified: execRes.isPaid, status: execRes.status });
        }
      }
    }

    return res.json({ success: true, message: `IPN received for ${gateway}` });
  } catch (error: any) {
    console.error('[Payment Webhook Error]:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Gateway Callbacks (bKash / Nagad / SSLCommerz return URLs)
 */
router.all('/callback/:gateway', async (req: Request, res: Response) => {
  const { gateway } = req.params;
  const query = req.query;
  const body = req.body;

  // Combine query and body params
  const paymentID = (query.paymentID || body.paymentID || query.val_id || body.val_id || query.payment_ref_id || body.payment_ref_id || '') as string;
  const status = (query.status || body.status || '') as string;
  const orderId = (query.orderId || body.orderId || query.tran_id || body.tran_id || '') as string;

  const appUrl = process.env.APP_URL || '';
  const redirectTarget = `${appUrl}/?payment_status=${encodeURIComponent(status)}&gateway=${encodeURIComponent(gateway)}&payment_id=${encodeURIComponent(paymentID)}&order_id=${encodeURIComponent(orderId)}`;

  return res.redirect(redirectTarget);
});

export default router;
