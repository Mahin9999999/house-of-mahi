import React, { useState } from 'react';
import { X, Search, PackageCheck, AlertCircle, ExternalLink, Loader2 } from 'lucide-react';
import { useAdminStore } from '../store/useAdminStore';
import { getOrdersFromFirestore } from '../firebase/firestoreService';
import { Order } from '../types';

interface TrackOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TrackOrderModal: React.FC<TrackOrderModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const [orderIdInput, setOrderIdInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    orderId: string;
    status: string;
    statusBadgeClass: string;
    courier: string;
    trackingCode: string | null;
    trackingUrl: string | null;
    steps: { label: string; date: string; done: boolean }[];
  } | null>(null);

  const normalizeDigits = (str: string) => str.replace(/\D/g, '');

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    const cleanOrderId = orderIdInput.trim();
    const cleanPhone = phoneInput.trim();

    if (!cleanOrderId) {
      setError('Please enter your Order ID');
      return;
    }

    setLoading(true);

    try {
      // 1. Fetch available orders from local state store
      let allOrders: Order[] = useAdminStore.getState().orders || [];

      // 2. If local store is empty or matching order not in cache, fallback query to Firestore
      let matched = allOrders.find(o => 
        (o.id && o.id.trim().toUpperCase() === cleanOrderId.toUpperCase()) ||
        (o.orderNumber && o.orderNumber.trim().toUpperCase() === cleanOrderId.toUpperCase()) ||
        (o.trackingNumber && o.trackingNumber.trim().toUpperCase() === cleanOrderId.toUpperCase()) ||
        (o.courierConsignmentId && o.courierConsignmentId.trim().toUpperCase() === cleanOrderId.toUpperCase())
      );

      if (!matched) {
        try {
          const remoteOrders = await getOrdersFromFirestore();
          if (remoteOrders && remoteOrders.length > 0) {
            allOrders = remoteOrders;
            matched = remoteOrders.find(o => 
              (o.id && o.id.trim().toUpperCase() === cleanOrderId.toUpperCase()) ||
              (o.orderNumber && o.orderNumber.trim().toUpperCase() === cleanOrderId.toUpperCase()) ||
              (o.trackingNumber && o.trackingNumber.trim().toUpperCase() === cleanOrderId.toUpperCase()) ||
              (o.courierConsignmentId && o.courierConsignmentId.trim().toUpperCase() === cleanOrderId.toUpperCase())
            );
          }
        } catch (fErr) {
          console.warn('[TrackOrder] Error fetching remote orders fallback:', fErr);
        }
      }

      if (!matched) {
        setError(`No order found matching "${cleanOrderId}". Please verify your Order ID.`);
        setLoading(false);
        return;
      }

      // 3. Security: Phone Number verification if provided or if order has customer phone
      if (cleanPhone) {
        const inputDigits = normalizeDigits(cleanPhone);
        const orderPhoneDigits = normalizeDigits(matched.customer?.phone || '');

        const isMatch = (
          inputDigits === orderPhoneDigits ||
          (inputDigits.length >= 6 && orderPhoneDigits.endsWith(inputDigits.slice(-6))) ||
          (orderPhoneDigits.length >= 6 && inputDigits.endsWith(orderPhoneDigits.slice(-6)))
        );

        if (!isMatch) {
          setError('The phone number does not match the records for this order. Please verify your phone number.');
          setLoading(false);
          return;
        }
      }

      // 4. Extract Real Order & Courier Info
      const status = matched.status || 'Pending';
      const orderDate = matched.date || (matched.createdAt ? new Date(matched.createdAt).toLocaleDateString() : 'Recent');
      const courierName = matched.courierName || (matched.trackingNumber ? 'Standard Courier Delivery' : 'Courier Not Yet Assigned');
      const trackingCode = matched.courierConsignmentId || matched.trackingNumber || null;

      const isConfirmed = status === 'Confirmed';
      const isProcessing = status === 'Processing';
      const isShipped = status === 'Shipped';
      const isDelivered = status === 'Delivered';
      const isCancelled = status === 'Cancelled' || status === 'Refunded';

      const steps = [
        {
          label: 'Order Placed',
          date: orderDate,
          done: true
        },
        {
          label: isCancelled ? `Order ${status}` : 'Order Confirmed & Processing',
          date: isCancelled ? 'Order voided' : (isConfirmed || isProcessing || isShipped || isDelivered ? 'Confirmed' : 'Awaiting confirmation'),
          done: isCancelled ? false : (isConfirmed || isProcessing || isShipped || isDelivered)
        },
        {
          label: `Handed to Courier${matched.courierName ? ` (${matched.courierName})` : ''}`,
          date: matched.courierBookingTime 
            ? new Date(matched.courierBookingTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : (isShipped || isDelivered ? 'Dispatched' : 'Pending dispatch'),
          done: isShipped || isDelivered
        },
        {
          label: isDelivered ? 'Parcel Delivered' : 'Out for Delivery / In Transit',
          date: isDelivered ? 'Delivered' : (isShipped ? 'In transit to address' : 'Awaiting dispatch'),
          done: isDelivered
        }
      ];

      let statusBadgeClass = 'bg-amber-100 text-amber-800';
      if (isDelivered) statusBadgeClass = 'bg-emerald-100 text-emerald-800';
      else if (isShipped) statusBadgeClass = 'bg-blue-100 text-blue-800';
      else if (isProcessing || isConfirmed) statusBadgeClass = 'bg-purple-100 text-purple-800';
      else if (isCancelled) statusBadgeClass = 'bg-rose-100 text-rose-800';

      setResult({
        orderId: matched.orderNumber || matched.id,
        status: matched.status,
        statusBadgeClass,
        courier: courierName,
        trackingCode,
        trackingUrl: matched.courierTrackingUrl || null,
        steps
      });
    } catch (err: any) {
      console.error('Error tracking order:', err);
      setError('Failed to track order. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-[#E8DFC2] overflow-hidden my-auto animate-scale-up">
        
        {/* Header */}
        <div className="bg-[#4A1525] text-white p-4 flex items-center justify-between border-b border-[#5C1B2E]">
          <div className="flex items-center space-x-2">
            <PackageCheck size={20} className="text-amber-300" />
            <h3 className="font-serif font-bold text-base text-amber-200">Track Your Order</h3>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <form onSubmit={handleTrack} className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Order ID *</label>
              <input 
                type="text" 
                value={orderIdInput}
                onChange={(e) => setOrderIdInput(e.target.value)}
                placeholder="e.g. HM-1724729000000"
                className="w-full p-2.5 border border-slate-200 rounded-lg bg-[#FAF7F2] font-mono focus:outline-hidden focus:border-[#4A1525]"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Phone Number (Optional)</label>
              <input 
                type="text" 
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="e.g. 01700000000"
                className="w-full p-2.5 border border-slate-200 rounded-lg bg-[#FAF7F2] focus:outline-hidden focus:border-[#4A1525]"
              />
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-[#4A1525] hover:bg-[#360F1B] disabled:opacity-60 text-white font-bold py-2.5 rounded-xl shadow-xs transition-colors flex items-center justify-center space-x-1.5"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Searching Order...</span>
                </>
              ) : (
                <>
                  <Search size={14} />
                  <span>Track Parcel Status</span>
                </>
              )}
            </button>
          </form>

          {/* Error Message */}
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs flex items-center space-x-2">
              <AlertCircle size={16} className="text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Real Result Box */}
          {result && (
            <div className="bg-[#FAF7F2] p-4 rounded-xl border border-[#E8DFC2] text-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                <div>
                  <span className="font-mono font-bold text-[#4A1525]">{result.orderId}</span>
                  <p className="text-[10px] text-slate-500">{result.courier}</p>
                  {result.trackingCode && (
                    <p className="text-[10px] text-slate-600 font-mono mt-0.5">
                      Tracking ID: <span className="font-semibold">{result.trackingCode}</span>
                    </p>
                  )}
                </div>
                <div className="text-right flex flex-col items-end">
                  <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${result.statusBadgeClass}`}>
                    {result.status}
                  </span>
                  {result.trackingUrl && (
                    <a
                      href={result.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1.5 inline-flex items-center space-x-1 text-[10px] font-semibold text-[#4A1525] hover:underline"
                    >
                      <span>Live Courier Tracking</span>
                      <ExternalLink size={10} />
                    </a>
                  )}
                </div>
              </div>

              <div className="space-y-2 pt-1">
                {result.steps.map((st: any, idx: number) => (
                  <div key={idx} className="flex items-start space-x-2.5">
                    <div className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${st.done ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                      ✓
                    </div>
                    <div>
                      <p className={`font-bold ${st.done ? 'text-slate-900' : 'text-slate-400'}`}>{st.label}</p>
                      <p className="text-[10px] text-slate-500">{st.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};

