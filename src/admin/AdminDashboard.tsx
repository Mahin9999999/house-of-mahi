import React, { useState } from 'react';
import { 
  Lock, 
  ShieldAlert, 
  ArrowLeft,
  Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AdminLogin } from './AdminLogin';
import { AdminLayout, AdminTab } from './AdminLayout';

import { DashboardModule } from './modules/DashboardModule';
import { DemandAnalysisModule } from './modules/DemandAnalysisModule';
import { OrdersModule } from './modules/OrdersModule';
import { ProductsModule } from './modules/ProductsModule';
import { CategoriesModule } from './modules/CategoriesModule';
import { BannersModule } from './modules/BannersModule';
import { HomepageModule } from './modules/HomepageModule';
import { CouponsModule } from './modules/CouponsModule';
import { CustomersModule } from './modules/CustomersModule';
import { ReviewsModule } from './modules/ReviewsModule';
import { MarketingModule } from './modules/MarketingModule';
import { SeoModule } from './modules/SeoModule';
import { SettingsModule } from './modules/SettingsModule';
import { CourierModule } from './modules/CourierModule';
import { PaymentGatewaysModule } from './modules/PaymentGatewaysModule';

interface AdminDashboardProps {
  onExitAdmin: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onExitAdmin }) => {
  const { currentUser, isAdmin, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');

  // 1. Initial Firebase auth state loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#2D0B16] via-[#4A1525] to-[#1F070E] flex items-center justify-center p-4">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4 text-center max-w-sm w-full">
          <Loader2 className="w-10 h-10 text-[#4A1525] animate-spin" />
          <div>
            <h3 className="font-serif font-bold text-stone-900 text-lg">Authenticating Access</h3>
            <p className="text-xs text-stone-500 mt-1">Verifying administrator credentials...</p>
          </div>
        </div>
      </div>
    );
  }

  // 2. Logged-out user: Render secure Admin Login portal
  if (!currentUser) {
    return (
      <AdminLogin 
        onSuccess={() => {}} 
        onClose={onExitAdmin} 
      />
    );
  }

  // 3. Logged-in non-admin user: Access Denied screen
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#2D0B16] via-[#4A1525] to-[#1F070E] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-rose-200 p-8 space-y-6 text-center">
          <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center shadow-inner">
            <ShieldAlert size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-serif font-bold text-stone-900">
              Access Denied
            </h2>
            <p className="text-xs text-stone-600 mt-2 leading-relaxed">
              Your account ({currentUser.email || 'User'}) does not have administrator privileges. Only authorized store management personnel can access this portal.
            </p>
          </div>

          <div className="pt-4 border-t border-stone-200 flex flex-col gap-2">
            <button
              onClick={onExitAdmin}
              className="w-full py-2.5 bg-stone-900 text-white rounded-xl font-medium text-xs hover:bg-stone-800 transition flex items-center justify-center gap-2"
            >
              <ArrowLeft size={14} />
              <span>Return to Storefront</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. Logged-in verified admin: Render Admin Layout with selected module
  return (
    <AdminLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onExitAdmin={onExitAdmin}
    >
      {activeTab === 'dashboard' && (
        <DashboardModule onNavigate={setActiveTab} />
      )}

      {activeTab === 'orders' && (
        <OrdersModule />
      )}

      {activeTab === 'couriers' && (
        <CourierModule />
      )}

      {activeTab === 'payments' && (
        <PaymentGatewaysModule />
      )}

      {activeTab === 'products' && (
        <ProductsModule />
      )}

      {activeTab === 'categories' && (
        <CategoriesModule />
      )}

      {activeTab === 'banners' && (
        <BannersModule />
      )}

      {activeTab === 'homepage' && (
        <HomepageModule />
      )}

      {activeTab === 'coupons' && (
        <CouponsModule />
      )}

      {activeTab === 'customers' && (
        <CustomersModule />
      )}

      {activeTab === 'reviews' && (
        <ReviewsModule />
      )}

      {activeTab === 'analytics' && (
        <DemandAnalysisModule onNavigate={setActiveTab} />
      )}

      {activeTab === 'marketing' && (
        <MarketingModule />
      )}

      {activeTab === 'seo' && (
        <SeoModule />
      )}

      {activeTab === 'settings' && (
        <SettingsModule />
      )}
    </AdminLayout>
  );
};

