import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  RefreshCw, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  RotateCcw, 
  Eye, 
  Smartphone, 
  ShieldCheck, 
  Zap, 
  AlertCircle,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Lock,
  ArrowUpDown,
  Check,
  Globe,
  Sliders,
  DollarSign,
  Info
} from 'lucide-react';
import { PaymentMethodConfig, PaymentTransaction, PaymentMethodType, PaymentGatewayType } from '../../types';
import { paymentService } from '../../services/paymentService';

interface GatewayStatusItem {
  isConfigured: boolean;
  isSandbox: boolean;
  isEnabled?: boolean;
  missingKeys: string[];
}

export const PaymentGatewaysModule: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'methods' | 'manual_verification' | 'transactions'>('methods');
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodConfig[]>([]);
  const [gatewayStatus, setGatewayStatus] = useState<Record<string, GatewayStatusItem>>({});
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Transaction filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGateway, setFilterGateway] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedTx, setSelectedTx] = useState<PaymentTransaction | null>(null);
  
  // Refund modal states
  const [refundModalTx, setRefundModalTx] = useState<PaymentTransaction | null>(null);
  const [refundAmount, setRefundAmount] = useState<string>('');
  const [refundReason, setRefundReason] = useState<string>('');
  const [refundLoading, setRefundLoading] = useState<boolean>(false);
  const [refundError, setRefundError] = useState<string | null>(null);

  // Add / Edit Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<Partial<PaymentMethodConfig> | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [credentialsInput, setCredentialsInput] = useState<Record<string, string>>({});
  const [showSecretFields, setShowSecretFields] = useState<Record<string, boolean>>({});

  // Manual verification modal state
  const [verificationModalTx, setVerificationModalTx] = useState<PaymentTransaction | null>(null);
  const [verificationNotes, setVerificationNotes] = useState('');

  // Initial Data Fetching
  const loadData = async () => {
    setLoading(true);
    try {
      const [methods, status, txs] = await Promise.all([
        paymentService.getPaymentMethods(),
        paymentService.getGatewayStatus(),
        paymentService.getTransactions(undefined, 150)
      ]);
      setPaymentMethods(methods);
      setGatewayStatus(status);
      setTransactions(txs);
    } catch (err) {
      console.error('[PaymentGatewaysModule] Error loading payment data:', err);
      setStatusMessage({ type: 'error', text: 'Failed to load live payment configurations.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Subscribe to real-time payment methods
    const unsubscribe = paymentService.subscribePaymentMethods((methods) => {
      setPaymentMethods(methods);
    });

    loadData();
    return () => unsubscribe();
  }, []);

  // Quick message dismisser
  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => setStatusMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  // Toggle active state
  const handleToggle = async (method: PaymentMethodConfig) => {
    try {
      const success = await paymentService.togglePaymentMethod(method.id, method.isEnabled);
      if (success) {
        setStatusMessage({ 
          type: 'success', 
          text: `Payment method "${method.displayName || method.name}" is now ${!method.isEnabled ? 'Enabled' : 'Disabled'}.` 
        });
        const updated = await paymentService.getPaymentMethods();
        setPaymentMethods(updated);
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Failed to toggle status.' });
    }
  };

  // Open Configure / Edit Modal
  const handleOpenEdit = (method: PaymentMethodConfig) => {
    setIsCreatingNew(false);
    setEditingMethod({ ...method });
    setCredentialsInput({});
    setShowSecretFields({});
    setIsEditModalOpen(true);
  };

  // Open Add New Method Modal
  const handleOpenAddNew = () => {
    setIsCreatingNew(true);
    setEditingMethod({
      id: `custom_${Date.now()}`,
      name: '',
      displayName: '',
      type: 'manual_mfs',
      provider: 'manual',
      accountType: 'personal',
      accountNumber: '',
      accountName: '',
      isEnabled: true,
      isSandbox: false,
      sortOrder: (paymentMethods.length + 1) * 10,
      description: '',
      instructionText: '',
      instructions: '',
      badge: 'Manual MFS',
      requiresTransactionId: true,
      requiresSenderNumber: true,
      supportedCurrencies: ['BDT']
    });
    setCredentialsInput({});
    setShowSecretFields({});
    setIsEditModalOpen(true);
  };

  // Save Method Changes
  const handleSaveMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMethod || !editingMethod.name?.trim()) {
      setStatusMessage({ type: 'error', text: 'Payment Method name is required.' });
      return;
    }

    setActionLoading(true);
    try {
      const methodToSave: PaymentMethodConfig = {
        id: editingMethod.id || `pm_${Date.now()}`,
        name: editingMethod.name.trim(),
        displayName: (editingMethod.displayName || editingMethod.name).trim(),
        type: editingMethod.type || 'automated_gateway',
        provider: editingMethod.provider || 'manual',
        accountType: editingMethod.accountType || 'personal',
        accountNumber: editingMethod.accountNumber?.trim() || '',
        accountName: editingMethod.accountName?.trim() || '',
        isEnabled: editingMethod.isEnabled ?? true,
        isSandbox: !!editingMethod.isSandbox,
        sortOrder: Number(editingMethod.sortOrder) || 0,
        badge: editingMethod.badge?.trim() || '',
        description: editingMethod.description?.trim() || '',
        instructionText: editingMethod.instructionText || editingMethod.instructions || '',
        instructions: editingMethod.instructions || editingMethod.instructionText || '',
        chargePercentage: editingMethod.chargePercentage !== undefined ? Number(editingMethod.chargePercentage) : undefined,
        fixedCharge: editingMethod.fixedCharge !== undefined ? Number(editingMethod.fixedCharge) : undefined,
        minOrderAmount: editingMethod.minOrderAmount !== undefined ? Number(editingMethod.minOrderAmount) : undefined,
        maxOrderAmount: editingMethod.maxOrderAmount !== undefined ? Number(editingMethod.maxOrderAmount) : undefined,
        requiresTransactionId: editingMethod.requiresTransactionId ?? true,
        requiresSenderNumber: editingMethod.requiresSenderNumber ?? true,
        credentials: Object.keys(credentialsInput).length > 0 ? credentialsInput : undefined
      };

      const result = await paymentService.savePaymentMethod(methodToSave);

      if (result.success) {
        setStatusMessage({ type: 'success', text: `Configuration for "${methodToSave.displayName}" saved successfully!` });
        setIsEditModalOpen(false);
        const updatedMethods = await paymentService.getPaymentMethods();
        const updatedStatus = await paymentService.getGatewayStatus();
        setPaymentMethods(updatedMethods);
        setGatewayStatus(updatedStatus);
      } else {
        setStatusMessage({ type: 'error', text: result.message || 'Failed to save configuration.' });
      }
    } catch (err: any) {
      console.error('Save method error:', err);
      setStatusMessage({ type: 'error', text: err.message || 'Network error saving configuration.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Custom Payment Method
  const handleDeleteMethod = async (methodId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await paymentService.deletePaymentMethod(methodId);
      if (res.success) {
        setStatusMessage({ type: 'success', text: `Payment method "${name}" was deleted.` });
        const updated = await paymentService.getPaymentMethods();
        setPaymentMethods(updated);
      } else {
        setStatusMessage({ type: 'error', text: res.message || 'Could not delete payment method.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error deleting method.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Manual Payment Verification Handler
  const handleVerifyManualTx = async (action: 'approve' | 'reject') => {
    if (!verificationModalTx) return;
    setActionLoading(true);
    try {
      const res = await paymentService.processAdminManualVerification({
        paymentId: verificationModalTx.id,
        orderId: verificationModalTx.orderId,
        transactionId: verificationModalTx.transactionId,
        action,
        adminNotes: verificationNotes || undefined,
        verifiedBy: 'Admin (Live Panel)'
      });

      if (res.success) {
        setStatusMessage({ type: 'success', text: res.message });
        setVerificationModalTx(null);
        setVerificationNotes('');
        const updatedTxs = await paymentService.getTransactions(undefined, 150);
        setTransactions(updatedTxs);
      } else {
        setStatusMessage({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Verification failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Execute Refund
  const handleExecuteRefund = async () => {
    if (!refundModalTx) return;
    setRefundLoading(true);
    setRefundError(null);
    try {
      const res = await paymentService.refundPayment({
        orderId: refundModalTx.orderId || refundModalTx.orderNumber || refundModalTx.id,
        paymentMethod: (refundModalTx.gateway || refundModalTx.method || 'bkash') as any,
        paymentId: refundModalTx.id,
        transactionId: refundModalTx.transactionId || '',
        amount: parseFloat(refundAmount || refundModalTx.amount.toString()),
        reason: refundReason || 'Merchant initiated refund'
      });
      if (res.success) {
        setRefundModalTx(null);
        setRefundAmount('');
        setRefundReason('');
        setStatusMessage({ type: 'success', text: `Refund of ৳${res.refundedAmount || refundAmount} executed successfully!` });
        const updatedTxs = await paymentService.getTransactions(undefined, 150);
        setTransactions(updatedTxs);
      } else {
        setRefundError(res.message || 'Refund failed');
      }
    } catch (err: any) {
      setRefundError(err.message || 'Refund execution error');
    } finally {
      setRefundLoading(false);
    }
  };

  // Pending Manual Payments list
  const pendingManualPayments = transactions.filter(
    (tx) => (tx.status === 'pending' || tx.status === 'processing') && (tx.type === 'manual_mfs' || !!tx.senderNumber)
  );

  // Filtered Transactions
  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch = 
      (tx.transactionId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.orderNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.customerPhone || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.senderNumber || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesGateway = filterGateway === 'all' || tx.gateway === filterGateway || tx.method === filterGateway;
    const matchesStatus = filterStatus === 'all' || tx.status === filterStatus;

    return matchesSearch && matchesGateway && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Alert Status Banner */}
      {statusMessage && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-semibold shadow-xs ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
            : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="p-1 hover:bg-white/50 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Sub-tab Navigation Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveSubTab('methods')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'methods'
                ? 'bg-[#800020] text-white shadow-md'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <Sliders className="w-4 h-4" />
            Payment Methods ({paymentMethods.length})
          </button>

          <button
            onClick={() => setActiveSubTab('manual_verification')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 relative ${
              activeSubTab === 'manual_verification'
                ? 'bg-[#800020] text-white shadow-md'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <Clock className="w-4 h-4" />
            Pending Verification
            {pendingManualPayments.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-rose-600 text-white font-mono">
                {pendingManualPayments.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('transactions')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'transactions'
                ? 'bg-[#800020] text-white shadow-md'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Transaction Ledger ({transactions.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeSubTab === 'methods' && (
            <button
              onClick={handleOpenAddNew}
              className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Payment Method</span>
            </button>
          )}

          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-600 text-xs font-semibold flex items-center gap-1.5 transition-all"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 1. Payment Methods List */}
      {activeSubTab === 'methods' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {paymentMethods.map((method) => {
              const gwStatus = gatewayStatus[method.provider] || gatewayStatus[method.id];
              const isAutomated = method.type === 'automated_gateway';

              return (
                <div 
                  key={method.id} 
                  className={`bg-white rounded-2xl border transition-all shadow-xs flex flex-col justify-between overflow-hidden ${
                    method.isEnabled ? 'border-stone-200' : 'border-stone-200 bg-stone-50/60 opacity-85'
                  }`}
                >
                  <div className="p-5 space-y-3.5">
                    {/* Card Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                          method.provider === 'bkash' ? 'bg-pink-50 text-pink-600' :
                          method.provider === 'nagad' ? 'bg-amber-50 text-amber-600' :
                          method.provider === 'sslcommerz' || method.provider === 'card' ? 'bg-blue-50 text-blue-600' :
                          'bg-emerald-50 text-emerald-700'
                        }`}>
                          {method.type === 'cash_on_delivery' ? <ShieldCheck className="w-5 h-5" /> :
                           isAutomated ? <Zap className="w-5 h-5" /> : <Smartphone className="w-5 h-5" />}
                        </div>
                        <div>
                          <h3 className="font-bold text-stone-900 text-sm leading-tight">{method.displayName || method.name}</h3>
                          <span className="text-[10px] text-stone-400 font-mono uppercase tracking-wider">
                            {method.type.replace('_', ' ')} • #{method.sortOrder ?? 0}
                          </span>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        method.isEnabled 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-stone-200 text-stone-600'
                      }`}>
                        {method.isEnabled ? 'Active' : 'Disabled'}
                      </span>
                    </div>

                    {/* Description & Account info */}
                    <div className="space-y-1 text-xs">
                      {method.accountNumber && (
                        <div className="flex justify-between items-center p-2 rounded-xl bg-stone-50 border border-stone-100">
                          <span className="text-stone-500 font-medium capitalize">{method.accountType || 'A/C'} No:</span>
                          <span className="font-mono font-bold text-stone-900">{method.accountNumber}</span>
                        </div>
                      )}

                      {method.description && (
                        <p className="text-[11px] text-stone-500 line-clamp-2">{method.description}</p>
                      )}
                    </div>

                    {/* Metadata & Status */}
                    <div className="pt-2 border-t border-stone-100 space-y-1.5 text-[11px] text-stone-600">
                      {isAutomated && (
                        <div className="flex justify-between">
                          <span>Environment:</span>
                          <span className="font-mono font-semibold text-stone-800">
                            {method.isSandbox ? 'Sandbox / Test' : 'Live Production'}
                          </span>
                        </div>
                      )}

                      {isAutomated && gwStatus && (
                        <div className="flex justify-between">
                          <span>Credentials:</span>
                          <span className={`font-semibold ${gwStatus.isConfigured ? 'text-emerald-700' : 'text-amber-600'}`}>
                            {gwStatus.isConfigured ? 'Encrypted & Ready' : 'Pending Keys'}
                          </span>
                        </div>
                      )}

                      {method.chargePercentage ? (
                        <div className="flex justify-between">
                          <span>Gateway Fee:</span>
                          <span className="font-medium text-stone-800">+{method.chargePercentage}%</span>
                        </div>
                      ) : null}

                      {method.badge && (
                        <div className="flex justify-between">
                          <span>Badge:</span>
                          <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 font-semibold">{method.badge}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="p-4 bg-stone-50/80 border-t border-stone-100 flex items-center gap-2">
                    <button
                      onClick={() => handleToggle(method)}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                        method.isEnabled 
                          ? 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200' 
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                      }`}
                    >
                      {method.isEnabled ? 'Disable' : 'Enable'}
                    </button>

                    <button
                      onClick={() => handleOpenEdit(method)}
                      className="px-3 py-2 rounded-xl bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 text-xs font-semibold flex items-center gap-1 transition-all"
                      title="Edit / Configure"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-stone-500" />
                      <span>Edit</span>
                    </button>

                    {!['cod', 'bkash', 'nagad', 'card'].includes(method.id) && (
                      <button
                        onClick={() => handleDeleteMethod(method.id, method.displayName || method.name)}
                        className="p-2 rounded-xl bg-white hover:bg-rose-50 text-rose-600 border border-stone-200 text-xs transition-all"
                        title="Delete Custom Method"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Manual Payment Verification Tab */}
      {activeSubTab === 'manual_verification' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-stone-100 flex items-center justify-between">
              <div>
                <h3 className="font-serif font-bold text-stone-900 text-base">Pending Manual MFS Submissions</h3>
                <p className="text-xs text-stone-500 mt-0.5">Verify customer-submitted bKash / Nagad Transaction IDs (TrxID) and mark orders as paid.</p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                {pendingManualPayments.length} Pending Actions
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider font-semibold border-b border-stone-200">
                  <tr>
                    <th className="px-5 py-3.5">TrxID & Order #</th>
                    <th className="px-5 py-3.5">Method</th>
                    <th className="px-5 py-3.5">Customer & Sender No</th>
                    <th className="px-5 py-3.5">Amount</th>
                    <th className="px-5 py-3.5">Submitted At</th>
                    <th className="px-5 py-3.5 text-right">Verification Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-sans">
                  {pendingManualPayments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-stone-400 italic">
                        No pending manual payments awaiting verification.
                      </td>
                    </tr>
                  ) : (
                    pendingManualPayments.map((tx) => (
                      <tr key={tx.id} className="hover:bg-stone-50/50 transition-colors">
                        <td className="px-5 py-4">
                          <div className="font-mono font-bold text-stone-900 text-sm tracking-wider text-rose-800">{tx.transactionId || '—'}</div>
                          <div className="text-[11px] text-stone-500 font-mono mt-0.5">Order #{tx.orderNumber || tx.orderId}</div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-stone-100 text-stone-700">
                            {tx.paymentMethodName || tx.gateway}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-medium text-stone-900">{tx.customerName || 'Customer'}</div>
                          <div className="text-xs text-stone-600 font-mono mt-0.5">
                            Sender: <span className="font-bold text-stone-900">{tx.senderNumber || tx.customerPhone || '—'}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 font-mono font-bold text-base text-stone-900">
                          ৳{tx.amount.toLocaleString()}
                        </td>
                        <td className="px-5 py-4 text-stone-500 font-mono text-[11px]">
                          {tx.createdAt ? new Date(tx.createdAt).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => {
                              setVerificationModalTx(tx);
                              setVerificationNotes('');
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-[#800020] text-white hover:bg-[#600018] text-xs font-bold transition-all shadow-xs"
                          >
                            Verify & Approve
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. Transaction Ledger Table */}
      {activeSubTab === 'transactions' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search TrxID, order #, phone, sender number, customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#800020] text-xs"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <select
                value={filterGateway}
                onChange={(e) => setFilterGateway(e.target.value)}
                className="px-3 py-2 rounded-xl border border-stone-200 text-xs bg-white text-stone-700 focus:outline-none focus:ring-2 focus:ring-[#800020]"
              >
                <option value="all">All Gateways / Methods</option>
                <option value="bkash">bKash</option>
                <option value="nagad">Nagad</option>
                <option value="sslcommerz">SSLCommerz / Card</option>
                <option value="manual">Manual MFS</option>
                <option value="cod">Cash on Delivery</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 rounded-xl border border-stone-200 text-xs bg-white text-stone-700 focus:outline-none focus:ring-2 focus:ring-[#800020]"
              >
                <option value="all">All Statuses</option>
                <option value="completed">Completed / Paid</option>
                <option value="verified">Verified (Manual)</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="rejected">Rejected</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50/80 text-stone-500 uppercase tracking-wider font-semibold border-b border-stone-200">
                  <tr>
                    <th className="px-5 py-3.5">Trx ID & Order</th>
                    <th className="px-5 py-3.5">Channel / Method</th>
                    <th className="px-5 py-3.5">Customer & Sender</th>
                    <th className="px-5 py-3.5">Amount</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Date & Time</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-sans">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-10 text-center text-stone-400 italic">
                        No payment transactions found matching the current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-stone-50/50 transition-colors">
                        <td className="px-5 py-4">
                          <div className="font-mono font-bold text-stone-900">{tx.transactionId || tx.id}</div>
                          <div className="text-[10px] text-stone-400 mt-0.5">Order #{tx.orderNumber || tx.orderId}</div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-stone-100 text-stone-700">
                            {tx.paymentMethodName || tx.gateway || tx.method}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-medium text-stone-800">{tx.customerName || 'N/A'}</div>
                          <div className="text-[10px] text-stone-400 font-mono">
                            {tx.senderNumber ? `Sender: ${tx.senderNumber}` : (tx.customerPhone || '—')}
                          </div>
                        </td>
                        <td className="px-5 py-4 font-mono font-bold text-stone-900">
                          ৳{tx.amount.toLocaleString()}
                        </td>
                        <td className="px-5 py-4">
                          {tx.status === 'completed' || tx.status === 'verified' || tx.status === 'paid' ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] font-semibold border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> Paid / Verified
                            </span>
                          ) : tx.status === 'refunded' ? (
                            <span className="inline-flex items-center gap-1 text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full text-[10px] font-semibold border border-purple-200">
                              <RotateCcw className="w-3 h-3" /> Refunded
                            </span>
                          ) : tx.status === 'rejected' || tx.status === 'failed' ? (
                            <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full text-[10px] font-semibold border border-rose-200">
                              <XCircle className="w-3 h-3" /> {tx.status === 'rejected' ? 'Rejected' : 'Failed'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full text-[10px] font-semibold border border-amber-200">
                              <Clock className="w-3 h-3" /> Pending
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-stone-500 font-mono text-[11px]">
                          {tx.createdAt ? new Date(tx.createdAt).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                        </td>
                        <td className="px-5 py-4 text-right space-x-2">
                          <button
                            onClick={() => setSelectedTx(tx)}
                            className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-100 text-stone-600 inline-flex items-center"
                            title="View Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {(tx.status === 'completed' || tx.status === 'paid' || tx.status === 'verified') && (
                            <button
                              onClick={() => {
                                setRefundModalTx(tx);
                                setRefundAmount(tx.amount.toString());
                                setRefundReason('');
                                setRefundError(null);
                              }}
                              className="p-1.5 rounded-lg border border-stone-200 hover:bg-rose-50 text-rose-600 inline-flex items-center"
                              title="Issue Gateway Refund"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT PAYMENT METHOD (100% Configurable & Real-Time)          */}
      {/* ========================================================================= */}
      {isEditModalOpen && editingMethod && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-stone-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-xs z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#800020]/10 text-[#800020] flex items-center justify-center">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-stone-900 text-base">
                    {isCreatingNew ? 'Add New Payment Method' : `Configure: ${editingMethod.displayName || editingMethod.name}`}
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">Control live payment options, account numbers, and encrypted credentials.</p>
                </div>
              </div>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 rounded-xl hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMethod} className="p-6 space-y-5 text-xs">
              {/* Method Basic Identifiers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-stone-700">Internal Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. bKash Personal"
                    value={editingMethod.name || ''}
                    onChange={(e) => setEditingMethod({ ...editingMethod, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-[#800020] focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-stone-700">Customer Display Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. bKash Personal (Send Money)"
                    value={editingMethod.displayName || ''}
                    onChange={(e) => setEditingMethod({ ...editingMethod, displayName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-[#800020] focus:outline-none"
                  />
                </div>
              </div>

              {/* Type and Provider Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-stone-700">Payment Type</label>
                  <select
                    value={editingMethod.type || 'automated_gateway'}
                    disabled={!isCreatingNew && ['bkash', 'nagad', 'card', 'cod'].includes(editingMethod.id || '')}
                    onChange={(e) => setEditingMethod({ ...editingMethod, type: e.target.value as PaymentMethodType })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-[#800020] focus:outline-none bg-white font-medium"
                  >
                    <option value="automated_gateway">Automated Gateway API</option>
                    <option value="manual_mfs">Manual MFS (Send Money)</option>
                    <option value="cash_on_delivery">Cash On Delivery</option>
                    <option value="custom">Custom Bank Transfer</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-stone-700">Provider Brand</label>
                  <select
                    value={editingMethod.provider || 'bkash'}
                    disabled={!isCreatingNew && ['bkash', 'nagad', 'card', 'cod'].includes(editingMethod.id || '')}
                    onChange={(e) => setEditingMethod({ ...editingMethod, provider: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-[#800020] focus:outline-none bg-white font-medium capitalize"
                  >
                    <option value="bkash">bKash</option>
                    <option value="nagad">Nagad</option>
                    <option value="sslcommerz">SSLCommerz / Cards</option>
                    <option value="cod">Cash on Delivery</option>
                    <option value="manual">Manual MFS / Bank</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-stone-700">Sort Display Order</label>
                  <input
                    type="number"
                    value={editingMethod.sortOrder ?? 0}
                    onChange={(e) => setEditingMethod({ ...editingMethod, sortOrder: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-[#800020] focus:outline-none"
                  />
                </div>
              </div>

              {/* Account Number & Info (For Manual MFS or Direct Info) */}
              {(editingMethod.type === 'manual_mfs' || editingMethod.accountNumber !== undefined) && (
                <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-4">
                  <div className="flex items-center gap-2 font-bold text-amber-900">
                    <Smartphone className="w-4 h-4 text-amber-700" />
                    <span>MFS & Receiving Account Information</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="font-bold text-stone-700">Account Type</label>
                      <select
                        value={editingMethod.accountType || 'personal'}
                        onChange={(e) => setEditingMethod({ ...editingMethod, accountType: e.target.value as any })}
                        className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white"
                      >
                        <option value="personal">Personal (Send Money)</option>
                        <option value="merchant">Merchant (Payment)</option>
                        <option value="agent">Agent (Cash In)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="font-bold text-stone-700">Account Mobile / A/C Number *</label>
                      <input
                        type="text"
                        placeholder="e.g. 017XXXXXXXX"
                        value={editingMethod.accountNumber || ''}
                        onChange={(e) => setEditingMethod({ ...editingMethod, accountNumber: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-[#800020] font-mono text-sm font-bold"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Automated Gateway Credential Configuration */}
              {editingMethod.type === 'automated_gateway' && (
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-stone-800">
                      <Lock className="w-4 h-4 text-stone-600" />
                      <span>AES-256-GCM Encrypted Gateway Credentials</span>
                    </div>
                    <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Server-Side Encrypted
                    </span>
                  </div>

                  {editingMethod.provider === 'bkash' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <label className="font-medium text-stone-600">bKash App Key</label>
                        <input
                          type="text"
                          placeholder="Enter new App Key"
                          value={credentialsInput.appKey || ''}
                          onChange={(e) => setCredentialsInput({ ...credentialsInput, appKey: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white font-mono text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-medium text-stone-600">bKash App Secret</label>
                        <input
                          type={showSecretFields['appSecret'] ? 'text' : 'password'}
                          placeholder="Enter new App Secret (masked)"
                          value={credentialsInput.appSecret || ''}
                          onChange={(e) => setCredentialsInput({ ...credentialsInput, appSecret: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white font-mono text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-medium text-stone-600">bKash Username</label>
                        <input
                          type="text"
                          placeholder="Merchant Username"
                          value={credentialsInput.username || ''}
                          onChange={(e) => setCredentialsInput({ ...credentialsInput, username: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white font-mono text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-medium text-stone-600">bKash Password</label>
                        <input
                          type="password"
                          placeholder="Merchant Password"
                          value={credentialsInput.password || ''}
                          onChange={(e) => setCredentialsInput({ ...credentialsInput, password: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white font-mono text-xs"
                        />
                      </div>
                    </div>
                  )}

                  {editingMethod.provider === 'nagad' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <label className="font-medium text-stone-600">Nagad Merchant ID</label>
                        <input
                          type="text"
                          placeholder="e.g. 68XXXXXXXX"
                          value={credentialsInput.merchantId || ''}
                          onChange={(e) => setCredentialsInput({ ...credentialsInput, merchantId: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white font-mono text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-medium text-stone-600">Nagad PG Public Key</label>
                        <input
                          type="password"
                          placeholder="Public Key"
                          value={credentialsInput.pgPublicKey || ''}
                          onChange={(e) => setCredentialsInput({ ...credentialsInput, pgPublicKey: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white font-mono text-xs"
                        />
                      </div>

                      <div className="space-y-1 sm:col-span-2">
                        <label className="font-medium text-stone-600">Nagad Merchant Private Key (PEM format)</label>
                        <textarea
                          rows={3}
                          placeholder="-----BEGIN RSA PRIVATE KEY-----..."
                          value={credentialsInput.merchantPrivateKey || ''}
                          onChange={(e) => setCredentialsInput({ ...credentialsInput, merchantPrivateKey: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white font-mono text-[11px]"
                        />
                      </div>
                    </div>
                  )}

                  {(editingMethod.provider === 'sslcommerz' || editingMethod.provider === 'card') && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <label className="font-medium text-stone-600">Store ID</label>
                        <input
                          type="text"
                          placeholder="e.g. houseofmahi_live"
                          value={credentialsInput.storeId || ''}
                          onChange={(e) => setCredentialsInput({ ...credentialsInput, storeId: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white font-mono text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-medium text-stone-600">Store Password</label>
                        <input
                          type="password"
                          placeholder="Store Password"
                          value={credentialsInput.storePassword || ''}
                          onChange={(e) => setCredentialsInput({ ...credentialsInput, storePassword: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-white font-mono text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Instructions & Description */}
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-stone-700">Customer Instructions (Shown during checkout)</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Send Money to 017XXXXXXXX, then enter your TrxID and mobile number below."
                    value={editingMethod.instructions || editingMethod.instructionText || ''}
                    onChange={(e) => setEditingMethod({ 
                      ...editingMethod, 
                      instructions: e.target.value,
                      instructionText: e.target.value 
                    })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-[#800020] focus:outline-none"
                  />
                </div>
              </div>

              {/* Status & Environment Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-stone-100">
                <label className="flex items-center gap-3 p-3 rounded-xl border border-stone-200 cursor-pointer hover:bg-stone-50">
                  <input
                    type="checkbox"
                    checked={editingMethod.isEnabled !== false}
                    onChange={(e) => setEditingMethod({ ...editingMethod, isEnabled: e.target.checked })}
                    className="w-4 h-4 accent-[#800020] rounded"
                  />
                  <div>
                    <div className="font-bold text-stone-800">Enable Method</div>
                    <div className="text-[10px] text-stone-400">Visible to customers in checkout</div>
                  </div>
                </label>

                {editingMethod.type === 'automated_gateway' && (
                  <label className="flex items-center gap-3 p-3 rounded-xl border border-stone-200 cursor-pointer hover:bg-stone-50">
                    <input
                      type="checkbox"
                      checked={!!editingMethod.isSandbox}
                      onChange={(e) => setEditingMethod({ ...editingMethod, isSandbox: e.target.checked })}
                      className="w-4 h-4 accent-[#800020] rounded"
                    />
                    <div>
                      <div className="font-bold text-stone-800">Sandbox / Test Mode</div>
                      <div className="text-[10px] text-stone-400">Use test APIs instead of real money</div>
                    </div>
                  </label>
                )}
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-100 font-semibold"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-2.5 rounded-xl bg-[#800020] hover:bg-[#600018] text-white font-bold flex items-center gap-2 shadow-md transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>{actionLoading ? 'Saving...' : 'Save Configuration'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: MANUAL TRANSACTION VERIFICATION                                    */}
      {/* ========================================================================= */}
      {verificationModalTx && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-sm">Verify Manual Payment</h3>
                  <p className="text-[11px] text-stone-500 font-mono">Order #{verificationModalTx.orderNumber || verificationModalTx.orderId}</p>
                </div>
              </div>
              <button onClick={() => setVerificationModalTx(null)} className="p-1 text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs bg-stone-50 p-4 rounded-2xl border border-stone-100">
              <div className="flex justify-between">
                <span className="text-stone-500">Method:</span>
                <span className="font-bold text-stone-900">{verificationModalTx.paymentMethodName || verificationModalTx.gateway}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Submitted TrxID:</span>
                <span className="font-mono font-bold text-rose-800 text-sm">{verificationModalTx.transactionId || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Sender Number:</span>
                <span className="font-mono font-bold text-stone-900">{verificationModalTx.senderNumber || verificationModalTx.customerPhone || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Total Payable Amount:</span>
                <span className="font-mono font-bold text-base text-stone-900">৳{verificationModalTx.amount.toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-stone-700">Admin Notes (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Verified via bKash Merchant SMS statement"
                value={verificationNotes}
                onChange={(e) => setVerificationNotes(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#800020]"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleVerifyManualTx('reject')}
                className="px-4 py-2.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 font-bold text-xs transition-colors"
              >
                Reject Payment
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleVerifyManualTx('approve')}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{actionLoading ? 'Verifying...' : 'Approve & Mark Paid'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: TRANSACTION DETAILS                                                */}
      {/* ========================================================================= */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-serif font-bold text-stone-900 text-base">Transaction Details</h3>
              <button onClick={() => setSelectedTx(null)} className="p-1 text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-2.5 text-xs text-stone-600 font-sans">
              <div className="flex justify-between py-1 border-b border-stone-100">
                <span>Transaction ID:</span>
                <span className="font-mono font-bold text-stone-900">{selectedTx.transactionId || selectedTx.id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-100">
                <span>Order Reference:</span>
                <span className="font-mono text-stone-900">#{selectedTx.orderNumber || selectedTx.orderId}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-100">
                <span>Channel:</span>
                <span className="font-bold uppercase text-stone-800">{selectedTx.paymentMethodName || selectedTx.gateway}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-100">
                <span>Amount:</span>
                <span className="font-mono font-bold text-stone-900 text-sm">৳{selectedTx.amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-100">
                <span>Status:</span>
                <span className="font-bold capitalize text-stone-800">{selectedTx.status}</span>
              </div>
              {selectedTx.senderNumber && (
                <div className="flex justify-between py-1 border-b border-stone-100">
                  <span>Sender Mobile:</span>
                  <span className="font-mono font-bold text-stone-900">{selectedTx.senderNumber}</span>
                </div>
              )}
              {selectedTx.verifiedBy && (
                <div className="flex justify-between py-1 border-b border-stone-100">
                  <span>Verified By:</span>
                  <span className="font-medium text-emerald-700">{selectedTx.verifiedBy}</span>
                </div>
              )}
              {selectedTx.notes && (
                <div className="py-1">
                  <span className="text-stone-500">Notes:</span>
                  <p className="mt-0.5 text-stone-800 bg-stone-50 p-2 rounded-xl border border-stone-100">{selectedTx.notes}</p>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                onClick={() => setSelectedTx(null)}
                className="w-full py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REFUND TRANSACTION                                                 */}
      {/* ========================================================================= */}
      {refundModalTx && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2 text-rose-800 font-bold">
                <RotateCcw className="w-5 h-5" />
                <span>Issue Gateway Refund</span>
              </div>
              <button onClick={() => setRefundModalTx(null)} className="p-1 text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {refundError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
                {refundError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-100 space-y-1">
                <div className="flex justify-between">
                  <span className="text-stone-500">Transaction:</span>
                  <span className="font-mono font-bold text-stone-800">{refundModalTx.transactionId || refundModalTx.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Paid Amount:</span>
                  <span className="font-mono font-bold text-stone-900">৳{refundModalTx.amount.toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700">Refund Amount (BDT) *</label>
                <input
                  type="number"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#800020] font-mono font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700">Refund Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Customer requested cancellation"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#800020]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setRefundModalTx(null)}
                className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-100 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={refundLoading}
                onClick={handleExecuteRefund}
                className="px-5 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs shadow-md flex items-center gap-1.5"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${refundLoading ? 'animate-spin' : ''}`} />
                <span>{refundLoading ? 'Processing...' : 'Confirm Refund'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
