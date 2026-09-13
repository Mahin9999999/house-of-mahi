import React, { useState } from 'react';
import { 
  Truck, 
  Plus, 
  Settings2, 
  CheckCircle2, 
  XCircle, 
  ArrowUp, 
  ArrowDown, 
  Radio, 
  KeyRound, 
  Save, 
  RefreshCw, 
  ShieldCheck, 
  AlertTriangle,
  Zap,
  Globe,
  Trash2,
  Lock,
  Eye,
  EyeOff,
  Copy,
  Check,
  Building2,
  Phone,
  MapPin,
  Sparkles,
  Link as LinkIcon,
  CheckSquare,
  Square
} from 'lucide-react';
import { useAdminStore } from '../../store/useAdminStore';
import { CourierServiceConfig, CourierProviderId } from '../../types';
import { testCourierConnectionViaServer, generateCourierTokenViaServer } from '../../services/courierService';

interface ProviderMeta {
  id: CourierProviderId;
  name: string;
  badge: string;
  defaultBaseUrl: string;
  hasApi: boolean;
  note: string;
  logoBg: string;
  logoText: string;
}

const PROVIDER_METADATA: Record<CourierProviderId, ProviderMeta> = {
  steadfast: {
    id: 'steadfast',
    name: 'Steadfast Courier',
    badge: 'Packzy API v1',
    defaultBaseUrl: 'https://portal.packzy.com/api/v1',
    hasApi: true,
    note: 'Supports 1-click parcel creation, live balance inquiry, webhook callbacks and consignment tracking.',
    logoBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    logoText: 'ST'
  },
  pathao: {
    id: 'pathao',
    name: 'Pathao Courier',
    badge: 'Aladdin OAuth 2.0',
    defaultBaseUrl: 'https://api-hermes.pathao.com',
    hasApi: true,
    note: 'Official Aladdin API with OAuth credentials, Store ID integration, and direct token generation.',
    logoBg: 'bg-red-50 text-red-700 border-red-200',
    logoText: 'PT'
  },
  redx: {
    id: 'redx',
    name: 'RedX Logistics',
    badge: 'Open API v1',
    defaultBaseUrl: 'https://openapi.redx.com.bd/v1.0.0-beta',
    hasApi: true,
    note: 'Official RedX Open API integration with Bearer Access Token authentication.',
    logoBg: 'bg-rose-50 text-rose-700 border-rose-200',
    logoText: 'RX'
  },
  paperfly: {
    id: 'paperfly',
    name: 'Paperfly Courier',
    badge: 'Merchant API',
    defaultBaseUrl: 'https://api.paperfly.com.bd',
    hasApi: true,
    note: 'Doorstep parcel delivery network across Bangladesh.',
    logoBg: 'bg-blue-50 text-blue-700 border-blue-200',
    logoText: 'PF'
  },
  ecourier: {
    id: 'ecourier',
    name: 'eCourier',
    badge: 'Enterprise API',
    defaultBaseUrl: 'https://backoffice.ecourier.com.bd/api',
    hasApi: true,
    note: 'Enterprise API for doorstep delivery and real-time tracking.',
    logoBg: 'bg-amber-50 text-amber-700 border-amber-200',
    logoText: 'EC'
  },
  sundarban: {
    id: 'sundarban',
    name: 'Sundarban Courier',
    badge: 'Branch API',
    defaultBaseUrl: 'https://api.sundarbancourier.com',
    hasApi: true,
    note: 'Direct consignment booking for Sundarban service points.',
    logoBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    logoText: 'SC'
  },
  custom: {
    id: 'custom',
    name: 'Custom / Offline Courier',
    badge: 'Manual Dispatch',
    defaultBaseUrl: '',
    hasApi: false,
    note: 'Ideal for local delivery boys or offline delivery without API credentials.',
    logoBg: 'bg-stone-100 text-stone-700 border-stone-200',
    logoText: 'MN'
  }
};

export const CourierModule: React.FC = () => {
  const { 
    couriers, 
    updateCourierConfig, 
    setDefaultCourier, 
    setCourierPriority,
    addCourierConfig,
    deleteCourierConfig,
    orders
  } = useAdminStore();

  const [selectedCourier, setSelectedCourier] = useState<CourierServiceConfig | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [modalTesting, setModalTesting] = useState(false);
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);
  const [tokenGenResult, setTokenGenResult] = useState<{ success: boolean; message: string } | null>(null);
  
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null);
  const [modalTestResult, setModalTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Field visibility toggles
  const [showApiKey, setShowApiKey] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [showWebhookBearer, setShowWebhookBearer] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showAccessToken, setShowAccessToken] = useState(false);

  // Form State for edit / create
  const [formData, setFormData] = useState<Partial<CourierServiceConfig> & {
    username?: string;
    password?: string;
    accessToken?: string;
  }>({
    name: '',
    provider: 'steadfast',
    isActive: true,
    isDefault: false,
    priority: 1,
    apiKey: '',
    secretKey: '',
    apiBaseUrl: 'https://portal.packzy.com/api/v1',
    merchantId: '',
    webhookSecret: '',
    username: '',
    password: '',
    accessToken: '',
    senderName: 'HouseOfMahi',
    senderPhone: '',
    senderAddress: '',
    autoAssignOnConfirm: true,
    notes: ''
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);

  // Quick metrics
  const activeCouriers = couriers.filter(c => c.isActive);
  const defaultCourier = couriers.find(c => c.isDefault) || couriers[0];
  const bookedOrdersCount = orders.filter(o => o.courierBookingStatus === 'booked').length;
  const failedBookingsCount = orders.filter(o => o.courierBookingStatus === 'failed').length;

  const currentProvider = (formData.provider as CourierProviderId) || 'steadfast';
  const currentProviderMeta = PROVIDER_METADATA[currentProvider] || PROVIDER_METADATA.steadfast;

  const getWebhookUrl = (provider: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/api/courier/webhook/${provider}`;
  };

  const handleCopyText = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 3000);
  };

  const handleOpenEdit = (courier: CourierServiceConfig) => {
    setSelectedCourier(courier);
    
    // Parse any courier-specific auxiliary fields if stored in notes or merchantId
    let parsedUsername = courier.merchantId || '';
    let parsedPassword = '';
    let parsedAccessToken = '';
    
    if (courier.provider === 'pathao') {
      parsedUsername = courier.merchantId || '';
      parsedPassword = courier.webhookSecret || '';
      parsedAccessToken = courier.notes?.startsWith('TOKEN:') ? courier.notes.replace('TOKEN:', '') : '';
    }

    setFormData({ 
      ...courier,
      username: parsedUsername,
      password: parsedPassword,
      accessToken: parsedAccessToken
    });
    
    setIsEditing(true);
    setIsCreating(false);
    setTestResult(null);
    setModalTestResult(null);
    setTokenGenResult(null);
    setSaveErrorMsg(null);
    setShowApiKey(false);
    setShowSecretKey(false);
    setShowWebhookBearer(false);
    setShowPassword(false);
    setShowAccessToken(false);
  };

  const handleOpenCreate = () => {
    const nextPriority = (couriers.length || 0) + 1;
    setSelectedCourier(null);
    setFormData({
      name: 'Steadfast Courier',
      provider: 'steadfast',
      isActive: true,
      isDefault: couriers.length === 0,
      priority: nextPriority,
      apiKey: '',
      secretKey: '',
      apiBaseUrl: 'https://portal.packzy.com/api/v1',
      merchantId: '',
      webhookSecret: '',
      username: '',
      password: '',
      accessToken: '',
      senderName: 'HouseOfMahi',
      senderPhone: '',
      senderAddress: '',
      autoAssignOnConfirm: true,
      notes: ''
    });
    setIsCreating(true);
    setIsEditing(true);
    setTestResult(null);
    setModalTestResult(null);
    setTokenGenResult(null);
    setSaveErrorMsg(null);
    setShowApiKey(false);
    setShowSecretKey(false);
    setShowWebhookBearer(false);
    setShowPassword(false);
    setShowAccessToken(false);
  };

  const handleProviderChange = (newProvider: CourierProviderId) => {
    const meta = PROVIDER_METADATA[newProvider] || PROVIDER_METADATA.steadfast;
    
    let newName = meta.name;
    if (newProvider === 'steadfast') newName = 'Steadfast Courier';
    else if (newProvider === 'pathao') newName = 'Pathao Courier';
    else if (newProvider === 'redx') newName = 'RedX Logistics';

    setFormData({
      ...formData,
      provider: newProvider,
      name: newName,
      apiBaseUrl: meta.defaultBaseUrl || '',
    });
    setModalTestResult(null);
    setTokenGenResult(null);
    setSaveErrorMsg(null);
  };

  // Generate Pathao Access Token Flow
  const handleGeneratePathaoToken = async () => {
    if (!formData.apiKey?.trim() || !formData.secretKey?.trim()) {
      setTokenGenResult({
        success: false,
        message: 'Client ID এবং Client Secret প্রদান করা আবশ্যক।'
      });
      return;
    }

    if (!formData.username?.trim() || !formData.password?.trim()) {
      setTokenGenResult({
        success: false,
        message: 'Pathao Username / Email এবং Password প্রদান করা আবশ্যক।'
      });
      return;
    }

    setIsGeneratingToken(true);
    setTokenGenResult(null);

    try {
      // Exchange credentials for real OAuth 2.0 Access Token via Server-Side route
      const tokenConfig: CourierServiceConfig = {
        id: selectedCourier?.id || 'pathao-temp',
        name: formData.name || 'Pathao Courier',
        provider: 'pathao',
        apiKey: formData.apiKey ? formData.apiKey.trim() : '',
        secretKey: formData.secretKey ? formData.secretKey.trim() : '',
        apiBaseUrl: formData.apiBaseUrl ? formData.apiBaseUrl.trim() : 'https://api-hermes.pathao.com',
        merchantId: formData.username ? formData.username.trim() : '',
        webhookSecret: formData.password ? formData.password.trim() : '',
        isActive: formData.isActive ?? true,
        isDefault: formData.isDefault ?? false,
        priority: formData.priority ?? 1,
        autoAssignOnConfirm: formData.autoAssignOnConfirm ?? true
      };

      const res = await generateCourierTokenViaServer(tokenConfig);
      
      if (res.success && res.accessToken) {
        setFormData(prev => ({ ...prev, accessToken: res.accessToken }));
        setTokenGenResult({
          success: true,
          message: res.message || 'Pathao OAuth 2.0 টোকেন সফলভাবে জেনারেট ও যাচাই হয়েছে।'
        });
      } else {
        setTokenGenResult({
          success: false,
          message: res.message || res.error || 'Pathao API সার্ভারে অথেন্টিকেশন ব্যর্থ হয়েছে। ক্রেডেনশিয়াল পরীক্ষা করুন।'
        });
      }
    } catch {
      setTokenGenResult({
        success: false,
        message: 'Pathao সার্ভারের সাথে সংযোগ স্থাপন করা সম্ভব হয়নি। ক্রেডেনশিয়াল যাচাই করুন।'
      });
    } finally {
      setIsGeneratingToken(false);
    }
  };

  const handleTestModalConnection = async () => {
    if (!currentProviderMeta.hasApi) {
      setModalTestResult({
        success: true,
        message: 'Offline / Manual Courier মোডে কোনো API সংযোগের প্রয়োজন নেই।'
      });
      return;
    }

    if (currentProvider === 'steadfast') {
      if (!formData.apiKey?.trim() || !formData.secretKey?.trim()) {
        setModalTestResult({
          success: false,
          message: 'Steadfast API Key এবং Secret Key দুটোই প্রদান করতে হবে।'
        });
        return;
      }
    } else if (currentProvider === 'pathao') {
      if (!formData.apiKey?.trim() || !formData.secretKey?.trim()) {
        setModalTestResult({
          success: false,
          message: 'Pathao Client ID এবং Client Secret আবশ্যক।'
        });
        return;
      }
    } else if (currentProvider === 'redx') {
      if (!formData.apiKey?.trim()) {
        setModalTestResult({
          success: false,
          message: 'RedX API Access Token প্রদান করতে হবে।'
        });
        return;
      }
    }

    setModalTesting(true);
    setModalTestResult(null);

    const testPayload: CourierServiceConfig = {
      id: selectedCourier?.id || `${formData.provider || 'steadfast'}-temp`,
      name: formData.name || 'Test Courier',
      provider: currentProvider,
      apiKey: formData.apiKey ? formData.apiKey.trim() : '',
      secretKey: formData.secretKey ? formData.secretKey.trim() : '',
      apiBaseUrl: formData.apiBaseUrl ? formData.apiBaseUrl.trim() : currentProviderMeta.defaultBaseUrl,
      merchantId: currentProvider === 'pathao' ? (formData.username?.trim() || formData.merchantId?.trim() || '') : (formData.merchantId ? formData.merchantId.trim() : ''),
      webhookSecret: currentProvider === 'pathao' ? (formData.password?.trim() || formData.webhookSecret?.trim() || '') : (formData.webhookSecret ? formData.webhookSecret.trim() : ''),
      senderName: formData.senderName ? formData.senderName.trim() : 'HouseOfMahi',
      senderPhone: formData.senderPhone ? formData.senderPhone.trim() : '',
      senderAddress: formData.senderAddress ? formData.senderAddress.trim() : '',
      isActive: formData.isActive ?? true,
      isDefault: formData.isDefault ?? false,
      priority: formData.priority ?? 1,
      autoAssignOnConfirm: formData.autoAssignOnConfirm ?? true,
      notes: formData.accessToken ? `TOKEN:${formData.accessToken}` : (formData.notes || '')
    };

    try {
      const res = await testCourierConnectionViaServer(testPayload);
      setModalTestResult({
        success: res.success,
        message: res.message
      });
    } catch {
      setModalTestResult({
        success: false,
        message: 'কুরিয়ার সার্ভিস এন্ডপয়েন্টে সংযোগ স্থাপন করা যায়নি বা ক্রেডেনশিয়াল ভুল।'
      });
    } finally {
      setModalTesting(false);
    }
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim() || !formData.provider) {
      setSaveErrorMsg('কুরিয়ার নাম এবং প্রোভাইডার নির্বাচন করা আবশ্যক।');
      return;
    }

    // Courier-specific validations
    if (currentProvider === 'steadfast') {
      if (!formData.apiKey?.trim()) {
        setSaveErrorMsg('Steadfast API KEY আবশ্যক।');
        return;
      }
      if (!formData.secretKey?.trim()) {
        setSaveErrorMsg('Steadfast SECRET KEY আবশ্যক।');
        return;
      }
    } else if (currentProvider === 'pathao') {
      if (!formData.apiBaseUrl?.trim()) {
        setSaveErrorMsg('Pathao API URL আবশ্যক।');
        return;
      }
      if (!formData.apiKey?.trim()) {
        setSaveErrorMsg('Pathao CLIENT ID আবশ্যক।');
        return;
      }
      if (!formData.secretKey?.trim()) {
        setSaveErrorMsg('Pathao CLIENT SECRET আবশ্যক।');
        return;
      }
      if (!formData.username?.trim()) {
        setSaveErrorMsg('Pathao USERNAME / EMAIL আবশ্যক।');
        return;
      }
      if (!formData.password?.trim()) {
        setSaveErrorMsg('Pathao PASSWORD আবশ্যক।');
        return;
      }
    } else if (currentProvider === 'redx') {
      if (!formData.apiBaseUrl?.trim()) {
        setSaveErrorMsg('RedX BASE URL আবশ্যক।');
        return;
      }
      if (!formData.apiKey?.trim()) {
        setSaveErrorMsg('RedX API ACCESS TOKEN আবশ্যক।');
        return;
      }
    }

    setIsSaving(true);
    setSaveErrorMsg(null);

    const mappedMerchantId = currentProvider === 'pathao' 
      ? (formData.username?.trim() || '') 
      : (formData.merchantId ? formData.merchantId.trim() : '');

    const mappedWebhookSecret = currentProvider === 'pathao'
      ? (formData.password?.trim() || '')
      : (formData.webhookSecret ? formData.webhookSecret.trim() : '');

    const mappedNotes = currentProvider === 'pathao' && formData.accessToken
      ? `TOKEN:${formData.accessToken.trim()}`
      : (formData.notes ? formData.notes.trim() : '');

    try {
      if (isCreating) {
        await addCourierConfig({
          name: formData.name.trim(),
          provider: currentProvider,
          isActive: formData.isActive ?? true,
          isDefault: formData.isDefault ?? (couriers.length === 0),
          priority: formData.priority ?? (couriers.length + 1),
          apiKey: formData.apiKey ? formData.apiKey.trim() : '',
          secretKey: formData.secretKey ? formData.secretKey.trim() : '',
          apiBaseUrl: formData.apiBaseUrl ? formData.apiBaseUrl.trim() : currentProviderMeta.defaultBaseUrl,
          merchantId: mappedMerchantId,
          webhookSecret: mappedWebhookSecret,
          senderName: formData.senderName ? formData.senderName.trim() : 'HouseOfMahi',
          senderPhone: formData.senderPhone ? formData.senderPhone.trim() : '',
          senderAddress: formData.senderAddress ? formData.senderAddress.trim() : '',
          autoAssignOnConfirm: formData.autoAssignOnConfirm ?? true,
          notes: mappedNotes
        });
        setSaveSuccessMsg(`"${formData.name.trim()}" কুরিয়ার সফলভাবে কনফিগার ও সংরক্ষণ করা হয়েছে!`);
      } else if (selectedCourier) {
        await updateCourierConfig(selectedCourier.id, {
          name: formData.name.trim(),
          provider: currentProvider,
          isActive: formData.isActive ?? true,
          isDefault: formData.isDefault ?? false,
          priority: formData.priority ?? selectedCourier.priority,
          apiKey: formData.apiKey ? formData.apiKey.trim() : '',
          secretKey: formData.secretKey ? formData.secretKey.trim() : '',
          apiBaseUrl: formData.apiBaseUrl ? formData.apiBaseUrl.trim() : currentProviderMeta.defaultBaseUrl,
          merchantId: mappedMerchantId,
          webhookSecret: mappedWebhookSecret,
          senderName: formData.senderName ? formData.senderName.trim() : 'HouseOfMahi',
          senderPhone: formData.senderPhone ? formData.senderPhone.trim() : '',
          senderAddress: formData.senderAddress ? formData.senderAddress.trim() : '',
          autoAssignOnConfirm: formData.autoAssignOnConfirm ?? true,
          notes: mappedNotes
        });
        setSaveSuccessMsg(`"${formData.name.trim()}" এর সেটিংস সফলভাবে আপডেট করা হয়েছে।`);
      }

      setIsEditing(false);
      setIsCreating(false);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Failed to save courier configuration:', err);
      setSaveErrorMsg(err?.message || 'কুরিয়ার কনফিগারেশন সংরক্ষণ করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (courier: CourierServiceConfig) => {
    await updateCourierConfig(courier.id, { isActive: !courier.isActive });
  };

  const handleSetDefault = async (courier: CourierServiceConfig) => {
    await setDefaultCourier(courier.id);
  };

  const handleMovePriority = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= couriers.length) return;

    const list = [...couriers];
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    await setCourierPriority(list);
  };

  const handleTestConnection = async (courier: CourierServiceConfig) => {
    setTestingId(courier.id);
    setTestResult(null);
    try {
      const res = await testCourierConnectionViaServer(courier);
      setTestResult({
        id: courier.id,
        success: res.success,
        message: res.message
      });
      await updateCourierConfig(courier.id, {
        lastTestedAt: new Date().toISOString(),
        lastTestStatus: res.success ? 'success' : 'failed',
        lastTestMessage: res.message
      });
    } catch {
      setTestResult({
        id: courier.id,
        success: false,
        message: 'কুরিয়ার সার্ভিস সাময়িকভাবে অনুপলব্ধ। ক্রেডেনশিয়াল পরীক্ষা করে আবার চেষ্টা করুন।'
      });
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div id="courier-management-module" className="space-y-6 animate-fadeIn pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-stone-100">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/10 text-amber-600 rounded-xl">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-bold text-stone-900">Courier Services & Automation</h1>
              <p className="text-sm text-stone-500 mt-0.5">
                Steadfast, Pathao, RedX সহ সকল কুরিয়ার সার্ভিসের অফিসিয়াল API ও অটোমেশন কনফিগারেশন।
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="btn-add-courier"
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-xl transition shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Courier Service
          </button>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
          <button onClick={() => setSaveSuccessMsg(null)} className="text-emerald-700 font-semibold hover:underline cursor-pointer">Dismiss</button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-stone-100 shadow-sm">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Services</span>
            <Globe className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-stone-900">{activeCouriers.length} of {couriers.length}</div>
          <div className="text-xs text-stone-400 mt-1">Configured delivery channels</div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-stone-100 shadow-sm">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Default Primary</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold text-stone-900 truncate">{defaultCourier?.name || 'None'}</div>
          <div className="text-xs text-stone-400 mt-1">Priority #1 Auto-dispatcher</div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-stone-100 shadow-sm">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Auto-Booked Orders</span>
            <CheckCircle2 className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-blue-600">{bookedOrdersCount}</div>
          <div className="text-xs text-stone-400 mt-1">Consignments generated</div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-stone-100 shadow-sm">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Failed / Needs Action</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-600">{failedBookingsCount}</div>
          <div className="text-xs text-stone-400 mt-1">Manual retry available</div>
        </div>
      </div>

      {/* Featured Primary Couriers Showcase Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {(['steadfast', 'pathao', 'redx'] as CourierProviderId[]).map((providerId) => {
          const config = couriers.find(c => c.provider === providerId);
          const meta = PROVIDER_METADATA[providerId];
          const isConfigured = Boolean(config?.apiKey && config.apiKey.trim().length > 0);
          const isActive = Boolean(config?.isActive);
          const isDefault = Boolean(config?.isDefault);

          return (
            <div 
              key={providerId}
              className={`p-5 rounded-2xl bg-white border shadow-sm transition flex flex-col justify-between ${
                isDefault 
                  ? 'border-amber-400 ring-2 ring-amber-400/20' 
                  : isActive 
                    ? 'border-stone-200' 
                    : 'border-stone-100 opacity-75'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center font-bold text-sm ${meta.logoBg}`}>
                      {meta.logoText}
                    </div>
                    <div>
                      <h3 className="font-bold text-stone-900 leading-tight">{meta.name}</h3>
                      <span className="text-[11px] font-mono text-stone-500">{meta.badge}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {isDefault && (
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-amber-100 text-amber-800 border border-amber-300">
                        Default
                      </span>
                    )}
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                      isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-500'
                    }`}>
                      {isActive ? 'ACTIVE' : 'OFF'}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-stone-500 mb-4 line-clamp-2">{meta.note}</p>

                {/* Status Indicator */}
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 mb-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-500">API Status:</span>
                    {isConfigured ? (
                      <span className="font-semibold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Configured
                      </span>
                    ) : (
                      <span className="font-medium text-amber-600 flex items-center gap-1">
                        <KeyRound className="w-3.5 h-3.5" /> Not Configured
                      </span>
                    )}
                  </div>

                  {config?.lastTestedAt && (
                    <div className="flex items-center justify-between text-[11px] text-stone-400">
                      <span>Last Test:</span>
                      <span className={config.lastTestStatus === 'success' ? 'text-emerald-600 font-medium' : 'text-rose-500'}>
                        {config.lastTestStatus === 'success' ? 'Verified' : 'Failed'} ({new Date(config.lastTestedAt).toLocaleDateString()})
                      </span>
                    </div>
                  )}

                  {/* Webhook URL preview */}
                  <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between">
                    <span className="text-[10px] font-medium text-stone-500 uppercase tracking-wider">Webhook URL</span>
                    <button
                      type="button"
                      onClick={() => handleCopyText(getWebhookUrl(providerId), `card-webhook-${providerId}`)}
                      className="text-[11px] text-amber-700 hover:text-amber-800 font-medium flex items-center gap-1 cursor-pointer"
                      title="Copy official webhook endpoint URL"
                    >
                      {copiedField === `card-webhook-${providerId}` ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-600 font-bold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy URL</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-stone-100">
                {config ? (
                  <>
                    <button
                      onClick={() => handleOpenEdit(config)}
                      className="flex-1 py-2 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Settings2 className="w-3.5 h-3.5" />
                      Configure
                    </button>
                    <button
                      onClick={() => handleTestConnection(config)}
                      disabled={testingId === config.id || !config.apiKey}
                      className="px-3 py-2 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition flex items-center justify-center gap-1 disabled:opacity-40 cursor-pointer"
                      title="Test live API credentials"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${testingId === config.id ? 'animate-spin' : ''}`} />
                      Test
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      handleOpenCreate();
                      handleProviderChange(providerId);
                    }}
                    className="w-full py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Setup {meta.name}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Priority Workflow Explainer Banner */}
      <div className="bg-gradient-to-r from-amber-50/80 via-stone-50 to-white p-5 rounded-2xl border border-amber-200/60 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-amber-500 text-white rounded-lg mt-0.5 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-stone-800">Smart Priority & Fallback Automation Active</h4>
            <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">
              অর্ডার অনুমোদনের সাথে সাথে সিস্টেম স্বয়ংক্রিয়ভাবে <strong>Priority #1</strong> কুরিয়ারে বুকিং করবে। কোনো কারণে সার্ভার ডাউন থাকলে পরবর্তী সক্রিয় কুরিয়ারে স্বয়ংক্রিয়ভাবে রিরুট হবে।
            </p>
          </div>
        </div>
      </div>

      {/* Couriers List Table */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-stone-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-stone-800">All Integrated Courier Carriers</h3>
            <p className="text-xs text-stone-500 mt-0.5">Priority specifies the automated sequence for 1-click booking and auto-assign.</p>
          </div>
          <span className="text-xs font-medium text-stone-400">{couriers.length} Carriers</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50/70 border-b border-stone-100 text-[11px] font-bold uppercase text-stone-500 tracking-wider">
                <th className="py-3 px-4 w-16 text-center">Priority</th>
                <th className="py-3 px-4">Courier Name & Provider</th>
                <th className="py-3 px-4">API Mode</th>
                <th className="py-3 px-4 text-center">Active</th>
                <th className="py-3 px-4 text-center">Default</th>
                <th className="py-3 px-4">Last Tested</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-sm">
              {couriers.map((courier, index) => {
                const isFirst = index === 0;
                const isLast = index === couriers.length - 1;
                const meta = PROVIDER_METADATA[courier.provider] || PROVIDER_METADATA.custom;
                const hasApiKey = Boolean(courier.apiKey && courier.apiKey.trim().length > 0);

                return (
                  <tr 
                    key={courier.id} 
                    className={`hover:bg-stone-50/50 transition-colors ${!courier.isActive ? 'opacity-60 bg-stone-50/30' : ''}`}
                  >
                    {/* Priority & Move buttons */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          index === 0 ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-stone-100 text-stone-700'
                        }`}>
                          {index + 1}
                        </span>
                        <div className="flex flex-col">
                          <button
                            disabled={isFirst}
                            onClick={() => handleMovePriority(index, 'up')}
                            className="text-stone-400 hover:text-stone-700 disabled:opacity-20 disabled:hover:text-stone-400 transition cursor-pointer"
                            title="Move Priority Up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            disabled={isLast}
                            onClick={() => handleMovePriority(index, 'down')}
                            className="text-stone-400 hover:text-stone-700 disabled:opacity-20 disabled:hover:text-stone-400 transition cursor-pointer"
                            title="Move Priority Down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Name & Provider */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl border flex items-center justify-center font-bold text-xs uppercase ${meta.logoBg}`}>
                          {meta.logoText}
                        </div>
                        <div>
                          <div className="font-semibold text-stone-900 flex items-center gap-2">
                            {courier.name}
                            {courier.isDefault && (
                              <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-amber-100 text-amber-800 border border-amber-200">
                                Primary Default
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-stone-400 flex items-center gap-1.5 mt-0.5">
                            <span className="font-medium text-stone-600">{meta.name}</span>
                            <span>•</span>
                            <span className="font-mono text-[11px] text-stone-400">{meta.badge}</span>
                            {courier.notes && (
                              <>
                                <span>•</span>
                                <span className="truncate max-w-[180px]" title={courier.notes}>{courier.notes}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* API Status */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        {meta.hasApi ? (
                          hasApiKey ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Lock className="w-3 h-3 text-emerald-600" />
                              API Configured
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                              <KeyRound className="w-3 h-3 text-amber-600" />
                              Credentials Missing
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-stone-100 text-stone-600 border border-stone-200">
                            <Truck className="w-3 h-3 text-stone-400" />
                            Offline / Manual
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Active Switch */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleToggleActive(courier)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                          courier.isActive ? 'bg-emerald-500' : 'bg-stone-300'
                        }`}
                        title={courier.isActive ? 'Deactivate Carrier' : 'Activate Carrier'}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            courier.isActive ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </td>

                    {/* Set Default Radio */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleSetDefault(courier)}
                        className={`p-1.5 rounded-lg transition cursor-pointer ${
                          courier.isDefault 
                            ? 'text-amber-600 font-bold bg-amber-50' 
                            : 'text-stone-300 hover:text-stone-600 hover:bg-stone-100'
                        }`}
                        title="Set as Default Courier"
                      >
                        <Radio className={`w-5 h-5 ${courier.isDefault ? 'fill-amber-600 text-amber-600' : ''}`} />
                      </button>
                    </td>

                    {/* Last Tested Status */}
                    <td className="py-3.5 px-4">
                      {meta.hasApi ? (
                        courier.lastTestedAt ? (
                          <div className="text-xs">
                            <div className={`font-medium flex items-center gap-1 ${
                              courier.lastTestStatus === 'success' ? 'text-emerald-600' : 'text-rose-600'
                            }`}>
                              {courier.lastTestStatus === 'success' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                              {courier.lastTestStatus === 'success' ? 'Connected' : 'Failed'}
                            </div>
                            <div className="text-[11px] text-stone-400 truncate max-w-[150px]" title={courier.lastTestMessage}>
                              {courier.lastTestMessage || new Date(courier.lastTestedAt).toLocaleDateString()}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-stone-400 italic">Not tested yet</span>
                        )
                      ) : (
                        <span className="text-xs text-stone-400">N/A (Offline)</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {meta.hasApi && (
                          <button
                            onClick={() => handleTestConnection(courier)}
                            disabled={testingId === courier.id || !courier.apiKey}
                            className="px-2.5 py-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg transition disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                            title="Test Live API Credentials"
                          >
                            <RefreshCw className={`w-3 h-3 ${testingId === courier.id ? 'animate-spin' : ''}`} />
                            Test
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenEdit(courier)}
                          className="px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition flex items-center gap-1 cursor-pointer"
                        >
                          <Settings2 className="w-3.5 h-3.5" />
                          Configure
                        </button>
                        {couriers.length > 1 && (
                          <button
                            onClick={() => {
                              if (window.confirm(`Delete configuration for ${courier.name}?`)) {
                                deleteCourierConfig(courier.id);
                              }
                            }}
                            className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Delete courier"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Test Result Callout if active from Table button */}
      {testResult && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 animate-fadeIn ${
          testResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
        }`}>
          {testResult.success ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" /> : <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />}
          <div>
            <div className="text-sm font-bold">{testResult.success ? 'API Connection Successful' : 'API Connection Issue'}</div>
            <div className="text-xs mt-0.5">{testResult.message}</div>
          </div>
        </div>
      )}

      {/* Edit / Create Courier Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-stone-200 overflow-hidden max-h-[92vh] flex flex-col animate-scaleUp">
            {/* Modal Header */}
            <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center font-bold text-sm ${currentProviderMeta.logoBg}`}>
                  {currentProviderMeta.logoText}
                </div>
                <div>
                  <h3 className="font-serif font-bold text-stone-900">
                    {isCreating ? 'Add Courier Carrier' : `Configure ${formData.name}`}
                  </h3>
                  <p className="text-xs text-stone-500">
                    {currentProviderMeta.name} — অফিশিয়াল API ক্রেডেনশিয়াল ও স্বয়ংক্রিয় ডেসপ্যাচ সেটিংস।
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditing(false)}
                className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-200 transition cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveForm} className="p-6 space-y-5 overflow-y-auto flex-1">
              
              {/* Courier Provider Selector & Display Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    কুরিয়ার প্রোভাইডার (Provider) *
                  </label>
                  <select
                    value={formData.provider || 'steadfast'}
                    onChange={(e) => handleProviderChange(e.target.value as CourierProviderId)}
                    className="w-full px-3.5 py-2.5 text-sm border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-medium bg-white"
                  >
                    <option value="steadfast">Steadfast Courier (Packzy API v1)</option>
                    <option value="pathao">Pathao Courier (Aladdin OAuth 2.0)</option>
                    <option value="redx">RedX Logistics (Open API v1)</option>
                    <option value="paperfly">Paperfly Courier (Merchant API)</option>
                    <option value="ecourier">eCourier (Enterprise API)</option>
                    <option value="sundarban">Sundarban Courier (Branch API)</option>
                    <option value="custom">Custom / Offline Courier (Manual)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    কুরিয়ার ডিসপ্লে নাম (Display Name) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Steadfast Courier"
                    className="w-full px-3.5 py-2.5 text-sm border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                  />
                </div>
              </div>

              {/* Provider Information Pill */}
              <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded-xl text-xs text-amber-950 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">{currentProviderMeta.name} Integration: </span>
                  <span>{currentProviderMeta.note}</span>
                </div>
              </div>

              {/* ========================================================= */}
              {/* COURIER 1 — STEADFAST CONFIGURATION FIELDS               */}
              {/* ========================================================= */}
              {currentProvider === 'steadfast' && (
                <div className="p-5 bg-stone-50 rounded-2xl border border-stone-200 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                    <div className="flex items-center gap-2 text-xs font-bold text-stone-800 uppercase tracking-wider">
                      <KeyRound className="w-4 h-4 text-emerald-600" />
                      Steadfast Courier Credentials & Webhook
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md font-bold">
                      Packzy API v1
                    </span>
                  </div>

                  {/* 1. API KEY * */}
                  <div>
                    <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1">
                      API KEY *
                    </label>
                    <div className="relative">
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        required
                        value={formData.apiKey || ''}
                        onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                        placeholder="Steadfast API Key"
                        className="w-full px-3.5 py-2.5 pr-10 text-sm font-mono border border-stone-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
                        title={showApiKey ? 'Hide' : 'Show'}
                      >
                        {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-stone-500 mt-1">Steadfast Merchant Portal &gt; API Settings থেকে প্রাপ্ত API Key দিন।</p>
                  </div>

                  {/* 2. SECRET KEY * */}
                  <div>
                    <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1">
                      SECRET KEY *
                    </label>
                    <div className="relative">
                      <input
                        type={showSecretKey ? 'text' : 'password'}
                        required
                        value={formData.secretKey || ''}
                        onChange={(e) => setFormData({ ...formData, secretKey: e.target.value })}
                        placeholder="Steadfast Secret Key"
                        className="w-full px-3.5 py-2.5 pr-10 text-sm font-mono border border-stone-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSecretKey(!showSecretKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
                        title={showSecretKey ? 'Hide' : 'Show'}
                      >
                        {showSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-stone-500 mt-1">Steadfast Merchant Portal &gt; API Settings থেকে প্রাপ্ত Secret Key দিন।</p>
                  </div>

                  {/* 3. API BASE URL */}
                  <div>
                    <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1">
                      API BASE URL
                    </label>
                    <input
                      type="text"
                      value={formData.apiBaseUrl || 'https://portal.packzy.com/api/v1'}
                      onChange={(e) => setFormData({ ...formData, apiBaseUrl: e.target.value })}
                      placeholder="https://portal.packzy.com/api/v1"
                      className="w-full px-3.5 py-2.5 text-xs font-mono border border-stone-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500"
                    />
                    <p className="text-[11px] text-stone-400 mt-1">Steadfast Packzy Production API Gateway URL (Pre-configured)।</p>
                  </div>

                  {/* 4. WEBHOOK URL */}
                  <div className="p-3.5 bg-white rounded-xl border border-stone-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800 uppercase tracking-wider">
                        <LinkIcon className="w-3.5 h-3.5 text-emerald-600" />
                        WEBHOOK URL
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyText(getWebhookUrl('steadfast'), 'steadfast-webhook')}
                        className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200"
                      >
                        {copiedField === 'steadfast-webhook' ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-600 font-bold">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy URL</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="p-2.5 bg-stone-50 rounded-lg text-xs font-mono text-stone-800 break-all select-all border border-stone-200">
                      {getWebhookUrl('steadfast')}
                    </div>
                    <p className="text-[11px] text-stone-500">
                      Steadfast Webhook সেকশনে এই Webhook URL পেস্ট করুন রিয়েল-টাইম ডেলিভারি স্ট্যাটাস সিঙ্কের জন্য।
                    </p>
                  </div>

                  {/* 5. WEBHOOK BEARER TOKEN */}
                  <div>
                    <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1">
                      WEBHOOK BEARER TOKEN
                    </label>
                    <div className="relative">
                      <input
                        type={showWebhookBearer ? 'text' : 'password'}
                        value={formData.webhookSecret || ''}
                        onChange={(e) => setFormData({ ...formData, webhookSecret: e.target.value })}
                        placeholder="e.g. stf_bearer_token_xxxx (Optional)"
                        className="w-full px-3.5 py-2.5 pr-10 text-sm font-mono border border-stone-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowWebhookBearer(!showWebhookBearer)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
                        title={showWebhookBearer ? 'Hide' : 'Show'}
                      >
                        {showWebhookBearer ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-stone-400 mt-1">
                      Webhook কলব্যাক অথেনটিকেশনের জন্য সিকিউর Bearer টোকেন (প্রযোজ্য ক্ষেত্রে)।
                    </p>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* COURIER 2 — PATHAO CONFIGURATION FIELDS                  */}
              {/* ========================================================= */}
              {currentProvider === 'pathao' && (
                <div className="p-5 bg-stone-50 rounded-2xl border border-stone-200 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                    <div className="flex items-center gap-2 text-xs font-bold text-stone-800 uppercase tracking-wider">
                      <KeyRound className="w-4 h-4 text-red-600" />
                      Pathao Courier Aladdin OAuth 2.0 Flow
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-red-100 text-red-800 rounded-md font-bold">
                      Aladdin API
                    </span>
                  </div>

                  {/* 1. API URL * */}
                  <div>
                    <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1">
                      API URL *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.apiBaseUrl || 'https://api-hermes.pathao.com'}
                      onChange={(e) => setFormData({ ...formData, apiBaseUrl: e.target.value })}
                      placeholder="https://api-hermes.pathao.com"
                      className="w-full px-3.5 py-2.5 text-xs font-mono border border-stone-300 rounded-xl bg-white focus:ring-2 focus:ring-red-500"
                    />
                    <p className="text-[11px] text-stone-400 mt-1">Pathao Aladdin Production API Gateway URL।</p>
                  </div>

                  {/* 2. CLIENT ID * */}
                  <div>
                    <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1">
                      CLIENT ID *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.apiKey || ''}
                      onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                      placeholder="e.g. 10452"
                      className="w-full px-3.5 py-2.5 text-sm font-mono border border-stone-300 rounded-xl bg-white focus:ring-2 focus:ring-red-500"
                    />
                    <p className="text-[11px] text-stone-500 mt-1">Pathao Developer Portal থেকে প্রাপ্ত Client ID দিন।</p>
                  </div>

                  {/* 3. CLIENT SECRET * */}
                  <div>
                    <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1">
                      CLIENT SECRET *
                    </label>
                    <div className="relative">
                      <input
                        type={showSecretKey ? 'text' : 'password'}
                        required
                        value={formData.secretKey || ''}
                        onChange={(e) => setFormData({ ...formData, secretKey: e.target.value })}
                        placeholder="Pathao Client Secret"
                        className="w-full px-3.5 py-2.5 pr-10 text-sm font-mono border border-stone-300 rounded-xl bg-white focus:ring-2 focus:ring-red-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSecretKey(!showSecretKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
                        title={showSecretKey ? 'Hide' : 'Show'}
                      >
                        {showSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-stone-500 mt-1">Pathao Developer Portal থেকে প্রাপ্ত Client Secret দিন।</p>
                  </div>

                  {/* 4. USERNAME / EMAIL * */}
                  <div>
                    <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1">
                      USERNAME / EMAIL *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.username || formData.merchantId || ''}
                      onChange={(e) => {
                        setFormData({ 
                          ...formData, 
                          username: e.target.value,
                          merchantId: e.target.value 
                        });
                      }}
                      placeholder="e.g. merchant@houseofmahi.com"
                      className="w-full px-3.5 py-2.5 text-sm border border-stone-300 rounded-xl bg-white focus:ring-2 focus:ring-red-500"
                    />
                    <p className="text-[11px] text-stone-500 mt-1">Pathao মার্চেন্ট অ্যাকাউন্টের রেজিস্টার্ড ইউজারনেম বা ইমেইল।</p>
                  </div>

                  {/* 5. PASSWORD * */}
                  <div>
                    <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1">
                      PASSWORD *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={formData.password || formData.webhookSecret || ''}
                        onChange={(e) => {
                          setFormData({ 
                            ...formData, 
                            password: e.target.value,
                            webhookSecret: e.target.value
                          });
                        }}
                        placeholder="Pathao Account Password"
                        className="w-full px-3.5 py-2.5 pr-10 text-sm font-mono border border-stone-300 rounded-xl bg-white focus:ring-2 focus:ring-red-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
                        title={showPassword ? 'Hide' : 'Show'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-stone-500 mt-1">টোকেন জেনারেশন এবং অথেনটিকেশনের জন্য পাসওয়ার্ড।</p>
                  </div>

                  {/* 6. ACCESS TOKEN */}
                  <div>
                    <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1">
                      ACCESS TOKEN
                    </label>
                    <div className="relative">
                      <input
                        type={showAccessToken ? 'text' : 'password'}
                        value={formData.accessToken || ''}
                        onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                        placeholder="Pathao Bearer Access Token"
                        className="w-full px-3.5 py-2.5 pr-10 text-sm font-mono border border-stone-300 rounded-xl bg-white focus:ring-2 focus:ring-red-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAccessToken(!showAccessToken)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
                        title={showAccessToken ? 'Hide' : 'Show'}
                      >
                        {showAccessToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-stone-400 mt-1">নিচের বাটনে ক্লিক করে সরাসরি টোকেন জেনারেট ও ভ্যালিডেট করতে পারেন।</p>
                  </div>

                  {/* 7. ACCESS TOKEN GENERATOR / TOKEN GENERATE BUTTON */}
                  <div className="p-4 bg-white rounded-xl border border-red-200/80 space-y-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-bold text-stone-900">OAuth 2.0 টোকেন জেনারেটর</div>
                        <div className="text-[11px] text-stone-500">ক্রেডেনশিয়াল যাচাই করে লাইভ এক্সেস টোকেন নিশ্চিত করুন।</div>
                      </div>
                      <button
                        type="button"
                        disabled={isGeneratingToken}
                        onClick={handleGeneratePathaoToken}
                        className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-sm"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingToken ? 'animate-spin' : ''}`} />
                        {isGeneratingToken ? 'টোকেন জেনারেট হচ্ছে...' : 'টোকেন জেনারেট করুন'}
                      </button>
                    </div>

                    {tokenGenResult && (
                      <div className={`p-3 rounded-xl border text-xs flex items-start gap-2 animate-fadeIn ${
                        tokenGenResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
                      }`}>
                        {tokenGenResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
                        <div>
                          <div className="font-bold">{tokenGenResult.success ? 'টোকেন জেনারেট সফল' : 'টোকেন জেনারেশন ব্যর্থ'}</div>
                          <div className="mt-0.5">{tokenGenResult.message}</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Webhook Preview for Pathao */}
                  <div className="p-3.5 bg-white rounded-xl border border-stone-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800 uppercase tracking-wider">
                        <LinkIcon className="w-3.5 h-3.5 text-red-600" />
                        PATHAO WEBHOOK URL
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyText(getWebhookUrl('pathao'), 'pathao-webhook')}
                        className="text-xs font-semibold text-red-700 hover:text-red-800 flex items-center gap-1 cursor-pointer bg-red-50 px-2.5 py-1 rounded-lg border border-red-200"
                      >
                        {copiedField === 'pathao-webhook' ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-600 font-bold">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy URL</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="p-2.5 bg-stone-50 rounded-lg text-xs font-mono text-stone-800 break-all select-all border border-stone-200">
                      {getWebhookUrl('pathao')}
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* COURIER 3 — REDX CONFIGURATION FIELDS                    */}
              {/* ========================================================= */}
              {currentProvider === 'redx' && (
                <div className="p-5 bg-stone-50 rounded-2xl border border-stone-200 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                    <div className="flex items-center gap-2 text-xs font-bold text-stone-800 uppercase tracking-wider">
                      <KeyRound className="w-4 h-4 text-rose-600" />
                      RedX Logistics Open API v1
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-rose-100 text-rose-800 rounded-md font-bold">
                      Open API
                    </span>
                  </div>

                  {/* 1. BASE URL * */}
                  <div>
                    <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1">
                      BASE URL *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.apiBaseUrl || 'https://openapi.redx.com.bd/v1.0.0-beta'}
                      onChange={(e) => setFormData({ ...formData, apiBaseUrl: e.target.value })}
                      placeholder="https://openapi.redx.com.bd/v1.0.0-beta"
                      className="w-full px-3.5 py-2.5 text-xs font-mono border border-stone-300 rounded-xl bg-white focus:ring-2 focus:ring-rose-500"
                    />
                    <p className="text-[11px] text-stone-400 mt-1">RedX Open API v1 Production Endpoint URL।</p>
                  </div>

                  {/* 2. API ACCESS TOKEN * */}
                  <div>
                    <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1">
                      API ACCESS TOKEN *
                    </label>
                    <div className="relative">
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        required
                        value={formData.apiKey || ''}
                        onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                        placeholder="RedX Bearer Access Token"
                        className="w-full px-3.5 py-2.5 pr-10 text-sm font-mono border border-stone-300 rounded-xl bg-white focus:ring-2 focus:ring-rose-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
                        title={showApiKey ? 'Hide' : 'Show'}
                      >
                        {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-stone-500 mt-1">RedX Merchant Dashboard &gt; Developer Settings থেকে প্রাপ্ত Bearer Token দিন।</p>
                  </div>

                  {/* 3. WEBHOOK URL */}
                  <div className="p-3.5 bg-white rounded-xl border border-stone-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800 uppercase tracking-wider">
                        <LinkIcon className="w-3.5 h-3.5 text-rose-600" />
                        WEBHOOK URL
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyText(getWebhookUrl('redx'), 'redx-webhook')}
                        className="text-xs font-semibold text-rose-700 hover:text-rose-800 flex items-center gap-1 cursor-pointer bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200"
                      >
                        {copiedField === 'redx-webhook' ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-600 font-bold">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy URL</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="p-2.5 bg-stone-50 rounded-lg text-xs font-mono text-stone-800 break-all select-all border border-stone-200">
                      {getWebhookUrl('redx')}
                    </div>
                    <p className="text-[11px] text-stone-500">
                      RedX Webhook কনফিগারেশনে এই URL-টি দিন স্বয়ংক্রিয় স্ট্যাটাস আপডেটের জন্য।
                    </p>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* OTHER COURIERS (Paperfly, eCourier, Sundarban, Custom)   */}
              {/* ========================================================= */}
              {!['steadfast', 'pathao', 'redx'].includes(currentProvider) && (
                <div className="p-5 bg-stone-50 rounded-2xl border border-stone-200 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                    <div className="flex items-center gap-2 text-xs font-bold text-stone-800 uppercase tracking-wider">
                      <Truck className="w-4 h-4 text-stone-600" />
                      {currentProviderMeta.name} Setup
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-stone-200 text-stone-800 rounded-md font-bold">
                      {currentProviderMeta.badge}
                    </span>
                  </div>

                  {currentProviderMeta.hasApi ? (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1">
                          API KEY / ACCESS TOKEN *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.apiKey || ''}
                          onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                          placeholder="Enter API credentials"
                          className="w-full px-3.5 py-2.5 text-sm font-mono border border-stone-300 rounded-xl bg-white focus:ring-2 focus:ring-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1">
                          API BASE URL
                        </label>
                        <input
                          type="text"
                          value={formData.apiBaseUrl || currentProviderMeta.defaultBaseUrl}
                          onChange={(e) => setFormData({ ...formData, apiBaseUrl: e.target.value })}
                          className="w-full px-3.5 py-2.5 text-xs font-mono border border-stone-300 rounded-xl bg-white focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="p-3.5 bg-stone-100 rounded-xl text-xs text-stone-600 leading-relaxed">
                      ম্যানুয়াল বা অফলাইন কুরিয়ার মোড সক্রিয়। কোনো এপিআই ক্রেডেনশিয়াল ছাড়াই অর্ডার ডেসপ্যাচ নোট ও কাস্টম ট্র্যাকিং কোড দিয়ে পার্সেল পরিচালনা করতে পারবেন।
                    </div>
                  )}
                </div>
              )}

              {/* In-Modal Connection Test Trigger for all API providers */}
              {currentProviderMeta.hasApi && (
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold text-stone-800 uppercase tracking-wider">রিয়েল-টাইম API টেস্ট</div>
                      <div className="text-[11px] text-stone-500">প্রদত্ত ক্রেডেনশিয়াল দিয়ে সরাসরি কুরিয়ার সার্ভার যাচাই করুন।</div>
                    </div>
                    <button
                      type="button"
                      disabled={modalTesting || !formData.apiKey?.trim()}
                      onClick={handleTestModalConnection}
                      className="px-4 py-2 bg-stone-800 hover:bg-stone-900 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 disabled:opacity-40 cursor-pointer shadow-sm"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${modalTesting ? 'animate-spin' : ''}`} />
                      {modalTesting ? 'যাচাই করা হচ্ছে...' : 'Test API Connection'}
                    </button>
                  </div>

                  {modalTestResult && (
                    <div className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 animate-fadeIn ${
                      modalTestResult.success 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}>
                      {modalTestResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="font-bold">{modalTestResult.success ? 'API Connection Verified' : 'Authentication Failed'}</div>
                        <div className="mt-0.5">{modalTestResult.message}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Sender Pickup Information (Warehouse Origin) */}
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-stone-800 uppercase tracking-wider">
                  <Building2 className="w-4 h-4 text-amber-600" />
                  পিকআপ ওয়্যারহাউজ ও সেন্ডার বিবরণ (Pickup Details)
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-stone-600 mb-1">
                      সেন্ডার / শপ নাম
                    </label>
                    <input
                      type="text"
                      value={formData.senderName || ''}
                      onChange={(e) => setFormData({ ...formData, senderName: e.target.value })}
                      placeholder="e.g. HouseOfMahi"
                      className="w-full px-3 py-2 text-sm border border-stone-300 rounded-xl bg-white focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-600 mb-1">
                      সেন্ডার ফোন নম্বর
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                      <input
                        type="tel"
                        value={formData.senderPhone || ''}
                        onChange={(e) => setFormData({ ...formData, senderPhone: e.target.value })}
                        placeholder="e.g. 01700000000"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-stone-300 rounded-xl bg-white focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">
                    ওয়্যারহাউজ পিকআপ ঠিকানা
                  </label>
                  <div className="relative">
                    <MapPin className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text"
                      value={formData.senderAddress || ''}
                      onChange={(e) => setFormData({ ...formData, senderAddress: e.target.value })}
                      placeholder="e.g. House #12, Road #4, Dhanmondi, Dhaka"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-stone-300 rounded-xl bg-white focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Service Active / Toggle Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 6. SERVICE ON/OFF (সার্ভিস চালু) */}
                <div 
                  onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                  className="flex items-center justify-between p-4 bg-stone-50 hover:bg-stone-100/80 rounded-2xl border border-stone-200 transition cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${formData.isActive ? 'bg-emerald-500 text-white' : 'bg-stone-200 text-stone-600'}`}>
                      {formData.isActive ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-stone-900 uppercase tracking-wider">সার্ভিস চালু (Service Active)</div>
                      <div className="text-[11px] text-stone-500">
                        {formData.isActive ? 'কুরিয়ার সার্ভিসটি সক্রিয় রয়েছে' : 'কুরিয়ার সার্ভিসটি বন্ধ রয়েছে'}
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.isActive ?? true}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-5 h-5 text-emerald-600 rounded border-stone-300 focus:ring-emerald-500 cursor-pointer"
                  />
                </div>

                {/* Auto Assign Toggle */}
                <div 
                  onClick={() => setFormData({ ...formData, autoAssignOnConfirm: !formData.autoAssignOnConfirm })}
                  className="flex items-center justify-between p-4 bg-stone-50 hover:bg-stone-100/80 rounded-2xl border border-stone-200 transition cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${formData.autoAssignOnConfirm ? 'bg-amber-500 text-white' : 'bg-stone-200 text-stone-600'}`}>
                      {formData.autoAssignOnConfirm ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-stone-900 uppercase tracking-wider">অটো-বুকিং (Auto-Assign)</div>
                      <div className="text-[11px] text-stone-500">অর্ডার কনফার্ম হলে অটো পার্সেল বুক হবে</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.autoAssignOnConfirm ?? true}
                    onChange={(e) => setFormData({ ...formData, autoAssignOnConfirm: e.target.checked })}
                    className="w-5 h-5 text-amber-600 rounded border-stone-300 focus:ring-amber-500 cursor-pointer"
                  />
                </div>
              </div>

              {saveErrorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2 animate-fadeIn">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{saveErrorMsg}</span>
                </div>
              )}

              {/* Internal Notes */}
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">
                  অভ্যন্তরীণ নোট ও কভারেজ নির্দেশিকা (Internal Notes)
                </label>
                <textarea
                  rows={2}
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. Best for outside Dhaka COD delivery with 48h SLA..."
                  className="w-full px-3.5 py-2 text-sm border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 bg-white"
                />
              </div>

              {/* Modal Footer: SAVE CONFIGURATION (সংরক্ষণ করুন) */}
              <div className="pt-4 border-t border-stone-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2.5 text-sm font-medium text-stone-600 hover:text-stone-800 rounded-xl hover:bg-stone-100 transition disabled:opacity-50 cursor-pointer"
                >
                  বাতিল (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold rounded-xl transition shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      সংরক্ষণ হচ্ছে...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      সংরক্ষণ করুন (Save Configuration)
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
