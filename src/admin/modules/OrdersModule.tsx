import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Eye, 
  Printer, 
  CheckCircle, 
  Clock, 
  Truck, 
  XCircle, 
  FileText, 
  Phone, 
  MapPin, 
  User, 
  Calendar, 
  Send, 
  Download,
  AlertCircle,
  PackageCheck,
  RotateCcw,
  Check,
  Package,
  Layers,
  ShoppingBag,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Mail,
  CheckSquare,
  Square,
  MinusSquare,
  AlertTriangle,
  Zap,
  CheckCircle2,
  X,
  Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAdminStore } from '../../store/useAdminStore';
import { Order, OrderStatus } from '../../types';
import { OrderDetailsModal } from './OrderDetailsModal';

interface StatusSegment {
  id: string;
  label: string;
  countKey?: OrderStatus | 'all';
  icon: React.ElementType;
  colorClass: string;
  activeClass: string;
}

export const OrdersModule: React.FC = () => {
  const { 
    orders, 
    couriers,
    updateOrderStatus, 
    bulkUpdateOrderStatus, 
    bulkDeleteOrders,
    autoBookOrderWithCourier,
    isSyncing 
  } = useAdminStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSegment, setSelectedSegment] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusChangeSuccess, setStatusChangeSuccess] = useState<string | null>(null);
  const [isChangingStatus, setIsChangingStatus] = useState<string | null>(null);
  const [quickBookingId, setQuickBookingId] = useState<string | null>(null);

  // Bulk Selection States
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [bulkActionTargetStatus, setBulkActionTargetStatus] = useState<OrderStatus | null>(null);
  const [isBulkConfirmOpen, setIsBulkConfirmOpen] = useState(false);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
  const [bulkNotification, setBulkNotification] = useState<{ message: string; type: 'success' | 'warning' | 'error' } | null>(null);

  // Safe date parsing helper for timestamps/strings
  const parseOrderDate = (dateVal: any): Date => {
    if (!dateVal) return new Date();
    if (typeof dateVal.toDate === 'function') return dateVal.toDate();
    if (typeof dateVal === 'object' && typeof dateVal.seconds === 'number') {
      return new Date(dateVal.seconds * 1000);
    }
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  // Dynamic Live Counts calculation directly from orders
  const counts = useMemo(() => {
    const normalize = (st: any) => (typeof st === 'string' ? st.toLowerCase().trim() : '');
    
    return {
      all: orders.length,
      pending: orders.filter(o => {
        const s = normalize(o.status);
        return s === 'pending' || s === 'pending confirmation' || s === 'pending_confirmation';
      }).length,
      confirmed: orders.filter(o => normalize(o.status) === 'confirmed').length,
      processing: orders.filter(o => {
        const s = normalize(o.status);
        return s === 'processing' || s === 'packed';
      }).length,
      shipped: orders.filter(o => {
        const s = normalize(o.status);
        return s === 'shipped' || s === 'shipping' || s === 'courier';
      }).length,
      delivered: orders.filter(o => {
        const s = normalize(o.status);
        return s === 'delivered' || s === 'completed';
      }).length,
      cancelled: orders.filter(o => {
        const s = normalize(o.status);
        return s === 'cancelled' || s === 'canceled' || s.includes('cancel');
      }).length,
      refunded: orders.filter(o => {
        const s = normalize(o.status);
        return s === 'refunded' || s === 'refund' || s.includes('refund');
      }).length,
    };
  }, [orders]);

  // 8 Final Segments as requested (Packed & Pending Confirmation removed)
  const statusSegments: StatusSegment[] = [
    { id: 'all', label: 'All Orders', icon: Layers, colorClass: 'text-neutral-700 bg-neutral-100', activeClass: 'bg-neutral-900 text-white' },
    { id: 'Pending', label: 'Pending', icon: Clock, colorClass: 'text-amber-700 bg-amber-50', activeClass: 'bg-amber-600 text-white' },
    { id: 'Confirmed', label: 'Confirmed', icon: CheckCircle, colorClass: 'text-teal-700 bg-teal-50', activeClass: 'bg-teal-700 text-white' },
    { id: 'Processing', label: 'Processing', icon: RefreshCw, colorClass: 'text-blue-700 bg-blue-50', activeClass: 'bg-blue-600 text-white' },
    { id: 'Shipped', label: 'Shipped', icon: Truck, colorClass: 'text-purple-700 bg-purple-50', activeClass: 'bg-purple-600 text-white' },
    { id: 'Delivered', label: 'Delivered', icon: PackageCheck, colorClass: 'text-emerald-700 bg-emerald-50', activeClass: 'bg-emerald-600 text-white' },
    { id: 'Cancelled', label: 'Cancelled', icon: XCircle, colorClass: 'text-rose-700 bg-rose-50', activeClass: 'bg-rose-600 text-white' },
    { id: 'Refunded', label: 'Refunded', icon: RotateCcw, colorClass: 'text-slate-700 bg-slate-100', activeClass: 'bg-slate-700 text-white' },
  ];

  const getSegmentCount = (id: string) => {
    switch (id) {
      case 'all': return counts.all;
      case 'Pending': return counts.pending;
      case 'Confirmed': return counts.confirmed;
      case 'Processing': return counts.processing;
      case 'Shipped': return counts.shipped;
      case 'Delivered': return counts.delivered;
      case 'Cancelled': return counts.cancelled;
      case 'Refunded': return counts.refunded;
      default: return 0;
    }
  };

  // Filtered Orders Logic
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const normStatus = (typeof order.status === 'string' ? order.status : '').toLowerCase().trim();

      // Status Segment Tab Filter
      if (selectedSegment !== 'all') {
        const seg = (selectedSegment || '').toLowerCase().trim();
        if (seg === 'pending') {
          if (normStatus !== 'pending' && normStatus !== 'pending confirmation' && normStatus !== 'pending_confirmation') return false;
        } else if (seg === 'processing') {
          if (normStatus !== 'processing' && normStatus !== 'packed') return false;
        } else if (seg === 'shipped') {
          if (normStatus !== 'shipped' && normStatus !== 'shipping' && normStatus !== 'courier') return false;
        } else if (seg === 'delivered') {
          if (normStatus !== 'delivered' && normStatus !== 'completed') return false;
        } else if (seg === 'cancelled' || seg === 'canceled') {
          if (normStatus !== 'cancelled' && normStatus !== 'canceled' && !normStatus.includes('cancel')) return false;
        } else if (seg === 'refunded') {
          if (normStatus !== 'refunded' && normStatus !== 'refund' && !normStatus.includes('refund')) return false;
        } else {
          if (normStatus !== seg) return false;
        }
      }

      // Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchId = (order.orderNumber || order.id || '').toLowerCase().includes(q);
        const matchName = (order.customer?.name || '').toLowerCase().includes(q);
        const matchPhone = (order.customer?.phone || '').toLowerCase().includes(q);
        const matchDistrict = (order.customer?.district || '').toLowerCase().includes(q);
        const matchThana = (order.customer?.thana || '').toLowerCase().includes(q);
        const matchAddress = (order.customer?.address || '').toLowerCase().includes(q);
        const matchTracking = (order.trackingNumber || order.courierConsignmentId || '').toLowerCase().includes(q);
        const matchItem = order.items?.some(it => (it.product?.name || '').toLowerCase().includes(q));

        if (!matchId && !matchName && !matchPhone && !matchDistrict && !matchThana && !matchAddress && !matchTracking && !matchItem) {
          return false;
        }
      }

      // Payment Method/Status Filter
      if (paymentFilter !== 'all') {
        if (paymentFilter === 'cod' && order.paymentMethod !== 'cod') return false;
        if (paymentFilter === 'digital' && order.paymentMethod === 'cod') return false;
        if (paymentFilter === 'paid' && order.paymentStatus !== 'paid') return false;
        if (paymentFilter === 'unpaid' && order.paymentStatus !== 'unpaid') return false;
      }

      // Date Filter
      if (dateFilter !== 'all') {
        const orderDate = parseOrderDate(order.date || order.createdAt);
        const today = new Date();
        if (dateFilter === 'today') {
          if (orderDate.toDateString() !== today.toDateString()) return false;
        } else if (dateFilter === 'week') {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(today.getDate() - 7);
          if (orderDate < sevenDaysAgo) return false;
        } else if (dateFilter === 'month') {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(today.getDate() - 30);
          if (orderDate < thirtyDaysAgo) return false;
        }
      }

      return true;
    });
  }, [orders, selectedSegment, searchQuery, paymentFilter, dateFilter]);

  // Bulk Selection Handlers (No arbitrary limits)
  const isAllVisibleSelected = useMemo(() => {
    if (filteredOrders.length === 0) return false;
    return filteredOrders.every(o => selectedOrderIds.has(o.id));
  }, [filteredOrders, selectedOrderIds]);

  const isSomeVisibleSelected = useMemo(() => {
    if (filteredOrders.length === 0) return false;
    return filteredOrders.some(o => selectedOrderIds.has(o.id)) && !isAllVisibleSelected;
  }, [filteredOrders, selectedOrderIds, isAllVisibleSelected]);

  const handleToggleSelectAll = () => {
    const newSet = new Set(selectedOrderIds);
    if (isAllVisibleSelected) {
      filteredOrders.forEach(o => newSet.delete(o.id));
    } else {
      filteredOrders.forEach(o => newSet.add(o.id));
    }
    setSelectedOrderIds(newSet);
  };

  const handleToggleOrderSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSet = new Set(selectedOrderIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedOrderIds(newSet);
  };

  const handleClearSelection = () => {
    setSelectedOrderIds(new Set());
  };

  const initiateBulkAction = (status: OrderStatus) => {
    if (selectedOrderIds.size === 0) return;
    setBulkActionTargetStatus(status);
    setIsBulkConfirmOpen(true);
  };

  const executeBulkStatusChange = async () => {
    if (!bulkActionTargetStatus || selectedOrderIds.size === 0) return;

    setIsBulkProcessing(true);
    const targetIds = Array.from(selectedOrderIds) as string[];

    try {
      const result = await bulkUpdateOrderStatus(targetIds, bulkActionTargetStatus);
      
      setIsBulkConfirmOpen(false);
      setIsBulkProcessing(false);
      setSelectedOrderIds(new Set());

      if (result.failCount === 0) {
        setBulkNotification({
          message: `Successfully updated ${result.successCount} order${result.successCount > 1 ? 's' : ''} to "${bulkActionTargetStatus}".`,
          type: 'success'
        });
      } else if (result.successCount > 0 && result.failCount > 0) {
        setBulkNotification({
          message: `${result.successCount} order(s) updated successfully. ${result.failCount} order(s) failed to update.`,
          type: 'warning'
        });
      } else {
        setBulkNotification({
          message: `Failed to update ${result.failCount} orders. Please check your network connection.`,
          type: 'error'
        });
      }

      setTimeout(() => {
        setBulkNotification(null);
      }, 5000);
    } catch (err: any) {
      setIsBulkConfirmOpen(false);
      setIsBulkProcessing(false);
      setBulkNotification({
        message: `An error occurred during bulk update: ${err.message || 'Unknown error'}`,
        type: 'error'
      });
      setTimeout(() => {
        setBulkNotification(null);
      }, 5000);
    }
  };

  // Bulk Auto-Dispatch to Courier
  const handleBulkAutoDispatch = async () => {
    if (selectedOrderIds.size === 0) return;
    setIsBulkProcessing(true);
    const targetIds: string[] = Array.from(selectedOrderIds);
    let successCount = 0;
    let failCount = 0;

    for (const id of targetIds) {
      try {
        const res = await autoBookOrderWithCourier(id);
        if (res.success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (err) {
        failCount++;
      }
    }

    setIsBulkProcessing(false);
    setSelectedOrderIds(new Set());

    if (failCount === 0) {
      setBulkNotification({
        message: `Successfully dispatched ${successCount} orders to Courier API.`,
        type: 'success'
      });
    } else {
      setBulkNotification({
        message: `${successCount} dispatched successfully, ${failCount} failed. Check courier API settings.`,
        type: 'warning'
      });
    }

    setTimeout(() => {
      setBulkNotification(null);
    }, 5000);
  };

  // Bulk Permanent Delete Orders
  const initiateBulkDelete = () => {
    if (selectedOrderIds.size === 0) return;
    setIsDeleteConfirmOpen(true);
  };

  const executeBulkDelete = async () => {
    if (selectedOrderIds.size === 0) return;

    setIsDeletingBulk(true);
    const targetIds = Array.from(selectedOrderIds) as string[];

    try {
      const result = await bulkDeleteOrders(targetIds);

      setIsDeletingBulk(false);
      setIsDeleteConfirmOpen(false);

      if (result.success && result.deletedCount > 0) {
        setSelectedOrderIds(new Set());
        toast.success(`Successfully deleted ${result.deletedCount} order${result.deletedCount > 1 ? 's' : ''} permanently from Firestore!`, {
          duration: 4000,
          id: 'bulk-delete-success'
        });
      } else if (result.deletedCount > 0 && result.failedCount > 0) {
        // Partial success: clear selection, notify of partial failure
        setSelectedOrderIds(new Set());
        toast.error(`${result.deletedCount} order(s) deleted, but ${result.failedCount} order(s) failed to delete from Firestore.`, {
          duration: 5000,
          id: 'bulk-delete-partial'
        });
      } else {
        toast.error(`Failed to delete selected orders from Firestore. Please verify admin permissions.`, {
          duration: 5000,
          id: 'bulk-delete-fail'
        });
      }
    } catch (err: any) {
      setIsDeletingBulk(false);
      setIsDeleteConfirmOpen(false);
      toast.error(`Error deleting orders: ${err.message || 'Unknown error'}`, {
        duration: 5000,
        id: 'bulk-delete-error'
      });
    }
  };

  // Quick 1-Click Dispatch from Table Row
  const handleQuickRowDispatch = async (orderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setQuickBookingId(orderId);
    try {
      const result = await autoBookOrderWithCourier(orderId);
      if (result.success) {
        setStatusChangeSuccess(`Booked with ${result.courierName}! Tracking: ${result.consignmentId}`);
      } else {
        setBulkNotification({
          message: result.errorMessage || 'Courier booking failed. Check API credentials in Courier Settings.',
          type: 'error'
        });
      }
    } catch (err: any) {
      setBulkNotification({
        message: err.message || 'Failed to dispatch order with courier API.',
        type: 'error'
      });
    } finally {
      setQuickBookingId(null);
      setTimeout(() => setStatusChangeSuccess(null), 4000);
      setTimeout(() => setBulkNotification(null), 6000);
    }
  };

  // Status Styling Badge
  const getStatusBadge = (status: OrderStatus | string) => {
    const norm = (status || '').toLowerCase().trim();
    switch (norm) {
      case 'pending':
      case 'pending confirmation':
      case 'pending_confirmation':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/60 whitespace-nowrap"><Clock className="w-3 h-3 text-amber-600" /> Pending</span>;
      case 'confirmed':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-teal-50 text-teal-800 border border-teal-200/60 whitespace-nowrap"><CheckCircle className="w-3 h-3 text-teal-600" /> Confirmed</span>;
      case 'processing':
      case 'packed':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200/60 whitespace-nowrap"><RefreshCw className="w-3 h-3 text-blue-600" /> Processing</span>;
      case 'shipped':
      case 'shipping':
      case 'courier':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-800 border border-purple-200/60 whitespace-nowrap"><Truck className="w-3 h-3 text-purple-600" /> Shipped</span>;
      case 'delivered':
      case 'completed':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/60 whitespace-nowrap"><PackageCheck className="w-3 h-3 text-emerald-600" /> Delivered</span>;
      case 'cancelled':
      case 'canceled':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-200/60 whitespace-nowrap"><XCircle className="w-3 h-3 text-rose-600" /> Cancelled</span>;
      case 'refunded':
      case 'refund':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-300 whitespace-nowrap"><RotateCcw className="w-3 h-3 text-slate-600" /> Refunded</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-100 text-neutral-800 border border-neutral-200 whitespace-nowrap">{status}</span>;
    }
  };

  // Payment Status Badge
  const getPaymentBadge = (method: string, pStatus: string) => {
    const isPaid = pStatus === 'paid';
    return (
      <div className="flex items-center gap-1.5 whitespace-nowrap">
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${method === 'cod' ? 'bg-neutral-100 text-neutral-700' : 'bg-pink-50 text-pink-700 border border-pink-200'}`}>
          {method}
        </span>
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${isPaid ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
          {isPaid ? 'Paid' : 'Unpaid'}
        </span>
      </div>
    );
  };

  // Single Order Status Change Handler
  const handleSingleStatusChange = async (orderId: string, newStatus: OrderStatus, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsChangingStatus(orderId);
    try {
      await updateOrderStatus(orderId, newStatus);
      setStatusChangeSuccess(`Order status updated to ${newStatus}`);
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
      setTimeout(() => setStatusChangeSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to change order status:', err);
    } finally {
      setIsChangingStatus(null);
    }
  };

  // Invoice Print Action
  const handlePrintInvoice = (order: Order, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice - ${order.orderNumber}</title>
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 30px; color: #1f2937; max-width: 800px; margin: 0 auto; font-size: 13px; line-height: 1.5; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #851e3e; padding-bottom: 20px; margin-bottom: 25px; }
          .logo { font-size: 24px; font-weight: bold; color: #851e3e; letter-spacing: 1px; }
          .invoice-title { font-size: 20px; font-weight: bold; text-align: right; color: #111827; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
          .section-title { font-weight: bold; text-transform: uppercase; font-size: 11px; color: #6b7280; margin-bottom: 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th { background: #f9fafb; text-align: left; padding: 10px; font-size: 11px; text-transform: uppercase; color: #4b5563; border-bottom: 2px solid #e5e7eb; }
          td { padding: 12px 10px; border-bottom: 1px solid #f3f4f6; }
          .total-box { margin-left: auto; width: 280px; }
          .total-row { display: flex; justify-content: space-between; padding: 6px 0; }
          .grand-total { font-size: 16px; font-weight: bold; color: #851e3e; border-top: 2px solid #851e3e; padding-top: 10px; margin-top: 6px; }
          .footer { text-align: center; margin-top: 50px; padding-top: 20px; border-top: 1px dashed #d1d5db; font-size: 11px; color: #6b7280; }
          @media print { body { padding: 0; } .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">HOUSE OF MAHI</div>
            <div style="color: #6b7280; font-size: 12px; margin-top: 4px;">Exclusive Jewelry & Lifestyle</div>
            <div style="color: #6b7280; font-size: 12px;">Hotline: +880 1400-031902</div>
          </div>
          <div class="invoice-title">
            <div>INVOICE</div>
            <div style="font-size: 14px; font-weight: normal; color: #4b5563; margin-top: 4px;">#${order.orderNumber}</div>
            <div style="font-size: 12px; font-weight: normal; color: #6b7280;">Date: ${order.date || new Date().toLocaleDateString()}</div>
          </div>
        </div>

        <div class="info-grid">
          <div>
            <div class="section-title">Bill & Ship To:</div>
            <div style="font-weight: bold; font-size: 14px; color: #111827;">${order.customer?.name}</div>
            <div style="margin-top: 4px;">Phone: ${order.customer?.phone}</div>
            <div>Address: ${order.customer?.address}</div>
            <div>${order.customer?.thana}, ${order.customer?.district}</div>
            ${order.customer?.email ? `<div>Email: ${order.customer.email}</div>` : ''}
          </div>
          <div>
            <div class="section-title">Order & Dispatch Info:</div>
            <div>Payment: <strong>${order.paymentMethod?.toUpperCase()} (${order.paymentStatus?.toUpperCase()})</strong></div>
            <div>Status: <strong>${order.status}</strong></div>
            ${order.courierName ? `<div>Courier: <strong>${order.courierName}</strong></div>` : ''}
            ${(order.courierConsignmentId || order.trackingNumber) ? `<div>Consignment: <strong>${order.courierConsignmentId || order.trackingNumber}</strong></div>` : ''}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 50%;">Product Details</th>
              <th style="text-align: center;">Price</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${order.items?.map(it => `
              <tr>
                <td>
                  <div style="font-weight: bold; color: #111827;">${it.product?.name}</div>
                  ${it.selectedFinish ? `<span style="font-size: 11px; color: #6b7280;">Finish: ${it.selectedFinish}</span>` : ''}
                  ${it.selectedSize ? `<span style="font-size: 11px; color: #6b7280;"> | Size: ${it.selectedSize}</span>` : ''}
                </td>
                <td style="text-align: center;">৳${it.product?.price}</td>
                <td style="text-align: center;">${it.quantity}</td>
                <td style="text-align: right; font-weight: bold;">৳${(it.product?.price || 0) * it.quantity}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="total-box">
          <div class="total-row"><span>Subtotal:</span><span>৳${order.subtotal || 0}</span></div>
          <div class="total-row"><span>Shipping Fee:</span><span>৳${order.shippingCharge || 0}</span></div>
          ${(order.discount || 0) > 0 ? `<div class="total-row" style="color: #059669;"><span>Discount:</span><span>-৳${order.discount}</span></div>` : ''}
          <div class="total-row grand-total"><span>Grand Total:</span><span>৳${order.total || 0}</span></div>
        </div>

        <div class="footer">
          <p>Thank you for choosing House of Mahi! For questions, email mahimahosting@gmail.com</p>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Find the currently active selected order object
  const currentSelectedOrder = useMemo(() => {
    if (!selectedOrder) return null;
    return orders.find(o => o.id === selectedOrder.id) || selectedOrder;
  }, [orders, selectedOrder]);

  return (
    <div className="space-y-4 pb-12">
      {/* 1. Header & Quick Stat Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-neutral-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-neutral-900 tracking-tight">Order & Shipment Management</h1>
            {isSyncing && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                <RefreshCw className="w-3 h-3 animate-spin" /> Syncing Cloud
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Real-time live synchronization with Firestore, 1-click courier automated dispatch, and batch processing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const csvData = orders.map(o => `"${o.orderNumber}","${o.customer?.name}","${o.customer?.phone}","${o.total}","${o.status}","${o.courierName || ''}","${o.courierConsignmentId || o.trackingNumber || ''}","${o.paymentMethod}","${o.date}"`).join('\n');
              const blob = new Blob([`Order ID,Customer,Phone,Total,Status,Courier,Tracking,Payment,Date\n${csvData}`], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `orders-export-${Date.now()}.csv`;
              a.click();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Global Notifications */}
      {statusChangeSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 animate-fadeIn">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{statusChangeSuccess}</span>
        </div>
      )}

      {bulkNotification && (
        <div className={`p-3 border text-xs rounded-xl flex items-center justify-between gap-2 animate-fadeIn ${
          bulkNotification.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
          bulkNotification.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' :
          'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <div className="flex items-center gap-2">
            {bulkNotification.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />}
            {bulkNotification.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />}
            {bulkNotification.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
            <span className="font-medium">{bulkNotification.message}</span>
          </div>
          <button onClick={() => setBulkNotification(null)} className="text-neutral-400 hover:text-neutral-700">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. Order Status Segments / Tabs with Live Dynamic Counts */}
      <div className="bg-white p-2 rounded-xl border border-neutral-200 shadow-2xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5">
          {statusSegments.map((segment) => {
            const Icon = segment.icon;
            const count = getSegmentCount(segment.id);
            const isSelected = selectedSegment === segment.id;

            return (
              <button
                key={segment.id}
                onClick={() => {
                  setSelectedSegment(segment.id);
                }}
                className={`flex items-center justify-between p-2 rounded-lg text-left transition-all ${
                  isSelected 
                    ? segment.activeClass + ' shadow-xs font-semibold' 
                    : 'bg-neutral-50/70 hover:bg-neutral-100 text-neutral-700'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-neutral-500'}`} />
                  <span className="text-xs truncate">{segment.label}</span>
                </div>
                <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-bold ml-1 shrink-0 ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-neutral-200/80 text-neutral-800'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="bg-white p-3 rounded-xl border border-neutral-200 shadow-2xs flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Order #, Customer Name, Phone, Address, Tracking..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-neutral-50 hover:bg-neutral-100/70 focus:bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-800 transition-colors"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 text-xs">
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1">
            <Filter className="w-3.5 h-3.5 text-neutral-400" />
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="text-xs bg-transparent border-none outline-none text-neutral-700 cursor-pointer"
            >
              <option value="all">All Payments</option>
              <option value="cod">Cash on Delivery (COD)</option>
              <option value="digital">bKash / Nagad / Card</option>
              <option value="paid">Paid Status</option>
              <option value="unpaid">Unpaid Status</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1">
            <Calendar className="w-3.5 h-3.5 text-neutral-400" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="text-xs bg-transparent border-none outline-none text-neutral-700 cursor-pointer"
            >
              <option value="all">All Dates</option>
              <option value="today">Today's Orders</option>
              <option value="week">Past 7 Days</option>
              <option value="month">Past 30 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Bulk Action Floating / Sticky Toolbar */}
      {selectedOrderIds.size > 0 && (
        <div className="sticky top-2 z-20 bg-neutral-900 text-white p-3 rounded-xl shadow-lg border border-neutral-800 flex flex-wrap items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-neutral-800 px-3 py-1.5 rounded-lg border border-neutral-700">
              <CheckSquare className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold tracking-wide">
                {selectedOrderIds.size} {selectedOrderIds.size === 1 ? 'Order' : 'Orders'} Selected
              </span>
            </div>
            <button
              onClick={handleClearSelection}
              className="text-xs text-neutral-400 hover:text-white underline transition-colors cursor-pointer"
            >
              Deselect All
            </button>
            <button
              disabled={isBulkProcessing || isDeletingBulk}
              onClick={initiateBulkDelete}
              className="ml-1 sm:ml-2 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-sm disabled:opacity-50 cursor-pointer"
              title={`Permanently delete ${selectedOrderIds.size} selected order(s) from Firestore`}
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-100" />
              Delete Selected ({selectedOrderIds.size})
            </button>
          </div>

          {/* Bulk Action Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* 1-Click Auto Dispatch Selected Orders */}
            <button
              disabled={isBulkProcessing}
              onClick={handleBulkAutoDispatch}
              className="px-3 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-sm disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5 text-amber-200" />
              Auto Dispatch ({selectedOrderIds.size})
            </button>

            <span className="text-[11px] font-semibold text-neutral-400 mx-1 hidden sm:inline">|</span>
            
            <button
              disabled={isBulkProcessing}
              onClick={() => initiateBulkAction('Confirmed')}
              className="px-2.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-2xs disabled:opacity-50"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Confirm ({selectedOrderIds.size})
            </button>

            <button
              disabled={isBulkProcessing}
              onClick={() => initiateBulkAction('Processing')}
              className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-2xs disabled:opacity-50"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Processing ({selectedOrderIds.size})
            </button>

            <button
              disabled={isBulkProcessing}
              onClick={() => initiateBulkAction('Shipped')}
              className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-2xs disabled:opacity-50"
            >
              <Truck className="w-3.5 h-3.5" />
              Shipped ({selectedOrderIds.size})
            </button>

            <button
              disabled={isBulkProcessing}
              onClick={() => initiateBulkAction('Delivered')}
              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-2xs disabled:opacity-50"
            >
              <PackageCheck className="w-3.5 h-3.5" />
              Delivered ({selectedOrderIds.size})
            </button>

            <button
              disabled={isBulkProcessing}
              onClick={() => initiateBulkAction('Cancelled')}
              className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-2xs disabled:opacity-50"
            >
              <XCircle className="w-3.5 h-3.5" />
              Cancel ({selectedOrderIds.size})
            </button>

            <button
              disabled={isBulkProcessing}
              onClick={() => initiateBulkAction('Refunded')}
              className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-2xs disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Refund ({selectedOrderIds.size})
            </button>
          </div>
        </div>
      )}

      {/* 5. Compact Single-Row Orders Table */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50/80 border-b border-neutral-200 text-[11px] font-bold text-neutral-600 uppercase tracking-wider select-none">
                <th className="py-2.5 px-3 w-10 text-center">
                  <button
                    onClick={handleToggleSelectAll}
                    title={isAllVisibleSelected ? 'Deselect all visible' : 'Select all visible'}
                    className="flex items-center justify-center p-0.5 rounded text-neutral-500 hover:text-neutral-900 transition-colors"
                  >
                    {isAllVisibleSelected ? (
                      <CheckSquare className="w-4 h-4 text-amber-800" />
                    ) : isSomeVisibleSelected ? (
                      <MinusSquare className="w-4 h-4 text-amber-800" />
                    ) : (
                      <Square className="w-4 h-4 text-neutral-400" />
                    )}
                  </button>
                </th>
                <th className="py-2.5 px-3">Order ID</th>
                <th className="py-2.5 px-3">Customer</th>
                <th className="py-2.5 px-3 min-w-[190px]">Product Items</th>
                <th className="py-2.5 px-3 text-center">Qty</th>
                <th className="py-2.5 px-3 text-right">Total</th>
                <th className="py-2.5 px-3">Payment</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Courier</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-xs">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-neutral-400">
                    <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <div className="font-medium text-neutral-600">No orders found</div>
                    <div className="text-[11px] text-neutral-400 mt-0.5">Try adjusting your filters or search keywords</div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const isSelected = selectedOrderIds.has(order.id);
                  const totalItemsQty = order.items?.reduce((sum, it) => sum + (it.quantity || 1), 0) || 0;
                  const firstItem = order.items?.[0];
                  const hasMultiple = (order.items?.length || 0) > 1;
                  const isBooked = Boolean(order.courierBookingStatus === 'booked' || (order.courierConsignmentId && order.courierConsignmentId.length > 0));

                  return (
                    <tr
                      key={order.id}
                      onClick={() => setSelectedOrder(order)}
                      className={`cursor-pointer transition-colors group ${
                        isSelected 
                          ? 'bg-amber-50/60 hover:bg-amber-50' 
                          : 'hover:bg-neutral-50/90'
                      }`}
                    >
                      {/* Checkbox Column */}
                      <td className="py-2.5 px-3 text-center" onClick={(e) => handleToggleOrderSelection(order.id, e)}>
                        <button
                          type="button"
                          className="p-0.5 rounded text-neutral-400 hover:text-neutral-800 transition-colors"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-amber-800" />
                          ) : (
                            <Square className="w-4 h-4 text-neutral-300 group-hover:text-neutral-500" />
                          )}
                        </button>
                      </td>

                      {/* Order ID */}
                      <td className="py-2.5 px-3 font-mono font-bold text-neutral-900 whitespace-nowrap">
                        #{order.orderNumber || order.id}
                      </td>

                      {/* Customer Info */}
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-neutral-900 truncate max-w-[130px]" title={order.customer?.name}>
                          {order.customer?.name || 'Guest'}
                        </div>
                        <div className="text-[11px] text-neutral-500 font-mono">
                          {order.customer?.phone}
                        </div>
                      </td>

                      {/* Product Preview */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded bg-neutral-100 border border-neutral-200 overflow-hidden shrink-0">
                            {firstItem?.product?.image ? (
                              <img src={firstItem.product.image} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Package className="w-4 h-4 text-neutral-400 m-auto mt-1.5" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-neutral-900 font-medium truncate max-w-[160px]" title={firstItem?.product?.name}>
                              {firstItem?.product?.name || 'Custom Product'}
                            </div>
                            <div className="text-[10px] text-neutral-500">
                              {firstItem?.selectedFinish && <span>Finish: {firstItem.selectedFinish} • </span>}
                              {hasMultiple && (
                                <span className="text-amber-800 font-semibold">+{order.items.length - 1} more item(s)</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Total Qty */}
                      <td className="py-2.5 px-3 text-center font-mono font-medium text-neutral-700">
                        {totalItemsQty}
                      </td>

                      {/* Total Price */}
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-neutral-900 whitespace-nowrap">
                        ৳{(order.total || 0).toLocaleString()}
                      </td>

                      {/* Payment */}
                      <td className="py-2.5 px-3">
                        {getPaymentBadge(order.paymentMethod || 'cod', order.paymentStatus || 'unpaid')}
                      </td>

                      {/* Status Badge */}
                      <td className="py-2.5 px-3">
                        {getStatusBadge(order.status)}
                      </td>

                      {/* Courier Booking Status */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {isBooked ? (
                          <div className="flex flex-col">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 w-max">
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                              {order.courierName || 'Steadfast'}
                            </span>
                            <span className="text-[10px] font-mono text-neutral-500 mt-0.5 truncate max-w-[110px]" title={order.courierConsignmentId || order.trackingNumber}>
                              {order.courierConsignmentId || order.trackingNumber}
                            </span>
                          </div>
                        ) : order.courierBookingStatus === 'failed' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                            <AlertTriangle className="w-2.5 h-2.5 text-rose-500" /> Failed
                          </span>
                        ) : (
                          <span className="text-[11px] text-neutral-400 font-medium">Unbooked</span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-2.5 px-3 text-[11px] text-neutral-500 whitespace-nowrap">
                        {order.date ? new Date(order.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'Recent'}
                      </td>

                      {/* Individual Order Quick Actions */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {/* Quick 1-Click Dispatch Button */}
                          {!isBooked && order.status !== 'Cancelled' && order.status !== 'Refunded' && (
                            <button
                              type="button"
                              disabled={quickBookingId === order.id}
                              onClick={(e) => handleQuickRowDispatch(order.id, e)}
                              title="1-Click Auto Dispatch to Courier"
                              className="p-1 text-amber-700 hover:text-amber-900 hover:bg-amber-100 rounded-md transition-colors disabled:opacity-50"
                            >
                              {quickBookingId === order.id ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Zap className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}

                          {/* Quick Inline Status Change Dropdown */}
                          <select
                            value={order.status}
                            disabled={isChangingStatus === order.id}
                            onChange={(e) => handleSingleStatusChange(order.id, e.target.value as OrderStatus)}
                            className="text-[11px] font-semibold py-1 px-1.5 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-md focus:outline-none cursor-pointer"
                          >
                            <option value="Pending">Pending</option>
                            <option value="Confirmed">Confirmed</option>
                            <option value="Processing">Processing</option>
                            <option value="Shipped">Shipped</option>
                            <option value="Delivered">Delivered</option>
                            <option value="Cancelled">Cancelled</option>
                            <option value="Refunded">Refunded</option>
                          </select>

                          {/* Print Invoice */}
                          <button
                            onClick={(e) => handlePrintInvoice(order, e)}
                            title="Print Invoice"
                            className="p-1 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* View Full Details */}
                          <button
                            onClick={() => setSelectedOrder(order)}
                            title="View Full Order"
                            className="p-1 text-amber-800 hover:text-amber-900 hover:bg-amber-50 rounded-md transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Count Summary */}
        <div className="p-3 bg-neutral-50/70 border-t border-neutral-200 text-[11px] text-neutral-500 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            Showing <strong className="text-neutral-800">{filteredOrders.length}</strong> of <strong className="text-neutral-800">{orders.length}</strong> total orders
          </div>
          {selectedOrderIds.size > 0 && (
            <div className="font-semibold text-amber-900 bg-amber-100/60 px-2 py-0.5 rounded">
              {selectedOrderIds.size} orders currently selected for bulk processing
            </div>
          )}
        </div>
      </div>

      {/* 6. Bulk Action Confirmation Modal */}
      {isBulkConfirmOpen && bulkActionTargetStatus && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 animate-fadeIn space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900">Confirm Bulk Status Update</h3>
                <p className="text-xs text-neutral-500">Please review before executing the status transition.</p>
              </div>
            </div>

            <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-neutral-600">Selected Count:</span>
                <strong className="text-neutral-900">{selectedOrderIds.size} Orders</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">New Target Status:</span>
                <strong className="text-amber-900">{bulkActionTargetStatus}</strong>
              </div>
              <p className="text-[11px] text-neutral-500 pt-1 border-t border-neutral-200">
                All selected orders will be updated immediately in Firestore and shifted into the "{bulkActionTargetStatus}" segment.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isBulkProcessing}
                onClick={() => setIsBulkConfirmOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isBulkProcessing}
                onClick={executeBulkStatusChange}
                className="px-5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl transition-colors shadow-2xs flex items-center gap-1.5"
              >
                {isBulkProcessing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Updating {selectedOrderIds.size} Orders...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Confirm & Update ({selectedOrderIds.size})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6B. Bulk Delete Confirmation Modal */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 animate-fadeIn space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900">Delete Selected Orders</h3>
                <p className="text-xs text-neutral-500">Permanent Firestore Deletion</p>
              </div>
            </div>

            <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-xl text-xs space-y-2">
              <p className="text-neutral-800 font-medium">
                Are you sure you want to permanently delete <strong className="text-rose-900 font-bold">{selectedOrderIds.size}</strong> selected {selectedOrderIds.size === 1 ? 'order' : 'orders'}?
              </p>
              <p className="text-[11px] text-rose-700">
                This action cannot be undone. All selected order records will be permanently removed from Cloud Firestore.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeletingBulk}
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingBulk}
                onClick={executeBulkDelete}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold rounded-xl transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeletingBulk ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Deleting {selectedOrderIds.size} Orders...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Permanently Delete ({selectedOrderIds.size})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Detailed Order Modal / Slide Drawer Component */}
      {currentSelectedOrder && (
        <OrderDetailsModal
          order={currentSelectedOrder}
          onClose={() => setSelectedOrder(null)}
          onPrintInvoice={handlePrintInvoice}
        />
      )}
    </div>
  );
};

