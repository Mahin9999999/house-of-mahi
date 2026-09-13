import React, { useEffect, useState } from 'react';
import { CheckCircle2, ShoppingBag, ArrowRight, Home, Package, PhoneCall, Sparkles } from 'lucide-react';
import { Order } from '../types';

interface OrderSuccessModalProps {
  order: Order | null;
  onCloseAndGoHome: () => void;
  onTrackOrder: () => void;
}

export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({
  order,
  onCloseAndGoHome,
  onTrackOrder
}) => {
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    if (!order) return;
    setCountdown(10);
  }, [order]);

  useEffect(() => {
    if (!order) return;
    if (countdown <= 0) {
      onCloseAndGoHome();
      return;
    }
    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [order, countdown, onCloseAndGoHome]);

  if (!order) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-[#E8DFC2] overflow-hidden my-6 animate-scale-up">
        
        {/* Header Hero Section */}
        <div className="bg-gradient-to-b from-[#4A1525] to-[#360F1B] text-white p-6 text-center relative overflow-hidden">
          {/* Decorative Background Circles */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center">
            {/* Animated Success Badge */}
            <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg mb-3 ring-8 ring-emerald-500/20 animate-bounce">
              <CheckCircle2 size={36} />
            </div>

            <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-[11px] font-bold tracking-wider uppercase mb-1">
              <Sparkles size={12} />
              <span>Order Placed Successfully</span>
            </span>

            <h2 className="text-xl sm:text-2xl font-serif font-bold text-white">
              ধন্যবাদ! আপনার অর্ডার সম্পন্ন হয়েছে
            </h2>
            <p className="text-xs text-amber-100/80 mt-1 max-w-xs">
              আপনার অর্ডারের জন্য আপনাকে ধন্যবাদ। আমরা খুব শীঘ্রই আপনার পার্সেলটি ডেলিভারি টিমকে হস্তান্তর করব।
            </p>

            {/* Order ID Tag */}
            <div className="mt-3 bg-white/10 backdrop-blur-xs px-4 py-1.5 rounded-full border border-amber-300/30 flex items-center space-x-2">
              <span className="text-xs text-amber-200">Order ID:</span>
              <span className="text-sm font-mono font-black text-white">#{order.id}</span>
            </div>
          </div>
        </div>

        {/* Order Summary Details */}
        <div className="p-5 space-y-4 max-h-[50vh] overflow-y-auto">
          
          {/* Delivery Estimate Notification */}
          <div className="bg-[#FAF7F2] p-3.5 rounded-xl border border-[#E8DFC2] flex items-center space-x-3">
            <div className="p-2 bg-[#4A1525] text-amber-300 rounded-lg shrink-0">
              <Package size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-[#4A1525]">আনুমানিক ডেলিভারি সময়:</p>
              <p className="text-xs text-slate-600">২ - ৩ কার্যদিবস (ঢাকার ভেতরে ও বাইরে)</p>
            </div>
          </div>

          {/* Ordered Items List */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between border-b border-slate-100 pb-1">
              <span>অর্ডারকৃত পণ্যসমূহ ({order.items.reduce((a, b) => a + b.quantity, 0)}টি)</span>
              <span className="text-[#4A1525] font-black">৳ {order.total}</span>
            </h4>

            <div className="divide-y divide-slate-100 max-h-40 overflow-y-auto pr-1">
              {order.items.map((item, idx) => (
                <div key={idx} className="py-2.5 flex items-center space-x-3">
                  <img 
                    src={item.product.image} 
                    alt={item.product.name} 
                    className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0" 
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{item.product.name}</p>
                    <p className="text-[10px] text-slate-500">
                      পরিমাণ: {item.quantity} {item.selectedFinish ? `| ${item.selectedFinish}` : ''} {item.selectedSize ? `| ${item.selectedSize}` : ''}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-[#4A1525]">৳ {item.product.price * item.quantity}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery & Payment Details */}
          <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase">পেমেন্ট মেথড</p>
              <p className="font-bold text-slate-800 mt-0.5">{order.paymentMethod}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-semibold uppercase">স্ট্যাটাস</p>
              <p className="font-bold text-emerald-600 mt-0.5">পেন্ডিং / প্রসেসিং</p>
            </div>
            <div className="col-span-2 pt-1 border-t border-slate-200/60">
              <p className="text-[10px] text-slate-400 font-semibold uppercase">ডেলিভারি ঠিকানা</p>
              <p className="font-medium text-slate-700 text-[11px] mt-0.5 truncate">{order.shippingAddress}</p>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[#FAF7F2] border-t border-[#E8DFC2] space-y-2">
          
          <button
            onClick={onCloseAndGoHome}
            className="w-full bg-[#4A1525] hover:bg-[#360F1B] text-white text-xs font-bold py-3 rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 group"
          >
            <Home size={16} className="text-amber-300" />
            <span>হোম পেজে ফিরে যান ({countdown}s)</span>
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>

          <div className="flex items-center justify-between pt-1 px-1">
            <button
              onClick={onTrackOrder}
              className="text-xs font-bold text-[#4A1525] hover:underline flex items-center space-x-1"
            >
              <span>অর্ডার ট্র্যাক করুন</span>
            </button>
            <a 
              href="tel:01400031902" 
              className="text-[11px] text-slate-500 hover:text-[#4A1525] flex items-center space-x-1"
            >
              <PhoneCall size={12} className="text-amber-600" />
              <span>সহায়তার জন্য কল করুন: 01400-031902</span>
            </a>
          </div>

        </div>

      </div>
    </div>
  );
};
