import {
  PaymentInitiationRequest,
  PaymentInitiationResponse,
  PaymentVerificationRequest,
  PaymentVerificationResponse,
  PaymentRefundRequest,
  PaymentRefundResponse,
  PaymentMethodConfig,
  PaymentTransaction,
  PaymentMethodType,
  PaymentGatewayType
} from '../types';
import { db } from '../firebase/config';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  updateDoc,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';

export const DEFAULT_PAYMENT_METHODS: PaymentMethodConfig[] = [
  {
    id: 'cod',
    name: 'Cash on Delivery',
    displayName: 'Cash on Delivery (COD)',
    type: 'cash_on_delivery',
    provider: 'cod',
    isEnabled: true,
    isSandbox: false,
    displayOrder: 1,
    sortOrder: 1,
    badge: 'Popular',
    description: 'Pay with cash upon receiving your order at your doorstep across Bangladesh.',
    instructionText: 'Please keep the exact cash amount ready for the delivery rider.',
    instructions: 'Please keep the exact cash amount ready for the delivery rider.',
    isConfigured: true
  },
  {
    id: 'bkash',
    name: 'bKash Online',
    displayName: 'bKash Online Payment (Tokenized)',
    type: 'automated_gateway',
    provider: 'bkash',
    accountType: 'merchant',
    isEnabled: true,
    isSandbox: true,
    displayOrder: 2,
    sortOrder: 2,
    badge: 'Instant',
    description: 'Pay instantly using your bKash personal account with automated verification.',
    instructionText: 'You will be redirected to the secure bKash checkout page to complete payment with PIN & OTP.',
    instructions: 'You will be redirected to the secure bKash checkout page to complete payment with PIN & OTP.',
    isConfigured: true
  },
  {
    id: 'nagad',
    name: 'Nagad Direct',
    displayName: 'Nagad Direct Payment',
    type: 'automated_gateway',
    provider: 'nagad',
    accountType: 'merchant',
    isEnabled: true,
    isSandbox: true,
    displayOrder: 3,
    sortOrder: 3,
    description: 'Pay seamlessly using your Nagad wallet account.',
    instructionText: 'You will be redirected to the secure Nagad payment gateway.',
    instructions: 'You will be redirected to the secure Nagad payment gateway.',
    isConfigured: true
  },
  {
    id: 'card',
    name: 'Visa / Mastercard / Cards',
    displayName: 'Visa, Mastercard & Banking (SSLCommerz)',
    type: 'automated_gateway',
    provider: 'sslcommerz',
    accountType: 'merchant',
    isEnabled: true,
    isSandbox: true,
    displayOrder: 4,
    sortOrder: 4,
    description: 'Pay securely using any Visa, Mastercard, UnionPay or Bangladesh Internet Banking.',
    instructionText: '128-bit SSL encrypted bank gateway provided by SSLCommerz.',
    instructions: '128-bit SSL encrypted bank gateway provided by SSLCommerz.',
    isConfigured: true
  }
];

export interface ManualPaymentSubmissionRequest {
  orderId: string;
  orderNumber?: string;
  paymentMethodId: string;
  paymentMethodName: string;
  provider: PaymentGatewayType;
  accountNumber?: string;
  accountType?: 'merchant' | 'personal' | 'agent';
  amount: number;
  currency?: string;
  transactionId: string;
  senderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  notes?: string;
}

export interface AdminVerificationRequest {
  paymentId: string;
  transactionId?: string;
  orderId: string;
  action: 'approve' | 'reject';
  adminNotes?: string;
  verifiedBy: string;
}

class PaymentService {
  /**
   * Fetch Gateway server-side diagnostic status (API keys set, sandbox mode)
   */
  async getGatewayStatus(): Promise<Record<string, { isConfigured: boolean; isSandbox: boolean; missingKeys: string[]; isEnabled?: boolean }>> {
    try {
      const response = await fetch('/api/payment/gateways/status');
      if (!response.ok) throw new Error('Failed to fetch gateway status');
      const data = await response.json();
      return data.status || {};
    } catch (error) {
      console.warn('[PaymentService] Error fetching gateway status:', error);
      return {
        bkash: { isConfigured: false, isSandbox: true, missingKeys: ['BKASH_APP_KEY'], isEnabled: true },
        nagad: { isConfigured: false, isSandbox: true, missingKeys: ['NAGAD_MERCHANT_ID'], isEnabled: true },
        card: { isConfigured: false, isSandbox: true, missingKeys: ['SSLCOMMERZ_STORE_ID'], isEnabled: true },
        cod: { isConfigured: true, isSandbox: false, missingKeys: [], isEnabled: true }
      };
    }
  }

  /**
   * Real-time subscription to payment methods from Firestore
   */
  subscribePaymentMethods(callback: (methods: PaymentMethodConfig[]) => void): Unsubscribe {
    try {
      const colRef = collection(db, 'payment_methods');
      return onSnapshot(colRef, (snapshot) => {
        if (!snapshot.empty) {
          const methods: PaymentMethodConfig[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            methods.push({
              id: docSnap.id,
              name: data.name || docSnap.id,
              displayName: data.displayName || data.name || docSnap.id,
              type: data.type || 'automated_gateway',
              provider: data.provider || docSnap.id,
              accountType: data.accountType || 'merchant',
              accountNumber: data.accountNumber,
              accountName: data.accountName,
              isEnabled: data.isEnabled !== false,
              isSandbox: !!data.isSandbox,
              displayOrder: data.displayOrder ?? data.sortOrder ?? 0,
              sortOrder: data.sortOrder ?? data.displayOrder ?? 0,
              badge: data.badge,
              iconUrl: data.iconUrl,
              logoUrl: data.logoUrl,
              description: data.description,
              instructionText: data.instructionText || data.instructions,
              instructions: data.instructions || data.instructionText,
              minOrderAmount: data.minOrderAmount,
              maxOrderAmount: data.maxOrderAmount,
              chargePercentage: data.chargePercentage,
              fixedCharge: data.fixedCharge,
              isConfigured: data.isConfigured !== false,
              requiresTransactionId: data.requiresTransactionId,
              requiresSenderNumber: data.requiresSenderNumber,
              supportedCurrencies: data.supportedCurrencies || ['BDT'],
              createdAt: data.createdAt,
              updatedAt: data.updatedAt
            });
          });
          methods.sort((a, b) => (a.sortOrder ?? a.displayOrder ?? 0) - (b.sortOrder ?? b.displayOrder ?? 0));
          callback(methods);
        } else {
          // If empty in Firestore, emit defaults
          callback(DEFAULT_PAYMENT_METHODS);
        }
      }, (error) => {
        console.warn('[PaymentService] Error in payment methods subscription:', error);
        callback(DEFAULT_PAYMENT_METHODS);
      });
    } catch (err) {
      console.warn('[PaymentService] Firestore subscribe error:', err);
      callback(DEFAULT_PAYMENT_METHODS);
      return () => {};
    }
  }

  /**
   * Load active payment methods from Firestore settings (or fallback to defaults)
   */
  async getPaymentMethods(): Promise<PaymentMethodConfig[]> {
    try {
      const colRef = collection(db, 'payment_methods');
      const snapshot = await getDocs(colRef);

      if (!snapshot.empty) {
        const methods: PaymentMethodConfig[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          methods.push({
            id: docSnap.id,
            name: data.name || docSnap.id,
            displayName: data.displayName || data.name || docSnap.id,
            type: data.type || 'automated_gateway',
            provider: data.provider || docSnap.id,
            accountType: data.accountType || 'merchant',
            accountNumber: data.accountNumber,
            accountName: data.accountName,
            isEnabled: data.isEnabled !== false,
            isSandbox: !!data.isSandbox,
            displayOrder: data.displayOrder ?? data.sortOrder ?? 0,
            sortOrder: data.sortOrder ?? data.displayOrder ?? 0,
            badge: data.badge,
            iconUrl: data.iconUrl,
            logoUrl: data.logoUrl,
            description: data.description,
            instructionText: data.instructionText || data.instructions,
            instructions: data.instructions || data.instructionText,
            minOrderAmount: data.minOrderAmount,
            maxOrderAmount: data.maxOrderAmount,
            chargePercentage: data.chargePercentage,
            fixedCharge: data.fixedCharge,
            isConfigured: data.isConfigured !== false,
            requiresTransactionId: data.requiresTransactionId,
            requiresSenderNumber: data.requiresSenderNumber,
            supportedCurrencies: data.supportedCurrencies || ['BDT'],
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
          });
        });
        return methods.sort((a, b) => (a.sortOrder ?? a.displayOrder ?? 0) - (b.sortOrder ?? b.displayOrder ?? 0));
      }

      // If empty in Firestore, initialize with defaults
      return DEFAULT_PAYMENT_METHODS;
    } catch (error) {
      console.warn('[PaymentService] Error loading payment methods from DB, using defaults:', error);
      return DEFAULT_PAYMENT_METHODS;
    }
  }

  /**
   * Save / Update Payment Method Settings in Firestore & Sync Server Gateway config
   */
  async savePaymentMethod(method: PaymentMethodConfig): Promise<{ success: boolean; message?: string }> {
    try {
      const docRef = doc(db, 'payment_methods', method.id);
      
      const payload: Record<string, any> = {
        id: method.id,
        name: method.name || method.displayName || method.id,
        displayName: method.displayName || method.name || method.id,
        type: method.type || 'automated_gateway',
        provider: method.provider || method.id,
        isEnabled: method.isEnabled,
        isSandbox: method.isSandbox,
        sortOrder: method.sortOrder ?? method.displayOrder ?? 0,
        displayOrder: method.sortOrder ?? method.displayOrder ?? 0,
        description: method.description || '',
        instructionText: method.instructionText || method.instructions || '',
        instructions: method.instructions || method.instructionText || '',
        isConfigured: method.isConfigured !== false,
        updatedAt: new Date().toISOString()
      };

      if (method.accountType) payload.accountType = method.accountType;
      if (method.accountNumber) payload.accountNumber = method.accountNumber.trim();
      if (method.accountName) payload.accountName = method.accountName.trim();
      if (method.badge) payload.badge = method.badge;
      if (method.logoUrl) payload.logoUrl = method.logoUrl;
      if (method.iconUrl) payload.iconUrl = method.iconUrl;
      if (method.chargePercentage !== undefined) payload.chargePercentage = method.chargePercentage;
      if (method.fixedCharge !== undefined) payload.fixedCharge = method.fixedCharge;
      if (method.minOrderAmount !== undefined) payload.minOrderAmount = method.minOrderAmount;
      if (method.maxOrderAmount !== undefined) payload.maxOrderAmount = method.maxOrderAmount;
      if (method.requiresTransactionId !== undefined) payload.requiresTransactionId = method.requiresTransactionId;
      if (method.requiresSenderNumber !== undefined) payload.requiresSenderNumber = method.requiresSenderNumber;
      if (method.supportedCurrencies) payload.supportedCurrencies = method.supportedCurrencies;

      await setDoc(docRef, payload, { merge: true });

      // If sensitive credentials exist, sync securely with server-side encrypted storage
      if (method.credentials && Object.keys(method.credentials).length > 0) {
        try {
          await fetch('/api/payment/admin/configure-gateway', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              gatewayId: method.provider || method.id,
              credentials: method.credentials,
              isSandbox: method.isSandbox,
              isEnabled: method.isEnabled
            })
          });
        } catch (serverErr) {
          console.warn('[PaymentService] Server credentials sync warning:', serverErr);
        }
      }

      return { success: true };
    } catch (error: any) {
      console.error('[PaymentService] Error saving payment method:', error);
      return { success: false, message: error.message || 'Failed to save payment configuration' };
    }
  }

  /**
   * Delete a Custom Payment Method from Firestore
   */
  async deletePaymentMethod(methodId: string): Promise<{ success: boolean; message?: string }> {
    try {
      if (['cod', 'bkash', 'nagad', 'card'].includes(methodId)) {
        return { success: false, message: 'Core payment methods cannot be deleted. You can disable them instead.' };
      }
      const docRef = doc(db, 'payment_methods', methodId);
      await deleteDoc(docRef);
      return { success: true };
    } catch (error: any) {
      console.error('[PaymentService] Error deleting payment method:', error);
      return { success: false, message: error.message || 'Failed to delete payment method' };
    }
  }

  /**
   * Toggle Payment Method status
   */
  async togglePaymentMethod(methodId: string, currentEnabled: boolean): Promise<boolean> {
    try {
      const docRef = doc(db, 'payment_methods', methodId);
      await updateDoc(docRef, {
        isEnabled: !currentEnabled,
        updatedAt: new Date().toISOString()
      });

      // Notify server endpoint for gateway caching
      fetch('/api/payment/gateways/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gatewayId: methodId, isEnabled: !currentEnabled })
      }).catch(err => console.warn('[PaymentService] Server toggle notify error:', err));

      return true;
    } catch (error) {
      console.error('[PaymentService] Error toggling payment method:', error);
      return false;
    }
  }

  /**
   * 1. Create an Automated Payment Session via Server-side PGW API
   */
  async createPaymentSession(req: PaymentInitiationRequest): Promise<PaymentInitiationResponse> {
    try {
      const response = await fetch('/api/payment/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req)
      });

      const data = await response.json();
      return data as PaymentInitiationResponse;
    } catch (error: any) {
      console.error('[PaymentService] createPaymentSession error:', error);
      return {
        success: false,
        status: 'failed',
        message: 'Could not connect to payment gateway server.',
        errorMessage: error.message
      };
    }
  }

  /**
   * 2. Submit a Manual MFS Payment (bKash/Nagad/Rocket personal send money)
   */
  async submitManualPayment(req: ManualPaymentSubmissionRequest): Promise<{ success: boolean; transactionId: string; message: string }> {
    try {
      const cleanedTrxId = (req.transactionId || '').trim().toUpperCase();
      const cleanedSender = (req.senderNumber || '').trim();

      if (!cleanedTrxId) {
        return { success: false, transactionId: '', message: 'Transaction ID (TrxID) is required.' };
      }
      if (!cleanedSender) {
        return { success: false, transactionId: '', message: 'Sender Phone Number is required.' };
      }

      // Check for duplicate transaction ID in payments collection
      const paymentsRef = collection(db, 'payments');
      const dupQuery = query(paymentsRef, where('transactionId', '==', cleanedTrxId), limit(1));
      const dupSnap = await getDocs(dupQuery);

      if (!dupSnap.empty) {
        return {
          success: false,
          transactionId: cleanedTrxId,
          message: 'This Transaction ID has already been submitted. Please check and try again.'
        };
      }

      const txRecordId = `manual_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const docRef = doc(db, 'payments', txRecordId);

      const paymentTx: PaymentTransaction = {
        id: txRecordId,
        orderId: req.orderId,
        orderNumber: req.orderNumber || req.orderId,
        customerName: req.customerName,
        customerPhone: req.customerPhone,
        customerEmail: req.customerEmail || '',
        gateway: req.provider || 'manual',
        method: req.provider,
        paymentMethodName: req.paymentMethodName,
        type: 'manual_mfs',
        provider: req.provider,
        amount: req.amount,
        currency: req.currency || 'BDT',
        status: 'pending',
        transactionId: cleanedTrxId,
        senderNumber: cleanedSender,
        notes: req.notes || `Manual payment via ${req.paymentMethodName} to ${req.accountNumber || 'Store'}`,
        initiatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(docRef, {
        ...paymentTx,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Update the order record's payment status to 'pending_verification'
      try {
        const orderRef = doc(db, 'orders', req.orderId);
        await updateDoc(orderRef, {
          paymentStatus: 'pending_verification',
          paymentMethod: req.paymentMethodName,
          transactionId: cleanedTrxId,
          senderNumber: cleanedSender,
          updatedAt: new Date().toISOString()
        });
      } catch (orderUpdateErr) {
        console.warn('[PaymentService] Order update notice:', orderUpdateErr);
      }

      return {
        success: true,
        transactionId: cleanedTrxId,
        message: 'Payment details submitted successfully! Your order will be verified shortly by our team.'
      };
    } catch (error: any) {
      console.error('[PaymentService] submitManualPayment error:', error);
      return {
        success: false,
        transactionId: '',
        message: error.message || 'Failed to submit manual payment verification.'
      };
    }
  }

  /**
   * 3. Admin Verification / Rejection of Manual Payment
   */
  async processAdminManualVerification(req: AdminVerificationRequest): Promise<{ success: boolean; message: string }> {
    try {
      const paymentRef = doc(db, 'payments', req.paymentId);
      const isApproved = req.action === 'approve';

      const updateData: Partial<PaymentTransaction> & Record<string, any> = {
        status: isApproved ? 'verified' : 'rejected',
        verifiedBy: req.verifiedBy || 'Admin',
        verifiedAt: new Date().toISOString(),
        notes: req.adminNotes || (isApproved ? 'Manual MFS payment approved by Admin' : 'Manual MFS payment rejected by Admin'),
        updatedAt: serverTimestamp()
      };

      await updateDoc(paymentRef, updateData);

      // Synchronize with the Order
      if (req.orderId) {
        try {
          const orderRef = doc(db, 'orders', req.orderId);
          await updateDoc(orderRef, {
            paymentStatus: isApproved ? 'paid' : 'failed',
            isPaid: isApproved,
            updatedAt: new Date().toISOString()
          });
        } catch (orderErr) {
          console.warn('[PaymentService] Order sync notice during verification:', orderErr);
        }
      }

      return {
        success: true,
        message: isApproved ? 'Payment successfully verified and order marked as paid.' : 'Payment rejected.'
      };
    } catch (error: any) {
      console.error('[PaymentService] processAdminManualVerification error:', error);
      return {
        success: false,
        message: error.message || 'Failed to process admin payment verification.'
      };
    }
  }

  /**
   * 4. Verify Automated Payment on Server
   */
  async verifyPayment(req: PaymentVerificationRequest & { expectedAmount: number }): Promise<PaymentVerificationResponse> {
    try {
      const response = await fetch('/api/payment/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req)
      });

      const data = await response.json();
      return data as PaymentVerificationResponse;
    } catch (error: any) {
      console.error('[PaymentService] verifyPayment error:', error);
      return {
        success: false,
        isPaid: false,
        status: 'failed',
        amount: req.expectedAmount,
        currency: 'BDT',
        message: 'Failed to verify transaction with bank server.',
        errorMessage: error.message
      };
    }
  }

  /**
   * 5. Request Refund from PGW
   */
  async refundPayment(req: PaymentRefundRequest): Promise<PaymentRefundResponse> {
    try {
      const response = await fetch('/api/payment/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req)
      });

      const data = await response.json();
      return data as PaymentRefundResponse;
    } catch (error: any) {
      console.error('[PaymentService] refundPayment error:', error);
      return {
        success: false,
        refundedAmount: 0,
        message: 'Network error during refund request.',
        errorMessage: error.message
      };
    }
  }

  /**
   * 6. Record/Log Transaction in Firestore `payments` collection
   */
  async recordTransaction(tx: Omit<PaymentTransaction, 'id'> & { id?: string }): Promise<string> {
    try {
      const id = tx.id || `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const docRef = doc(db, 'payments', id);
      
      await setDoc(docRef, {
        ...tx,
        id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });

      return id;
    } catch (error) {
      console.error('[PaymentService] recordTransaction error:', error);
      return '';
    }
  }

  /**
   * 7. Get Transactions List
   */
  async getTransactions(orderId?: string, limitCount: number = 100): Promise<PaymentTransaction[]> {
    try {
      const colRef = collection(db, 'payments');
      let q = query(colRef, orderBy('createdAt', 'desc'), limit(limitCount));
      
      if (orderId) {
        q = query(colRef, where('orderId', '==', orderId), limit(10));
      }

      const snapshot = await getDocs(q);
      const list: PaymentTransaction[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          orderId: data.orderId || '',
          orderNumber: data.orderNumber || data.orderId,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          customerEmail: data.customerEmail,
          gateway: data.gateway || data.method || 'unknown',
          method: data.method || data.gateway,
          paymentMethodName: data.paymentMethodName,
          type: data.type || 'automated_gateway',
          provider: data.provider || data.gateway,
          amount: typeof data.amount === 'number' ? data.amount : Number(data.amount) || 0,
          currency: data.currency || 'BDT',
          status: data.status || 'pending',
          transactionId: data.transactionId,
          senderNumber: data.senderNumber,
          gatewayPaymentId: data.gatewayPaymentId,
          paymentId: data.paymentId,
          paymentUrl: data.paymentUrl,
          initiatedAt: data.initiatedAt,
          paidAt: data.paidAt,
          verifiedAt: data.verifiedAt,
          verifiedBy: data.verifiedBy,
          refundedAt: data.refundedAt,
          refundAmount: data.refundAmount,
          refundReason: data.refundReason,
          notes: data.notes,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || new Date().toISOString()),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : (data.updatedAt || new Date().toISOString())
        });
      });
      return list;
    } catch (error) {
      console.warn('[PaymentService] getTransactions error:', error);
      return [];
    }
  }
}

export const paymentService = new PaymentService();
