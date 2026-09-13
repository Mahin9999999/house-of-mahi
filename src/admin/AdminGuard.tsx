import React from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth, AUTHORIZED_ADMIN_UID } from '../context/AuthContext';
import { AdminLogin } from './AdminLogin';

interface AdminGuardProps {
  children: React.ReactNode;
  onBackToStore: () => void;
}

export const AdminGuard: React.FC<AdminGuardProps> = ({ children, onBackToStore }) => {
  const { currentUser, isAdmin, loading } = useAuth();

  // 1. Show security loading spinner while checking authentication state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#1F070E] flex flex-col items-center justify-center text-white">
        <Loader2 size={36} className="text-amber-400 animate-spin mb-3" />
        <p className="text-xs text-amber-200/80 font-mono tracking-widest uppercase">
          Verifying Administrator Security Credentials...
        </p>
      </div>
    );
  }

  // 2. Strict Check: Must be authenticated AND have the exact Authorized Admin UID
  const isMasterAdmin = currentUser && currentUser.uid === AUTHORIZED_ADMIN_UID && isAdmin;

  // 3. If not authenticated or UID does not match master admin UID, show Admin Login
  if (!isMasterAdmin) {
    return (
      <AdminLogin 
        onSuccess={() => {
          // Success is reactively tracked via AuthContext state updates
        }} 
        onBackToStore={onBackToStore} 
      />
    );
  }

  // 4. Access Granted - Render Protected Admin Dashboard
  return <>{children}</>;
};

export default AdminGuard;
