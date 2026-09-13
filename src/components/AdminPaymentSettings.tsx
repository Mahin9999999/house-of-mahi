import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Lock, 
  Save, 
  RefreshCw, 
  ToggleLeft, 
  ToggleRight, 
  Key, 
  Eye, 
  EyeOff, 
  Activity, 
  Smartphone,
  ExternalLink,
  History,
  Info
} from 'lucide-react';
import { PaymentGatewayType } from '../types';

interface GatewayMetadata {
  gateway: PaymentGatewayType;
  isEnabled: boolean;
  isSandbox: boolean;
  isConfigured: boolean;
  configuredFields: string[];
  missingFields: string[];
  lastUpdated?: string;
}

interface AuditLogEntry {
  id: string;
  gateway: PaymentGatewayType;
  action: string;
  adminId: string;
  adminEmail?: string;
  timestamp: string;
  summary: string;
}

export const AdminPaymentSettings: React.FC = () => {
  const [activeGateway, setActiveGateway] = useState<PaymentGatewayType>('bkash');
  const [gateways, setGateways] = useState<Record<PaymentGatewayType, GatewayMetadata> | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  // Form states for each gateway
  const [bkashForm, setBkashForm] = useState({
    appKey: '',
    appSecret: '',
    username: '',
    password: '',
    isSandbox: true,
    isEnabled: true
  });

  const [nagadForm, setNagadForm] = useState({
    merchantId: '',
    pgPublicKey: '',
    merchantPrivateKey: '',
    isSandbox: true,
    isEnabled: true
  });

  const [sslForm, setSslForm] = useState({
    storeId: '',
    storePassword: '',
    isSandbox: true,
    isEnabled: true
  });

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/payment/config');
      const data = await res.json();
      if (data.success && data.gateways) {
        setGateways(data.gateways);
        if (data.gateways.bkash) {
          setBkashForm(prev => ({
            ...prev,
            isSandbox: data.gateways.bkash.isSandbox,
            isEnabled: data.gateways.bkash.isEnabled
          }));
        }
        if (data.gateways.nagad) {
          setNagadForm(prev => ({
            ...prev,
            isSandbox: data.gateways.nagad.isSandbox,
            isEnabled: data.gateways.nagad.isEnabled
          }));
        }
        if (data.gateways.card) {
          setSslForm(prev => ({
            ...prev,
            isSandbox: data.gateways.card.isSandbox,
            isEnabled: data.gateways.card.isEnabled
          }));
        }
      }

      // Fetch audit logs
      const logRes = await fetch('/api/payment/config-audit-logs');
      const logData = await logRes.json();
      if (logData.success && logData.logs) {
        setAuditLogs(logData.logs);
      }
    } catch (err: any) {
      console.error('Failed to fetch payment config:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSave = async (gateway: PaymentGatewayType) => {
    setSaving(true);
    setStatusMessage(null);
    try {
      let payload: any = {};
      if (gateway === 'bkash') payload = bkashForm;
      else if (gateway === 'nagad') payload = nagadForm;
      else if (gateway === 'card') payload = sslForm;

      const res = await fetch(`/api/payment/config/${gateway}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        setStatusMessage({ type: 'success', text: data.message || `${gateway.toUpperCase()} configuration encrypted and saved.` });
        if (data.gateways) setGateways(data.gateways);
        // Clear plaintext password fields from state for safety
        if (gateway === 'bkash') {
          setBkashForm(prev => ({ ...prev, appSecret: '', password: '' }));
        } else if (gateway === 'nagad') {
          setNagadForm(prev => ({ ...prev, merchantPrivateKey: '' }));
        } else if (gateway === 'card') {
          setSslForm(prev => ({ ...prev, storePassword: '' }));
        }
        fetchConfig();
      } else {
        setStatusMessage({ type: 'error', text: data.message || 'Failed to save configuration.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'An error occurred while saving.' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async (gateway: PaymentGatewayType) => {
    setTesting(true);
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/payment/config/${gateway}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({ type: 'success', text: data.message || 'Gateway connection successful!' });
      } else {
        setStatusMessage({ type: 'error', text: data.message || 'Connection test failed with provided credentials.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Connection test failed.' });
    } finally {
      setTesting(false);
    }
  };

  const handleToggle = async (gateway: PaymentGatewayType, field: 'isEnabled' | 'isSandbox', value: boolean) => {
    try {
      const res = await fetch(`/api/payment/config/${gateway}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      });
      const data = await res.json();
      if (data.success && data.gateways) {
        setGateways(data.gateways);
      }
    } catch (err) {
      console.error('Failed to toggle gateway setting:', err);
    }
  };

  const toggleShowSecret = (fieldKey: string) => {
    setShowSecrets(prev => ({ ...prev, [fieldKey]: !prev[fieldKey] }));
  };

  return (
    <div className="space-y-8">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#800020]/10 text-[#800020] flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-serif font-bold text-stone-900">Payment Gateway Vault & Credentials</h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Manage and encrypt official bKash, Nagad, and Card (SSLCommerz) merchant credentials securely.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            AES-256-GCM Encrypted
          </span>
          <button
            onClick={fetchConfig}
            disabled={loading}
            className="p-2 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-600 text-xs font-medium flex items-center gap-1 transition-all"
            title="Refresh Status"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Status Feedback Banner */}
      {statusMessage && (
        <div className={`p-4 rounded-xl flex items-center justify-between gap-3 text-sm ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border border-rose-200 text-rose-800'
        }`}>
          <div className="flex items-center gap-2.5">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span className="font-medium">{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-xs font-bold hover:underline opacity-80">Dismiss</button>
        </div>
      )}

      {/* Gateway Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        {(['bkash', 'nagad', 'card', 'cod'] as PaymentGatewayType[]).map((gt) => {
          const meta = gateways?.[gt];
          const isSelected = activeGateway === gt;

          return (
            <button
              key={gt}
              onClick={() => setActiveGateway(gt)}
              className={`p-4 rounded-2xl border text-left transition-all ${
                isSelected
                  ? 'border-[#800020] bg-white shadow-md ring-2 ring-[#800020]/10'
                  : 'border-stone-200 bg-white hover:border-stone-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  {gt === 'card' ? 'Cards & Banking' : gt.toUpperCase()}
                </span>
                {meta?.isConfigured ? (
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" title="Configured" />
                ) : (
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" title="Missing Credentials" />
                )}
              </div>
              <div className="font-semibold text-stone-900 flex items-center justify-between">
                <span>{gt === 'bkash' ? 'bKash Checkout' : gt === 'nagad' ? 'Nagad Direct' : gt === 'card' ? 'SSLCommerz' : 'Cash on Delivery'}</span>
              </div>
              <div className="text-xs text-stone-500 mt-2 flex items-center justify-between">
                <span>{meta?.isEnabled ? 'Active' : 'Disabled'}</span>
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-stone-100">
                  {meta?.isSandbox ? 'Sandbox' : 'Live'}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Gateway Configuration Panel */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm">
        {/* bKash Panel */}
        {activeGateway === 'bkash' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-stone-100">
              <div>
                <h3 className="text-lg font-serif font-bold text-stone-900 flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-[#E2136E]" />
                  bKash Tokenized Merchant Configuration
                </h3>
                <p className="text-xs text-stone-500 mt-1">
                  Connect your official bKash Merchant Account API keys (PGW V1.2.0-beta).
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleToggle('bkash', 'isSandbox', !gateways?.bkash?.isSandbox)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    gateways?.bkash?.isSandbox
                      ? 'bg-amber-50 border-amber-200 text-amber-800'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  Mode: {gateways?.bkash?.isSandbox ? 'Sandbox (Test)' : 'Production (Live)'}
                </button>

                <button
                  type="button"
                  onClick={() => handleToggle('bkash', 'isEnabled', !gateways?.bkash?.isEnabled)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    gateways?.bkash?.isEnabled
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-stone-100 text-stone-600 border-stone-200'
                  }`}
                >
                  {gateways?.bkash?.isEnabled ? 'Channel: Enabled' : 'Channel: Disabled'}
                </button>
              </div>
            </div>

            {/* Diagnostic Field Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-stone-50 p-4 rounded-2xl border border-stone-100 text-xs">
              <div>
                <span className="font-bold text-stone-700 block mb-1">Configured Status:</span>
                {gateways?.bkash?.isConfigured ? (
                  <span className="text-emerald-700 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    All required keys encrypted and active in server memory.
                  </span>
                ) : (
                  <span className="text-amber-700 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    Missing credentials: {gateways?.bkash?.missingFields.join(', ')}
                  </span>
                )}
              </div>
              <div>
                <span className="font-bold text-stone-700 block mb-1">Server Callback URL:</span>
                <code className="text-stone-600 bg-white px-2 py-1 rounded border border-stone-200 block truncate">
                  /api/payment/callback/bkash
                </code>
              </div>
            </div>

            {/* Credential Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                  bKash App Key *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={bkashForm.appKey}
                    onChange={e => setBkashForm({ ...bkashForm, appKey: e.target.value })}
                    placeholder={gateways?.bkash?.configuredFields.includes('App Key') ? '•••••••• (Stored Encrypted)' : 'Enter bKash App Key'}
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#800020] text-sm"
                  />
                  <Key className="w-4 h-4 text-stone-400 absolute right-3 top-3.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                  bKash App Secret *
                </label>
                <div className="relative">
                  <input
                    type={showSecrets['bkashSecret'] ? 'text' : 'password'}
                    value={bkashForm.appSecret}
                    onChange={e => setBkashForm({ ...bkashForm, appSecret: e.target.value })}
                    placeholder={gateways?.bkash?.configuredFields.includes('App Secret') ? '•••••••• (Stored Encrypted)' : 'Enter bKash App Secret'}
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#800020] text-sm pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => toggleShowSecret('bkashSecret')}
                    className="absolute right-3 top-3.5 text-stone-400 hover:text-stone-600"
                  >
                    {showSecrets['bkashSecret'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                  bKash API Username *
                </label>
                <input
                  type="text"
                  value={bkashForm.username}
                  onChange={e => setBkashForm({ ...bkashForm, username: e.target.value })}
                  placeholder={gateways?.bkash?.configuredFields.includes('Username') ? '•••••••• (Stored Encrypted)' : 'Enter API Username'}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#800020] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                  bKash API Password *
                </label>
                <div className="relative">
                  <input
                    type={showSecrets['bkashPass'] ? 'text' : 'password'}
                    value={bkashForm.password}
                    onChange={e => setBkashForm({ ...bkashForm, password: e.target.value })}
                    placeholder={gateways?.bkash?.configuredFields.includes('Password') ? '•••••••• (Stored Encrypted)' : 'Enter API Password'}
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#800020] text-sm pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => toggleShowSecret('bkashPass')}
                    className="absolute right-3 top-3.5 text-stone-400 hover:text-stone-600"
                  >
                    {showSecrets['bkashPass'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-stone-100">
              <button
                type="button"
                onClick={() => handleTestConnection('bkash')}
                disabled={testing}
                className="px-5 py-2.5 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-700 text-xs font-semibold flex items-center gap-2 transition-all"
              >
                <Activity className={`w-4 h-4 text-stone-500 ${testing ? 'animate-pulse' : ''}`} />
                {testing ? 'Testing API...' : 'Test Gateway Connection'}
              </button>

              <button
                type="button"
                onClick={() => handleSave('bkash')}
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-[#800020] hover:bg-[#5C0017] text-white text-xs font-semibold flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Encrypting & Saving...' : 'Save & Encrypt bKash Keys'}
              </button>
            </div>
          </div>
        )}

        {/* Nagad Panel */}
        {activeGateway === 'nagad' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-stone-100">
              <div>
                <h3 className="text-lg font-serif font-bold text-stone-900 flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-[#F7941D]" />
                  Nagad Direct Merchant Configuration
                </h3>
                <p className="text-xs text-stone-500 mt-1">
                  Configure Nagad Remote Payment Gateway API V-0.2 keys and RSA certificates.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleToggle('nagad', 'isSandbox', !gateways?.nagad?.isSandbox)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    gateways?.nagad?.isSandbox
                      ? 'bg-amber-50 border-amber-200 text-amber-800'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  Mode: {gateways?.nagad?.isSandbox ? 'Sandbox (Test)' : 'Production (Live)'}
                </button>

                <button
                  type="button"
                  onClick={() => handleToggle('nagad', 'isEnabled', !gateways?.nagad?.isEnabled)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    gateways?.nagad?.isEnabled
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-stone-100 text-stone-600 border-stone-200'
                  }`}
                >
                  {gateways?.nagad?.isEnabled ? 'Channel: Enabled' : 'Channel: Disabled'}
                </button>
              </div>
            </div>

            {/* Diagnostic Field Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-stone-50 p-4 rounded-2xl border border-stone-100 text-xs">
              <div>
                <span className="font-bold text-stone-700 block mb-1">Configured Status:</span>
                {gateways?.nagad?.isConfigured ? (
                  <span className="text-emerald-700 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Nagad merchant credentials active and encrypted.
                  </span>
                ) : (
                  <span className="text-amber-700 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    Missing credentials: {gateways?.nagad?.missingFields.join(', ')}
                  </span>
                )}
              </div>
              <div>
                <span className="font-bold text-stone-700 block mb-1">Server Callback URL:</span>
                <code className="text-stone-600 bg-white px-2 py-1 rounded border border-stone-200 block truncate">
                  /api/payment/callback/nagad
                </code>
              </div>
            </div>

            {/* Credential Inputs */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                  Nagad Merchant ID *
                </label>
                <input
                  type="text"
                  value={nagadForm.merchantId}
                  onChange={e => setNagadForm({ ...nagadForm, merchantId: e.target.value })}
                  placeholder={gateways?.nagad?.configuredFields.includes('Merchant ID') ? '•••••••• (Stored Encrypted)' : 'Enter Nagad Merchant ID (e.g. 68...) '}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#800020] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                  Nagad PG Public Key *
                </label>
                <textarea
                  rows={3}
                  value={nagadForm.pgPublicKey}
                  onChange={e => setNagadForm({ ...nagadForm, pgPublicKey: e.target.value })}
                  placeholder={gateways?.nagad?.configuredFields.includes('PG Public Key') ? '•••••••• (Stored Encrypted)' : 'Paste Nagad Public Key (MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A...)'}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#800020] text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                  Nagad Merchant Private Key *
                </label>
                <textarea
                  rows={3}
                  value={nagadForm.merchantPrivateKey}
                  onChange={e => setNagadForm({ ...nagadForm, merchantPrivateKey: e.target.value })}
                  placeholder={gateways?.nagad?.configuredFields.includes('Merchant Private Key') ? '•••••••• (Stored Encrypted)' : 'Paste Merchant Private Key (MIIEvgIBADANBgkqhkiG9w0BAQEFAASC...)'}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#800020] text-xs font-mono"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-stone-100">
              <button
                type="button"
                onClick={() => handleTestConnection('nagad')}
                disabled={testing}
                className="px-5 py-2.5 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-700 text-xs font-semibold flex items-center gap-2 transition-all"
              >
                <Activity className={`w-4 h-4 text-stone-500 ${testing ? 'animate-pulse' : ''}`} />
                {testing ? 'Testing API...' : 'Test Gateway Connection'}
              </button>

              <button
                type="button"
                onClick={() => handleSave('nagad')}
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-[#800020] hover:bg-[#5C0017] text-white text-xs font-semibold flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Encrypting & Saving...' : 'Save & Encrypt Nagad Keys'}
              </button>
            </div>
          </div>
        )}

        {/* SSLCommerz (Card & Online Banking) */}
        {activeGateway === 'card' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-stone-100">
              <div>
                <h3 className="text-lg font-serif font-bold text-stone-900 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  SSLCommerz (Cards & Net Banking) Configuration
                </h3>
                <p className="text-xs text-stone-500 mt-1">
                  Accept Visa, Mastercard, AMEX, City Touch, NexusPay, and internet banking.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleToggle('card', 'isSandbox', !gateways?.card?.isSandbox)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    gateways?.card?.isSandbox
                      ? 'bg-amber-50 border-amber-200 text-amber-800'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  Mode: {gateways?.card?.isSandbox ? 'Sandbox (Test)' : 'Production (Live)'}
                </button>

                <button
                  type="button"
                  onClick={() => handleToggle('card', 'isEnabled', !gateways?.card?.isEnabled)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    gateways?.card?.isEnabled
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-stone-100 text-stone-600 border-stone-200'
                  }`}
                >
                  {gateways?.card?.isEnabled ? 'Channel: Enabled' : 'Channel: Disabled'}
                </button>
              </div>
            </div>

            {/* Diagnostic Field Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-stone-50 p-4 rounded-2xl border border-stone-100 text-xs">
              <div>
                <span className="font-bold text-stone-700 block mb-1">Configured Status:</span>
                {gateways?.card?.isConfigured ? (
                  <span className="text-emerald-700 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Store credentials encrypted and active.
                  </span>
                ) : (
                  <span className="text-amber-700 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    Missing credentials: {gateways?.card?.missingFields.join(', ')}
                  </span>
                )}
              </div>
              <div>
                <span className="font-bold text-stone-700 block mb-1">Server Callback URL:</span>
                <code className="text-stone-600 bg-white px-2 py-1 rounded border border-stone-200 block truncate">
                  /api/payment/callback/sslcommerz
                </code>
              </div>
            </div>

            {/* Credential Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                  SSLCommerz Store ID *
                </label>
                <input
                  type="text"
                  value={sslForm.storeId}
                  onChange={e => setSslForm({ ...sslForm, storeId: e.target.value })}
                  placeholder={gateways?.card?.configuredFields.includes('Store ID') ? '•••••••• (Stored Encrypted)' : 'Enter Store ID (e.g. house674...)'}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#800020] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                  SSLCommerz Store Password *
                </label>
                <div className="relative">
                  <input
                    type={showSecrets['sslPass'] ? 'text' : 'password'}
                    value={sslForm.storePassword}
                    onChange={e => setSslForm({ ...sslForm, storePassword: e.target.value })}
                    placeholder={gateways?.card?.configuredFields.includes('Store Password') ? '•••••••• (Stored Encrypted)' : 'Enter Store Password'}
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#800020] text-sm pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => toggleShowSecret('sslPass')}
                    className="absolute right-3 top-3.5 text-stone-400 hover:text-stone-600"
                  >
                    {showSecrets['sslPass'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-stone-100">
              <button
                type="button"
                onClick={() => handleTestConnection('card')}
                disabled={testing}
                className="px-5 py-2.5 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-700 text-xs font-semibold flex items-center gap-2 transition-all"
              >
                <Activity className={`w-4 h-4 text-stone-500 ${testing ? 'animate-pulse' : ''}`} />
                {testing ? 'Testing API...' : 'Test Gateway Connection'}
              </button>

              <button
                type="button"
                onClick={() => handleSave('card')}
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-[#800020] hover:bg-[#5C0017] text-white text-xs font-semibold flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Encrypting & Saving...' : 'Save & Encrypt SSLCommerz Keys'}
              </button>
            </div>
          </div>
        )}

        {/* COD Panel */}
        {activeGateway === 'cod' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-stone-100">
              <div>
                <h3 className="text-lg font-serif font-bold text-stone-900 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-stone-700" />
                  Cash on Delivery (COD) Channel
                </h3>
                <p className="text-xs text-stone-500 mt-1">
                  Customer pays cash upon delivery by courier.
                </p>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => handleToggle('cod', 'isEnabled', !gateways?.cod?.isEnabled)}
                  className={`px-4 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
                    gateways?.cod?.isEnabled
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-stone-100 text-stone-600 border-stone-200'
                  }`}
                >
                  {gateways?.cod?.isEnabled ? 'COD Enabled' : 'COD Disabled'}
                </button>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-xs text-stone-600 space-y-2">
              <p className="font-semibold text-stone-800">Cash on Delivery Features:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Automatic courier consignment booking integration (Steadfast / Pathao / RedX).</li>
                <li>Real-time SMS & Email order confirmation tracking.</li>
                <li>Zero gateway processing fee.</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Security Audit History Log */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-serif font-bold text-stone-900 flex items-center gap-2">
            <History className="w-4 h-4 text-stone-500" />
            Gateway Security Audit Log
          </h3>
          <span className="text-xs text-stone-400">Tracking last 50 key mutations</span>
        </div>

        {auditLogs.length === 0 ? (
          <p className="text-xs text-stone-400 italic py-3">No recent credential changes recorded.</p>
        ) : (
          <div className="divide-y divide-stone-100 max-h-60 overflow-y-auto">
            {auditLogs.map((log) => (
              <div key={log.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-stone-800 uppercase mr-2 font-mono">[{log.gateway}]</span>
                  <span className="text-stone-600">{log.summary}</span>
                </div>
                <div className="text-right text-stone-400 shrink-0 ml-4">
                  <span>{new Date(log.timestamp).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
