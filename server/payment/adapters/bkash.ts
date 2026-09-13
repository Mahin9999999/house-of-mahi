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
 * bKash Official Tokenized Payment API Adapter
 * Production-ready implementation with Dynamic Decrypted Credential Resolution,
 * Token caching, Error Handling, Exact Amount Verification, and Idempotency.
 */
export class BkashAdapter implements PaymentGatewayAdapter {
  // In-memory token cache with expiration
  private cachedToken: string | null = null;
  private tokenExpiresAt: number = 0;

  private getConfig() {
    return paymentConfigStore.getDecryptedBkashConfig();
  }

  private getBaseUrl(isSandbox: boolean): string {
    return isSandbox
      ? 'https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/checkout'
      : 'https://tokenized.pay.bka.sh/v1.2.0-beta/tokenized/checkout';
  }

  public isConfigured(): boolean {
    const config = this.getConfig();
    return Boolean(config.appKey && config.appSecret && config.username && config.password);
  }

  public getGatewayStatus() {
    const config = this.getConfig();
    const missingKeys: string[] = [];
    if (!config.appKey) missingKeys.push('App Key');
    if (!config.appSecret) missingKeys.push('App Secret');
    if (!config.username) missingKeys.push('Username');
    if (!config.password) missingKeys.push('Password');

    return {
      isConfigured: missingKeys.length === 0,
      isSandbox: config.isSandbox,
      isEnabled: config.isEnabled,
      missingKeys
    };
  }

  /**
   * Acquire or reuse bKash Grant Token (Valid for 1 hour, cached for 50 minutes)
   */
  private async getGrantToken(): Promise<string> {
    const config = this.getConfig();
    if (!this.isConfigured()) {
      throw new Error('bKash merchant credentials are not configured in Admin Panel.');
    }

    const now = Date.now();
    if (this.cachedToken && this.tokenExpiresAt > now) {
      return this.cachedToken;
    }

    const baseUrl = this.getBaseUrl(config.isSandbox);
    const response = await fetch(`${baseUrl}/token/grant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        username: config.username,
        password: config.password
      },
      body: JSON.stringify({
        app_key: config.appKey,
        app_secret: config.appSecret
      })
    });

    const data = await response.json() as any;

    if (!response.ok || !data.id_token) {
      throw new Error(data.statusMessage || data.message || 'Failed to acquire bKash grant token with provided credentials.');
    }

    this.cachedToken = data.id_token;
    // Cache for 50 minutes (3000 seconds)
    this.tokenExpiresAt = now + 3000 * 1000;
    return this.cachedToken!;
  }

  /**
   * Test Gateway Connection with Merchant Credentials
   */
  public async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    if (!this.isConfigured()) {
      return {
        success: false,
        message: 'bKash credentials are missing. Please configure them in Admin Panel first.'
      };
    }

    try {
      this.cachedToken = null; // Force fresh token request for test
      const token = await this.getGrantToken();
      if (token) {
        return {
          success: true,
          message: 'bKash Merchant Credentials verified successfully. Token acquired.'
        };
      }
      return {
        success: false,
        message: 'Failed to acquire token from bKash server.'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'bKash connection test failed.'
      };
    }
  }

  /**
   * 1. Create Payment Session (Generate Gateway URL)
   */
  public async createPaymentSession(payload: PaymentCreateSessionPayload): Promise<PaymentSessionResult> {
    const config = this.getConfig();
    if (!this.isConfigured()) {
      return {
        success: false,
        status: 'failed',
        message: 'bKash merchant credentials are not configured yet. Please configure the gateway in HouseOfMahi Admin Panel.'
      };
    }

    if (!config.isEnabled) {
      return {
        success: false,
        status: 'failed',
        message: 'bKash payment channel is currently disabled by administrator.'
      };
    }

    try {
      const idToken = await this.getGrantToken();
      const baseUrl = this.getBaseUrl(config.isSandbox);
      const callbackUrl = payload.callbackUrl || `${process.env.APP_URL || 'https://houseofmahibd.com'}/api/payment/callback/bkash`;

      const requestBody = {
        mode: '0011',
        payerReference: payload.customer.phone || 'HouseOfMahiCustomer',
        callbackURL: callbackUrl,
        amount: payload.amount.toFixed(2),
        currency: 'BDT',
        intent: 'sale',
        merchantInvoiceNumber: payload.orderNumber
      };

      const response = await fetch(`${baseUrl}/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${idToken}`,
          'X-APP-Key': config.appKey
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json() as any;

      if (data && (data.statusCode === '0000' || data.paymentID)) {
        return {
          success: true,
          gatewayPaymentId: data.paymentID,
          paymentUrl: data.bkashURL,
          status: 'redirect_required',
          message: 'bKash payment session created successfully.',
          rawResponse: data
        };
      }

      return {
        success: false,
        status: 'failed',
        message: data.statusMessage || data.message || 'Could not initiate bKash payment session.',
        rawResponse: data
      };
    } catch (error: any) {
      console.error('[bKash Adapter Error - createPaymentSession]:', error);
      return {
        success: false,
        status: 'failed',
        message: error.message || 'An error occurred while connecting to bKash gateway.'
      };
    }
  }

  /**
   * 2. Verify Payment (Execute or Query Payment & Verify Expected Amount)
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
        message: 'bKash credentials not configured.'
      };
    }

    try {
      const idToken = await this.getGrantToken();
      const baseUrl = this.getBaseUrl(config.isSandbox);
      const paymentID = payload.gatewayPaymentId || payload.paymentId;

      if (!paymentID) {
        return {
          success: false,
          isPaid: false,
          status: 'failed',
          amount: 0,
          currency: 'BDT',
          message: 'Missing bKash payment ID for verification.'
        };
      }

      // Step A: Attempt to Execute Payment first (if coming fresh from callback)
      let executeRes = await fetch(`${baseUrl}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${idToken}`,
          'X-APP-Key': config.appKey
        },
        body: JSON.stringify({ paymentID })
      });

      let data = await executeRes.json() as any;

      // Step B: If execute fails or already executed, query payment status
      if (!data || data.statusCode !== '0000') {
        const queryRes = await fetch(`${baseUrl}/payment/status`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${idToken}`,
            'X-APP-Key': config.appKey
          },
          body: JSON.stringify({ paymentID })
        });
        const queryData = await queryRes.json() as any;
        if (queryData && queryData.statusCode === '0000') {
          data = queryData;
        }
      }

      // Step C: Strict Amount & Transaction Verification
      if (data && (data.statusCode === '0000' || data.transactionStatus === 'Completed')) {
        const paidAmount = parseFloat(data.amount);
        const expected = parseFloat(payload.expectedAmount.toFixed(2));

        if (Math.abs(paidAmount - expected) > 0.01) {
          return {
            success: false,
            isPaid: false,
            status: 'failed',
            transactionId: data.trxID,
            gatewayPaymentId: data.paymentID,
            amount: paidAmount,
            currency: data.currency || 'BDT',
            message: `Amount mismatch: Expected ৳${expected} but paid ৳${paidAmount}. Payment flagged for review.`,
            errorMessage: 'AMOUNT_MISMATCH',
            rawResponse: data
          };
        }

        return {
          success: true,
          isPaid: true,
          status: 'paid',
          transactionId: data.trxID,
          gatewayPaymentId: data.paymentID,
          amount: paidAmount,
          currency: data.currency || 'BDT',
          customerPhone: data.customerMsisdn,
          paidAt: data.paymentExecuteTime || new Date().toISOString(),
          message: 'bKash payment verified successfully.',
          rawResponse: data
        };
      }

      // If user cancelled or payment failed
      const isCancelled = data.statusMessage?.toLowerCase().includes('cancel') || data.transactionStatus === 'Cancelled';
      return {
        success: false,
        isPaid: false,
        status: isCancelled ? 'cancelled' : 'failed',
        amount: parseFloat(data.amount || '0'),
        currency: 'BDT',
        message: data.statusMessage || 'bKash payment was not completed.',
        errorMessage: data.statusMessage,
        rawResponse: data
      };
    } catch (error: any) {
      console.error('[bKash Adapter Error - verifyPayment]:', error);
      return {
        success: false,
        isPaid: false,
        status: 'failed',
        amount: 0,
        currency: 'BDT',
        message: error.message || 'Failed to verify bKash payment.'
      };
    }
  }

  /**
   * 3. Refund Payment
   */
  public async refundPayment(payload: PaymentRefundPayload): Promise<PaymentRefundResult> {
    const config = this.getConfig();
    if (!this.isConfigured()) {
      return {
        success: false,
        refundedAmount: 0,
        message: 'bKash credentials not configured.'
      };
    }

    try {
      const idToken = await this.getGrantToken();
      const baseUrl = this.getBaseUrl(config.isSandbox);

      const response = await fetch(`${baseUrl}/payment/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${idToken}`,
          'X-APP-Key': config.appKey
        },
        body: JSON.stringify({
          paymentID: payload.paymentId,
          amount: payload.amount.toFixed(2),
          trxID: payload.transactionId,
          sku: payload.sku || 'Refund',
          reason: payload.reason
        })
      });

      const data = await response.json() as any;

      if (data && data.statusCode === '0000') {
        return {
          success: true,
          refundTrxId: data.refundTrxID,
          refundedAmount: parseFloat(data.amount),
          message: 'bKash refund executed successfully.',
          rawResponse: data
        };
      }

      return {
        success: false,
        refundedAmount: 0,
        message: data.statusMessage || 'bKash refund failed.',
        errorMessage: data.statusMessage,
        rawResponse: data
      };
    } catch (error: any) {
      return {
        success: false,
        refundedAmount: 0,
        message: error.message || 'Failed to process bKash refund.'
      };
    }
  }
}
