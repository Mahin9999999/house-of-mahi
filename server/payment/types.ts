export type SupportedGateway = 'bkash' | 'nagad' | 'card' | 'cod';

export interface PaymentCreateSessionPayload {
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: 'BDT';
  customer: {
    name: string;
    phone: string;
    email?: string;
    address: string;
  };
  callbackUrl?: string;
}

export interface PaymentSessionResult {
  success: boolean;
  gatewayPaymentId?: string;
  paymentUrl?: string;
  transactionId?: string;
  status: 'pending' | 'redirect_required' | 'completed' | 'failed';
  message?: string;
  rawResponse?: any;
}

export interface PaymentVerificationPayload {
  orderId: string;
  paymentId?: string;
  gatewayPaymentId?: string;
  transactionId?: string;
  expectedAmount: number;
}

export interface PaymentVerificationResult {
  success: boolean;
  isPaid: boolean;
  status: 'paid' | 'failed' | 'cancelled' | 'pending';
  transactionId?: string;
  gatewayPaymentId?: string;
  amount: number;
  currency: string;
  customerPhone?: string;
  paidAt?: string;
  message?: string;
  errorMessage?: string;
  rawResponse?: any;
}

export interface PaymentRefundPayload {
  paymentId: string;
  transactionId: string;
  amount: number;
  reason: string;
  sku?: string;
}

export interface PaymentRefundResult {
  success: boolean;
  refundTrxId?: string;
  refundedAmount: number;
  message: string;
  errorMessage?: string;
  rawResponse?: any;
}

export interface PaymentGatewayAdapter {
  createPaymentSession(payload: PaymentCreateSessionPayload): Promise<PaymentSessionResult>;
  verifyPayment(payload: PaymentVerificationPayload): Promise<PaymentVerificationResult>;
  refundPayment?(payload: PaymentRefundPayload): Promise<PaymentRefundResult>;
  isConfigured(): boolean;
  getGatewayStatus(): {
    isConfigured: boolean;
    isSandbox: boolean;
    missingKeys: string[];
  };
}
