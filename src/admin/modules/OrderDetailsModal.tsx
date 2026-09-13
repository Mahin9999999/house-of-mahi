import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  Check, 
  XCircle, 
  RotateCcw, 
  User, 
  Mail, 
  MapPin, 
  Truck, 
  FileText, 
  Send, 
  Package, 
  ExternalLink, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  Zap, 
  ChevronDown 
} from 'lucide-react';
import { Order, OrderStatus } from '../../types';
import { useAdminStore } from '../../store/useAdminStore';

interface OrderDetailsModalProps {
  order: Order | null;
  onClose: () => void;
  onPrintInvoice?: (order: Order) => void;
}

export const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  order,
  onClose,
  onPrintInvoice
}) => {
  const { 
    couriers, 
    updateOrderStatus, 
    addOrderAdminNote, 
    autoBookOrderWithCourier 
  } = useAdminStore();

  const [newNoteText, setNewNoteText] = useState('');
  const [manualTrackingInput, setManualTrackingInput] = useState(order?.trackingNumber || '');
  const [selectedCourierId, setSelectedCourierId] = useState<string>(
    order?.courierName?.toLowerCase().includes('pathao') ? 'pathao' :
    order?.courierName?.toLowerCase().includes('redx') ? 'redx' : 'steadfast'
  );
  const [isBooking, setIsBooking] = useState(false);
  const [bookingFeedback, setBookingFeedback] = useState<{ success: boolean; message: string } | null>(null);

  if (!order) return null;

  const handleStatusChange = async (newStatus: OrderStatus) => {
    await updateOrderStatus(order.id, newStatus, order.trackingNumber);
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    await addOrderAdminNote(order.id, newNoteText.trim());
    setNewNoteText('');
  };

  const handleManualSaveTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    const courierObj = couriers.find(c => c.id === selectedCourierId);
    const courierName = courierObj?.name || 'Steadfast';

    await updateOrderStatus(order.id, order.status, manualTrackingInput.trim());
    await addOrderAdminNote(order.id, `Manual Courier Tracking updated: ${courierName} #${manualTrackingInput.trim()}`);
    setBookingFeedback({
      success: true,
      message: `Updated tracking info for ${courierName}`
    });
  };

  // 1-Click Automatic Courier Dispatch
  const handleAutoDispatch = async (forcedId?: string) => {
    setIsBooking(true);
    setBookingFeedback(null);
    try {
      const result = await autoBookOrderWithCourier(order.id, forcedId);
      if (result.success) {
        setBookingFeedback({
          success: true,
          message: `Successfully booked with ${result.courierName}! Consignment: ${result.consignmentId}`
        });
      } else {
        setBookingFeedback({
          success: false,
          message: result.errorMessage || 'Courier booking request failed.'
        });
      }
    } catch (err: any) {
      setBookingFeedback({
        success: false,
        message: err?.message || 'Error occurred while connecting to courier API.'
      });
    } finally {
      setIsBooking(false);
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'Pending':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200">Pending</span>;
      case 'Confirmed':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-teal-100 text-teal-800 border border-teal-200">Confirmed</span>;
      case 'Processing':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-800 border border-blue-200">Processing</span>;
      case 'Shipped':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-purple-100 text-purple-800 border border-purple-200">Shipped</span>;
      case 'Delivered':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">Delivered</span>;
      case 'Cancelled':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-rose-100 text-rose-800 border border-rose-200">Cancelled</span>;
      case 'Refunded':
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-800 border border-slate-200">Refunded</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-neutral-100 text-neutral-800">{status}</span>;
    }
  };

  const isAlreadyBooked = Boolean(
    order.courierBookingStatus === 'booked' || 
    (order.courierConsignmentId && order.courierConsignmentId.length > 0)
  );

  return (
    <div id="order-details-drawer-overlay" className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-end animate-fadeIn">
      <div 
        id="order-details-drawer-panel" 
        className="bg-white w-full max-w-2xl h-full overflow-y-auto shadow-2xl flex flex-col animate-slideLeft"
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-neutral-900">
              Order #{order.orderNumber || order.id}
            </h2>
            {getStatusBadge(order.status)}
          </div>
          <div className="flex items-center gap-2">
            {onPrintInvoice && (
              <button
                type="button"
                onClick={() => onPrintInvoice(order)}
                className="p-2 text-neutral-600 hover:bg-neutral-100 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <Printer className="w-4 h-4" />
                Print Invoice
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-6 flex-1">
          {/* Feedback banner */}
          {bookingFeedback && (
            <div className={`p-3.5 rounded-xl border text-xs flex items-start justify-between gap-2 animate-fadeIn ${
              bookingFeedback.success 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              <div className="flex items-start gap-2">
                {bookingFeedback.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <span>{bookingFeedback.message}</span>
              </div>
              <button 
                type="button" 
                onClick={() => setBookingFeedback(null)} 
                className="text-[11px] font-bold hover:underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* 1. Fulfillment Lifecycle Timeline */}
          <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 space-y-3">
            <div className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
              Order Fulfillment Lifecycle
            </div>

            {order.status === 'Cancelled' ? (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-800 text-xs">
                <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>This order has been <strong>Cancelled</strong>. No further fulfillment actions are required.</span>
              </div>
            ) : order.status === 'Refunded' ? (
              <div className="p-3 bg-slate-100 border border-slate-300 rounded-lg flex items-center gap-2 text-slate-800 text-xs">
                <RotateCcw className="w-4 h-4 text-slate-600 shrink-0" />
                <span>This order has been marked as <strong>Refunded</strong>.</span>
              </div>
            ) : (
              <div className="flex items-center justify-between relative py-2">
                <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-0.5 bg-neutral-200 -z-0" />
                {[
                  { key: 'Pending', label: 'Placed' },
                  { key: 'Confirmed', label: 'Confirmed' },
                  { key: 'Processing', label: 'Processing' },
                  { key: 'Shipped', label: 'Shipped' },
                  { key: 'Delivered', label: 'Delivered' }
                ].map((step, idx) => {
                  const stepOrder = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered'];
                  const currentIdx = stepOrder.indexOf(order.status);
                  const isComplete = currentIdx >= idx;
                  const isCurrent = currentIdx === idx;

                  return (
                    <div key={step.key} className="flex flex-col items-center relative z-10">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                        isCurrent 
                          ? 'bg-amber-800 text-white ring-4 ring-amber-100' 
                          : isComplete 
                          ? 'bg-emerald-600 text-white' 
                          : 'bg-neutral-200 text-neutral-500'
                      }`}>
                        {isComplete ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                      </div>
                      <span className={`text-[10px] mt-1 font-semibold ${isCurrent ? 'text-amber-900' : isComplete ? 'text-neutral-800' : 'text-neutral-400'}`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Order Quick Transition Actions */}
          <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-2xs space-y-2.5">
            <div className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
              Update Current Status
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Refunded'] as OrderStatus[]).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => handleStatusChange(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    order.status === st 
                      ? 'bg-amber-800 text-white shadow-2xs' 
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  }`}
                >
                  {st === 'Confirmed' ? 'Confirm Order' : st}
                </button>
              ))}
            </div>
          </div>

          {/* 3. COURIER DISPATCH & AUTOMATION PANEL */}
          <div className="bg-gradient-to-br from-amber-50/40 via-white to-purple-50/40 p-4.5 rounded-2xl border border-amber-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-100 text-purple-700 rounded-xl">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">Courier Logistics & Dispatch</h3>
                  <p className="text-[11px] text-neutral-500">Automated courier booking with API fallback routing.</p>
                </div>
              </div>

              {/* Live Courier Status Tag */}
              <div>
                {order.courierBookingStatus === 'booked' || isAlreadyBooked ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Booked with Courier
                  </span>
                ) : order.courierBookingStatus === 'failed' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    Booking Failed
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-600 border border-stone-200">
                    Unbooked
                  </span>
                )}
              </div>
            </div>

            {/* Booked Consignment Details Display */}
            {isAlreadyBooked ? (
              <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-emerald-900 font-medium">Assigned Courier:</span>
                  <strong className="text-emerald-950 font-bold">{order.courierName || 'Steadfast Courier'}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-emerald-900 font-medium">Consignment / Tracking ID:</span>
                  <span className="font-mono font-bold text-emerald-950 bg-emerald-100/70 px-2 py-0.5 rounded">
                    {order.courierConsignmentId || order.trackingNumber}
                  </span>
                </div>
                {order.courierTrackingUrl && (
                  <div className="pt-1 flex items-center justify-end">
                    <a
                      href={order.courierTrackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-purple-700 hover:text-purple-900 underline"
                    >
                      <span>Live Courier Tracking</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            ) : (
              /* Auto-Dispatch Action & Fallback */
              <div className="space-y-3">
                {order.courierBookingStatus === 'failed' && order.courierLastError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      Booking Failed:
                    </div>
                    <p className="text-[11px] font-mono text-rose-700">{order.courierLastError}</p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <button
                    type="button"
                    disabled={isBooking}
                    onClick={() => handleAutoDispatch()}
                    className="flex-1 py-2.5 px-4 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isBooking ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Connecting Courier API...
                      </>
                    ) : order.courierBookingStatus === 'failed' ? (
                      <>
                        <RotateCcw className="w-4 h-4" />
                        Retry Auto-Dispatch (Priority Fallback)
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 text-amber-200" />
                        1-Click Auto Dispatch Order
                      </>
                    )}
                  </button>

                  {/* Specific carrier dispatch dropdown */}
                  <select
                    disabled={isBooking}
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAutoDispatch(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="text-xs py-2 px-3 bg-white border border-stone-300 rounded-xl text-stone-700 font-medium focus:ring-2 focus:ring-amber-500 cursor-pointer disabled:opacity-50"
                  >
                    <option value="">Dispatch with specific carrier...</option>
                    {couriers.filter(c => c.isActive).map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.isDefault ? '(Default)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Manual Tracking Assignment Form */}
            <div className="pt-3 border-t border-stone-200/80">
              <div className="text-[11px] font-bold text-stone-600 uppercase tracking-wider mb-2">
                Manual Tracking Override
              </div>
              <form onSubmit={handleManualSaveTracking} className="flex gap-2">
                <select
                  value={selectedCourierId}
                  onChange={(e) => setSelectedCourierId(e.target.value)}
                  className="text-xs p-2 border border-stone-300 rounded-xl bg-white text-stone-800 w-36"
                >
                  {couriers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Enter manual Tracking / Consignment Code"
                  value={manualTrackingInput}
                  onChange={(e) => setManualTrackingInput(e.target.value)}
                  className="flex-1 text-xs p-2 border border-stone-300 rounded-xl font-mono"
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-stone-800 hover:bg-stone-900 text-white rounded-xl text-xs font-semibold transition shrink-0"
                >
                  Save Code
                </button>
              </form>
            </div>
          </div>

          {/* 4. Customer Details */}
          <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-2xs space-y-2">
            <div className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-amber-800" />
              Customer & Shipping Details
            </div>
            <div className="text-xs space-y-1">
              <div className="font-bold text-neutral-900 text-sm">{order.customer?.name}</div>
              <div className="text-neutral-500 font-mono flex items-center gap-2">
                <span>{order.customer?.phone}</span>
                {order.customer?.email && (
                  <span className="text-neutral-400 flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {order.customer.email}
                  </span>
                )}
              </div>
            </div>
            <div className="text-xs text-neutral-700 pt-1.5 border-t border-neutral-100 flex items-start gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0 mt-0.5" />
              <div>
                <div>{order.customer?.address}</div>
                <div className="text-neutral-500 font-medium">
                  {order.customer?.thana ? `${order.customer?.thana}, ` : ''}{order.customer?.district || 'Dhaka'}
                </div>
              </div>
            </div>
            {order.customer?.note && (
              <div className="text-xs p-2 bg-neutral-50 rounded-lg text-neutral-600 italic border border-neutral-100 mt-2">
                <strong>Customer Note:</strong> "{order.customer.note}"
              </div>
            )}
          </div>

          {/* 5. Ordered Line Items Breakdown */}
          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            <div className="p-3 bg-neutral-50 border-b border-neutral-200 text-xs font-bold text-neutral-700 uppercase tracking-wider">
              Order Line Items ({order.items?.length || 0})
            </div>
            <div className="divide-y divide-neutral-100">
              {order.items?.map((item, idx) => (
                <div key={idx} className="p-3 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-neutral-100 border border-neutral-200 overflow-hidden shrink-0">
                      {item.product?.image ? (
                        <img src={item.product.image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-5 h-5 text-neutral-400 m-auto mt-3" />
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-neutral-900 text-sm">{item.product?.name || 'Jewelry Item'}</div>
                      <div className="text-neutral-500 text-[11px] mt-0.5">
                        {item.selectedFinish && <span className="mr-2">Finish: <strong>{item.selectedFinish}</strong></span>}
                        {item.selectedSize && <span>Size: <strong>{item.selectedSize}</strong></span>}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-neutral-900">৳{((item.product?.price || 0) * (item.quantity || 1)).toLocaleString()}</div>
                    <div className="text-neutral-400 text-[11px]">৳{item.product?.price} × {item.quantity}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Price Breakdown Footer */}
            <div className="p-4 bg-neutral-50/80 border-t border-neutral-200 space-y-1.5 text-xs">
              <div className="flex justify-between text-neutral-600">
                <span>Subtotal</span>
                <span className="font-mono">৳{(order.subtotal || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>Shipping Fee</span>
                <span className="font-mono">+৳{(order.shippingCharge || 0).toLocaleString()}</span>
              </div>
              {(order.discount || 0) > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Discount Coupon</span>
                  <span className="font-mono">-৳{order.discount?.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-neutral-900 pt-2 border-t border-neutral-200">
                <span>Total Amount</span>
                <span className="font-mono text-amber-900">৳{(order.total || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* 6. Staff Internal Notes */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-amber-800" />
              Staff Audit & Internal Notes
            </div>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {order.adminNotes && order.adminNotes.length > 0 ? (
                order.adminNotes.map((note, idx) => (
                  <div key={idx} className="p-2 bg-neutral-50 border border-neutral-200 rounded-lg text-xs text-neutral-700 font-mono">
                    {note}
                  </div>
                ))
              ) : (
                <div className="text-xs text-neutral-400 italic">No internal staff notes yet.</div>
              )}
            </div>

            <form onSubmit={handleAddNote} className="flex gap-2">
              <input
                type="text"
                placeholder="Add internal order note or dispatch update..."
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                className="flex-1 text-xs p-2.5 border border-neutral-200 rounded-xl"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                Add Note
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
