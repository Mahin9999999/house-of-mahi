import {
  PaymentGatewayAdapter,
  PaymentCreateSessionPayload,
  PaymentSessionResult,
  PaymentVerificationPayload,
  PaymentVerificationResult,
  PaymentRefundPayload,
  PaymentRefundResult
} from '../types';
import { paymentConfigStore } from '../configStore';

/**
 * Official Card & Online Banking Gateway Adapter (SSLCommerz Hosted PGW)
 * Supports Visa, Mastercard, AMEX, UnionPay, Internet Banking and MFS.
 * Uses Dynamic Decrypted Merchant Credentials from PaymentConfigStore.
 */
export class CardGatewayAdapter implements PaymentGatewayAdapter {
  private getConfig() {
    return paymentConfigStore.getDecryptedSSLCommerzConfig();
  }

  private getBaseUrl(isSandbox: boolean): string {
    return isSandbox
      ? 'https://sandbox.sslcommerz.com'
      : 'https://securepay.sslcommerz.com';
  }

  public isConfigured(): boolean {
    const config = this.getConfig();
    return Boolean(config.storeId && config.storePassword);
  }

  public getGatewayStatus() {
    const config = this.getConfig();
    const missingKeys: string[] = [];
    if (!config.storeId) missingKeys.push('Store ID');
    if (!config.storePassword) missingKeys.push('Store Password');

    return {
      isConfigured: missingKeys.length === 0,
      isSandbox: config.isSandbox,
      isEnabled: config.isEnabled,
      missingKeys
    };
  }

  /**
   * Test Gateway Connection with Merchant Credentials
   */
  public async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.isConfigured()) {
      return {
        success: false,
        message: 'SSLCommerz credentials are missing. Please configure Store ID and Store Password in Admin Panel.'
      };
    }

    try {
      const config = this.getConfig();
      const baseUrl = this.getBaseUrl(config.isSandbox);

      const params = new URLSearchParams();
      params.append('store_id', config.storeId);
      params.append('store_passwd', config.storePassword);
      params.append('total_amount', '10.00');
      params.append('currency', 'BDT');
      params.append('tran_id', `TEST-${Date.now()}`);
      params.append('success_url', 'https://houseofmahibd.com/test');
      params.append('fail_url', 'https://houseofmahibd.com/test');
      params.append('cancel_url', 'https://houseofmahibd.com/test');
      params.append('cus_name', 'Test');
      params.append('cus_email', 'test@example.com');
      params.append('cus_phone', '01700000000');
      params.append('shipping_method', 'NO');
      params.append('num_of_item', '1');
      params.append('product_name', 'Test');
      params.append('product_category', 'Test');
      params.append('product_profile', 'general');

      const response = await fetch(`${baseUrl}/gwprocess/v4/api.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      });

      const data = await response.json() as any;

      if (data && (data.status === 'SUCCESS' || data.GatewayPageURL)) {
        return {
          success: true,
          message: 'SSLCommerz Store Credentials verified successfully.'
        };
      }

      return {
        success: false,
        message: data.failedreason || data.status || 'Invalid Store ID or Store Password.'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'SSLCommerz connection test failed.'
      };
    }
  }

  /**
   * 1. Initialize SSLCommerz Payment Session (Hosted Checkout URL)
   */
  public async createPaymentSession(payload: PaymentCreateSessionPayload): Promise<PaymentSessionResult> {
    const config = this.getConfig();
    if (!this.isConfigured()) {
      return {
        success: false,
        status: 'failed',
        message: 'Card payment gateway credentials (SSLCommerz Store ID, Store Password) are not configured yet.'
      };
    }

    if (!config.isEnabled) {
      return {
        success: false,
        status: 'failed',
        message: 'Card payment channel is currently disabled by administrator.'
      };
    }

    try {
      const baseUrl = this.getBaseUrl(config.isSandbox);
      const appUrl = process.env.APP_URL || 'https://houseofmahibd.com';
      const successUrl = `${appUrl}/api/payment/callback/sslcommerz?status=success&orderId=${payload.orderId}`;
      const failUrl = `${appUrl}/api/payment/callback/sslcommerz?status=fail&orderId=${payload.orderId}`;
      const cancelUrl = `${appUrl}/api/payment/callback/sslcommerz?status=cancel&orderId=${payload.orderId}`;
      const ipnUrl = `${appUrl}/api/payment/webhook/sslcommerz`;

      const params = new URLSearchParams();
      params.append('store_id', config.storeId);
      params.append('store_passwd', config.storePassword);
      params.append('total_amount', payload.amount.toFixed(2));
      params.append('currency', 'BDT');
      params.append('tran_id', payload.orderNumber);
      params.append('success_url', successUrl);
      params.append('fail_url', failUrl);
      params.append('cancel_url', cancelUrl);
      params.append('ipn_url', ipnUrl);
      params.append('cus_name', payload.customer.name || 'HouseOfMahi Customer');
      params.append('cus_email', payload.customer.email || 'customer@houseofmahi.com');
      params.append('cus_add1', payload.customer.address || 'Bangladesh');
      params.append('cus_city', 'Dhaka');
      params.append('cus_country', 'Bangladesh');
      params.append('cus_phone', payload.customer.phone || '01700000000');
      params.append('shipping_method', 'COURIER');
      params.append('num_of_item', '1');
      params.append('product_name', `HouseOfMahi Order #${payload.orderNumber}`);
      params.append('product_category', 'Clothing & Boutique');
      params.append('product_profile', 'general');

      const response = await fetch(`${baseUrl}/gwprocess/v4/api.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });

      const data = await response.json() as any;

      if (data && data.status === 'SUCCESS' && data.GatewayPageURL) {
        return {
          success: true,
          gatewayPaymentId: data.sessionkey,
          paymentUrl: data.GatewayPageURL,
          status: 'redirect_required',
          message: 'SSLCommerz card gateway session initialized.',
          rawResponse: data
        };
      }

      return {
        success: false,
        status: 'failed',
        message: data.failedreason || data.status || 'Could not initiate card payment session.',
        rawResponse: data
      };
    } catch (error: any) {
      console.error('[Card Gateway Adapter Error - createPaymentSession]:', error);
      return {
        success: false,
        status: 'failed',
        message: error.message || 'Error communicating with card payment gateway.'
      };
    }
  }

  /**
   * 2. Server-side Validation API (Order validation query by val_id)
   */
  public async verifyPayment(payload: PaymentVerificationPayload): Promise<PaymentVerificationResult> {
    const config = this.getConfig();
    if (!this.isConfigured()) {
      return {
        success: false,
        isPaid: false,
        status: 'failed',
        amount: 0,
        currency: 'BDT',
        message: 'Card gateway credentials not configured.'
      };
    }

    try {
      const baseUrl = this.getBaseUrl(config.isSandbox);
      const valId = payload.gatewayPaymentId || payload.transactionId;
      if (!valId) {
        return {
          success: false,
          isPaid: false,
          status: 'failed',
          amount: 0,
          currency: 'BDT',
          message: 'Missing validation ID for card payment verification.'
        };
      }

      const validateUrl = `${baseUrl}/validator/api/validationserverAPI.php?val_id=${encodeURIComponent(valId)}&store_id=${encodeURIComponent(config.storeId)}&store_passwd=${encodeURIComponent(config.storePassword)}&format=json`;

      const response = await fetch(validateUrl);
      const data = await response.json() as any;

      if (data && (data.status === 'VALID' || data.status === 'VALIDATED')) {
        const paidAmount = parseFloat(data.amount || '0');
        const expected = parseFloat(payload.expectedAmount.toFixed(2));

        if (Math.abs(paidAmount - expected) > 0.01) {
          return {
            success: false,
            isPaid: false,
            status: 'failed',
            transactionId: data.bank_tran_id || data.tran_id,
            gatewayPaymentId: data.val_id,
            amount: paidAmount,
            currency: data.currency || 'BDT',
            message: `Amount mismatch: Expected ৳${expected} but received ৳${paidAmount}.`,
            errorMessage: 'AMOUNT_MISMATCH',
            rawResponse: data
          };
        }

        return {
          success: true,
          isPaid: true,
          status: 'paid',
          transactionId: data.bank_tran_id || data.tran_id,
          gatewayPaymentId: data.val_id,
          amount: paidAmount,
          currency: data.currency || 'BDT',
          customerPhone: data.cus_phone,
          paidAt: data.tran_date || new Date().toISOString(),
          message: 'Card payment validated successfully.',
          rawResponse: data
        };
      }

      return {
        success: false,
        isPaid: false,
        status: data.status === 'FAILED' ? 'failed' : 'cancelled',
        amount: parseFloat(data.amount || '0'),
        currency: 'BDT',
        message: data.error || data.status || 'Card payment validation failed.',
        rawResponse: data
      };
    } catch (error: any) {
      console.error('[Card Gateway Adapter Error - verifyPayment]:', error);
      return {
        success: false,
        isPaid: false,
        status: 'failed',
        amount: 0,
        currency: 'BDT',
        message: error.message || 'Failed to validate card transaction.'
      };
    }
  }

  /**
   * 3. Refund Payment API
   */
  public async refundPayment(payload: PaymentRefundPayload): Promise<PaymentRefundResult> {
    const config = this.getConfig();
    if (!this.isConfigured()) {
      return {
        success: false,
        refundedAmount: 0,
        message: 'Card gateway credentials not configured.'
      };
    }

    try {
      const baseUrl = this.getBaseUrl(config.isSandbox);
      const params = new URLSearchParams();
      params.append('store_id', config.storeId);
      params.append('store_passwd', config.storePassword);
      params.append('bank_tran_id', payload.transactionId);
      params.append('refund_amount', payload.amount.toFixed(2));
      params.append('refund_remarks', payload.reason || 'Customer refund');
      params.append('format', 'json');

      const response = await fetch(`${baseUrl}/validator/api/merchantTransIDvalidationAPI.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      });

      const data = await response.json() as any;

      if (data && (data.status === 'success' || data.status === 'SUCCESS')) {
        return {
          success: true,
          refundTrxId: data.refund_ref_id,
          refundedAmount: parseFloat(payload.amount.toFixed(2)),
          message: 'Card refund processed successfully.',
          rawResponse: data
        };
      }

      return {
        success: false,
        refundedAmount: 0,
        message: data.errorreason || 'SSLCommerz refund failed.',
        errorMessage: data.errorreason,
        rawResponse: data
      };
    } catch (error: any) {
      return {
        success: false,
        refundedAmount: 0,
        message: error.message || 'Failed to process card refund.'
      };
    }
  }
}
