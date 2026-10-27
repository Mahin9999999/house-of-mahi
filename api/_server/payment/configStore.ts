import { encryptSecret, decryptSecret } from './encryption';

export type PaymentGatewayType = 'bkash' | 'nagad' | 'card' | 'cod';

export interface GatewayAuditLogEntry {
  id: string;
  gateway: PaymentGatewayType;
  action: 'CREDENTIALS_UPDATED' | 'STATUS_CHANGED' | 'MODE_SWITCHED' | 'TEST_CONNECTION';
  adminId: string;
  adminEmail?: string;
  timestamp: string;
  summary: string;
}

export interface EncryptedGatewayCredentials {
  bkash?: {
    appKey: string;      // Encrypted string
    appSecret: string;   // Encrypted string
    username: string;    // Encrypted string
    password: string;    // Encrypted string
    isSandbox: boolean;
    isEnabled: boolean;
    updatedAt: string;
  };
  nagad?: {
    merchantId: string;        // Encrypted string
    pgPublicKey: string;       // Encrypted string
    merchantPrivateKey: string;// Encrypted string
    isSandbox: boolean;
    isEnabled: boolean;
    updatedAt: string;
  };
  card?: {
    storeId: string;           // Encrypted string
    storePassword: string;     // Encrypted string
    isSandbox: boolean;
    isEnabled: boolean;
    updatedAt: string;
  };
  cod?: {
    isEnabled: boolean;
    updatedAt: string;
  };
}

export interface DecryptedBkashConfig {
  appKey: string;
  appSecret: string;
  username: string;
  password: string;
  isSandbox: boolean;
  isEnabled: boolean;
}

export interface DecryptedNagadConfig {
  merchantId: string;
  pgPublicKey: string;
  merchantPrivateKey: string;
  isSandbox: boolean;
  isEnabled: boolean;
}

export interface DecryptedSSLCommerzConfig {
  storeId: string;
  storePassword: string;
  isSandbox: boolean;
  isEnabled: boolean;
}

export interface GatewayMetadataResponse {
  gateway: PaymentGatewayType;
  isEnabled: boolean;
  isSandbox: boolean;
  isConfigured: boolean;
  configuredFields: string[];
  missingFields: string[];
  lastUpdated?: string;
}

/**
 * In-memory / Durable Server-side Secure Gateway Configuration Store
 * Encrypts all merchant credentials on save.
 * Decrypts only on-demand during real gateway API communications.
 */
class PaymentConfigStore {
  private encryptedStore: EncryptedGatewayCredentials = {
    bkash: {
      appKey: '',
      appSecret: '',
      username: '',
      password: '',
      isSandbox: true,
      isEnabled: true,
      updatedAt: new Date().toISOString()
    },
    nagad: {
      merchantId: '',
      pgPublicKey: '',
      merchantPrivateKey: '',
      isSandbox: true,
      isEnabled: true,
      updatedAt: new Date().toISOString()
    },
    card: {
      storeId: '',
      storePassword: '',
      isSandbox: true,
      isEnabled: true,
      updatedAt: new Date().toISOString()
    },
    cod: {
      isEnabled: true,
      updatedAt: new Date().toISOString()
    }
  };

  private auditLogs: GatewayAuditLogEntry[] = [];

  /**
   * Save and Encrypt bKash Credentials from Admin Panel
   */
  public saveBkashConfig(
    data: {
      appKey?: string;
      appSecret?: string;
      username?: string;
      password?: string;
      isSandbox?: boolean;
      isEnabled?: boolean;
    },
    adminId = 'admin',
    adminEmail?: string
  ): void {
    const current = this.encryptedStore.bkash || {
      appKey: '',
      appSecret: '',
      username: '',
      password: '',
      isSandbox: true,
      isEnabled: true,
      updatedAt: new Date().toISOString()
    };

    const updated = {
      appKey: data.appKey ? encryptSecret(data.appKey.trim()) : current.appKey,
      appSecret: data.appSecret ? encryptSecret(data.appSecret.trim()) : current.appSecret,
      username: data.username ? encryptSecret(data.username.trim()) : current.username,
      password: data.password ? encryptSecret(data.password.trim()) : current.password,
      isSandbox: data.isSandbox !== undefined ? data.isSandbox : current.isSandbox,
      isEnabled: data.isEnabled !== undefined ? data.isEnabled : current.isEnabled,
      updatedAt: new Date().toISOString()
    };

    this.encryptedStore.bkash = updated;

    this.recordAuditLog({
      id: `audit-${Date.now()}`,
      gateway: 'bkash',
      action: 'CREDENTIALS_UPDATED',
      adminId,
      adminEmail,
      timestamp: new Date().toISOString(),
      summary: `bKash merchant configuration updated (Mode: ${updated.isSandbox ? 'Sandbox' : 'Live'}, Status: ${updated.isEnabled ? 'Enabled' : 'Disabled'})`
    });
  }

  /**
   * Save and Encrypt Nagad Credentials from Admin Panel
   */
  public saveNagadConfig(
    data: {
      merchantId?: string;
      pgPublicKey?: string;
      merchantPrivateKey?: string;
      isSandbox?: boolean;
      isEnabled?: boolean;
    },
    adminId = 'admin',
    adminEmail?: string
  ): void {
    const current = this.encryptedStore.nagad || {
      merchantId: '',
      pgPublicKey: '',
      merchantPrivateKey: '',
      isSandbox: true,
      isEnabled: true,
      updatedAt: new Date().toISOString()
    };

    const updated = {
      merchantId: data.merchantId ? encryptSecret(data.merchantId.trim()) : current.merchantId,
      pgPublicKey: data.pgPublicKey ? encryptSecret(data.pgPublicKey.trim()) : current.pgPublicKey,
      merchantPrivateKey: data.merchantPrivateKey ? encryptSecret(data.merchantPrivateKey.trim()) : current.merchantPrivateKey,
      isSandbox: data.isSandbox !== undefined ? data.isSandbox : current.isSandbox,
      isEnabled: data.isEnabled !== undefined ? data.isEnabled : current.isEnabled,
      updatedAt: new Date().toISOString()
    };

    this.encryptedStore.nagad = updated;

    this.recordAuditLog({
      id: `audit-${Date.now()}`,
      gateway: 'nagad',
      action: 'CREDENTIALS_UPDATED',
      adminId,
      adminEmail,
      timestamp: new Date().toISOString(),
      summary: `Nagad merchant configuration updated (Mode: ${updated.isSandbox ? 'Sandbox' : 'Live'}, Status: ${updated.isEnabled ? 'Enabled' : 'Disabled'})`
    });
  }

  /**
   * Save and Encrypt SSLCommerz Credentials from Admin Panel
   */
  public saveSSLCommerzConfig(
    data: {
      storeId?: string;
      storePassword?: string;
      isSandbox?: boolean;
      isEnabled?: boolean;
    },
    adminId = 'admin',
    adminEmail?: string
  ): void {
    const current = this.encryptedStore.card || {
      storeId: '',
      storePassword: '',
      isSandbox: true,
      isEnabled: true,
      updatedAt: new Date().toISOString()
    };

    const updated = {
      storeId: data.storeId ? encryptSecret(data.storeId.trim()) : current.storeId,
      storePassword: data.storePassword ? encryptSecret(data.storePassword.trim()) : current.storePassword,
      isSandbox: data.isSandbox !== undefined ? data.isSandbox : current.isSandbox,
      isEnabled: data.isEnabled !== undefined ? data.isEnabled : current.isEnabled,
      updatedAt: new Date().toISOString()
    };

    this.encryptedStore.card = updated;

    this.recordAuditLog({
      id: `audit-${Date.now()}`,
      gateway: 'card',
      action: 'CREDENTIALS_UPDATED',
      adminId,
      adminEmail,
      timestamp: new Date().toISOString(),
      summary: `SSLCommerz configuration updated (Mode: ${updated.isSandbox ? 'Sandbox' : 'Live'}, Status: ${updated.isEnabled ? 'Enabled' : 'Disabled'})`
    });
  }

  /**
   * Update Gateway Toggle (Enable/Disable, Sandbox/Live)
   */
  public updateGatewayState(
    gateway: PaymentGatewayType,
    updates: { isEnabled?: boolean; isSandbox?: boolean },
    adminId = 'admin',
    adminEmail?: string
  ): void {
    if (gateway === 'bkash' && this.encryptedStore.bkash) {
      if (updates.isEnabled !== undefined) this.encryptedStore.bkash.isEnabled = updates.isEnabled;
      if (updates.isSandbox !== undefined) this.encryptedStore.bkash.isSandbox = updates.isSandbox;
      this.encryptedStore.bkash.updatedAt = new Date().toISOString();
    } else if (gateway === 'nagad' && this.encryptedStore.nagad) {
      if (updates.isEnabled !== undefined) this.encryptedStore.nagad.isEnabled = updates.isEnabled;
      if (updates.isSandbox !== undefined) this.encryptedStore.nagad.isSandbox = updates.isSandbox;
      this.encryptedStore.nagad.updatedAt = new Date().toISOString();
    } else if (gateway === 'card' && this.encryptedStore.card) {
      if (updates.isEnabled !== undefined) this.encryptedStore.card.isEnabled = updates.isEnabled;
      if (updates.isSandbox !== undefined) this.encryptedStore.card.isSandbox = updates.isSandbox;
      this.encryptedStore.card.updatedAt = new Date().toISOString();
    } else if (gateway === 'cod' && this.encryptedStore.cod) {
      if (updates.isEnabled !== undefined) this.encryptedStore.cod.isEnabled = updates.isEnabled;
      this.encryptedStore.cod.updatedAt = new Date().toISOString();
    }

    this.recordAuditLog({
      id: `audit-${Date.now()}`,
      gateway,
      action: updates.isEnabled !== undefined ? 'STATUS_CHANGED' : 'MODE_SWITCHED',
      adminId,
      adminEmail,
      timestamp: new Date().toISOString(),
      summary: `Updated ${gateway} state: ${JSON.stringify(updates)}`
    });
  }

  /**
   * Decrypt and Retrieve bKash Credentials for Server-side Adapter usage
   */
  public getDecryptedBkashConfig(): DecryptedBkashConfig {
    const config = this.encryptedStore.bkash;
    if (!config) {
      return { appKey: '', appSecret: '', username: '', password: '', isSandbox: true, isEnabled: false };
    }

    return {
      appKey: decryptSecret(config.appKey),
      appSecret: decryptSecret(config.appSecret),
      username: decryptSecret(config.username),
      password: decryptSecret(config.password),
      isSandbox: config.isSandbox,
      isEnabled: config.isEnabled
    };
  }

  /**
   * Decrypt and Retrieve Nagad Credentials for Server-side Adapter usage
   */
  public getDecryptedNagadConfig(): DecryptedNagadConfig {
    const config = this.encryptedStore.nagad;
    if (!config) {
      return { merchantId: '', pgPublicKey: '', merchantPrivateKey: '', isSandbox: true, isEnabled: false };
    }

    return {
      merchantId: decryptSecret(config.merchantId),
      pgPublicKey: decryptSecret(config.pgPublicKey),
      merchantPrivateKey: decryptSecret(config.merchantPrivateKey),
      isSandbox: config.isSandbox,
      isEnabled: config.isEnabled
    };
  }

  /**
   * Decrypt and Retrieve SSLCommerz Credentials for Server-side Adapter usage
   */
  public getDecryptedSSLCommerzConfig(): DecryptedSSLCommerzConfig {
    const config = this.encryptedStore.card;
    if (!config) {
      return { storeId: '', storePassword: '', isSandbox: true, isEnabled: false };
    }

    return {
      storeId: decryptSecret(config.storeId),
      storePassword: decryptSecret(config.storePassword),
      isSandbox: config.isSandbox,
      isEnabled: config.isEnabled
    };
  }

  /**
   * Get Safe Metadata for Admin Panel (NEVER returns plaintext secrets)
   */
  public getAllGatewaysMetadata(): Record<PaymentGatewayType, GatewayMetadataResponse> {
    const bkashDecrypted = this.getDecryptedBkashConfig();
    const bkashConfigured = Boolean(
      bkashDecrypted.appKey && bkashDecrypted.appSecret && bkashDecrypted.username && bkashDecrypted.password
    );

    const nagadDecrypted = this.getDecryptedNagadConfig();
    const nagadConfigured = Boolean(
      nagadDecrypted.merchantId && nagadDecrypted.pgPublicKey && nagadDecrypted.merchantPrivateKey
    );

    const sslDecrypted = this.getDecryptedSSLCommerzConfig();
    const sslConfigured = Boolean(
      sslDecrypted.storeId && sslDecrypted.storePassword
    );

    return {
      bkash: {
        gateway: 'bkash',
        isEnabled: this.encryptedStore.bkash?.isEnabled ?? true,
        isSandbox: this.encryptedStore.bkash?.isSandbox ?? true,
        isConfigured: bkashConfigured,
        configuredFields: [
          ...(bkashDecrypted.appKey ? ['App Key'] : []),
          ...(bkashDecrypted.appSecret ? ['App Secret'] : []),
          ...(bkashDecrypted.username ? ['Username'] : []),
          ...(bkashDecrypted.password ? ['Password'] : [])
        ],
        missingFields: [
          ...(!bkashDecrypted.appKey ? ['App Key'] : []),
          ...(!bkashDecrypted.appSecret ? ['App Secret'] : []),
          ...(!bkashDecrypted.username ? ['Username'] : []),
          ...(!bkashDecrypted.password ? ['Password'] : [])
        ],
        lastUpdated: this.encryptedStore.bkash?.updatedAt
      },
      nagad: {
        gateway: 'nagad',
        isEnabled: this.encryptedStore.nagad?.isEnabled ?? true,
        isSandbox: this.encryptedStore.nagad?.isSandbox ?? true,
        isConfigured: nagadConfigured,
        configuredFields: [
          ...(nagadDecrypted.merchantId ? ['Merchant ID'] : []),
          ...(nagadDecrypted.pgPublicKey ? ['PG Public Key'] : []),
          ...(nagadDecrypted.merchantPrivateKey ? ['Merchant Private Key'] : [])
        ],
        missingFields: [
          ...(!nagadDecrypted.merchantId ? ['Merchant ID'] : []),
          ...(!nagadDecrypted.pgPublicKey ? ['PG Public Key'] : []),
          ...(!nagadDecrypted.merchantPrivateKey ? ['Merchant Private Key'] : [])
        ],
        lastUpdated: this.encryptedStore.nagad?.updatedAt
      },
      card: {
        gateway: 'card',
        isEnabled: this.encryptedStore.card?.isEnabled ?? true,
        isSandbox: this.encryptedStore.card?.isSandbox ?? true,
        isConfigured: sslConfigured,
        configuredFields: [
          ...(sslDecrypted.storeId ? ['Store ID'] : []),
          ...(sslDecrypted.storePassword ? ['Store Password'] : [])
        ],
        missingFields: [
          ...(!sslDecrypted.storeId ? ['Store ID'] : []),
          ...(!sslDecrypted.storePassword ? ['Store Password'] : [])
        ],
        lastUpdated: this.encryptedStore.card?.updatedAt
      },
      cod: {
        gateway: 'cod',
        isEnabled: this.encryptedStore.cod?.isEnabled ?? true,
        isSandbox: false,
        isConfigured: true,
        configuredFields: ['Standard Cash on Delivery Channel'],
        missingFields: [],
        lastUpdated: this.encryptedStore.cod?.updatedAt
      }
    };
  }

  public getAuditLogs(limit = 50): GatewayAuditLogEntry[] {
    return [...this.auditLogs].reverse().slice(0, limit);
  }

  private recordAuditLog(entry: GatewayAuditLogEntry): void {
    this.auditLogs.push(entry);
    if (this.auditLogs.length > 200) {
      this.auditLogs.shift();
    }
  }
}

export const paymentConfigStore = new PaymentConfigStore();
