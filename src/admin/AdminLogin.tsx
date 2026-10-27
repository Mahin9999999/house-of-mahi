import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, AlertTriangle, ArrowLeft, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AdminLoginProps {
  onSuccess: () => void;
  onBackToStore?: () => void;
  onClose?: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onSuccess, onBackToStore, onClose }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const { adminLogin, adminGoogleLogin } = useAuth();

  // Admin Google Sign-In with strict UID verification
  const handleAdminGoogleSignIn = async () => {
    if (loading || googleLoading) return;
    setError(null);
    setGoogleLoading(true);

    try {
      const res = await adminGoogleLogin();
      if (res.success) {
        onSuccess();
      } else {
        setError(res.message || 'Access Denied: This Google account is not authorized as staff or administrator.');
      }
    } catch (err: any) {
      console.error('Admin Google Login Error:', err);
      setError(err.message || 'An unexpected error occurred during Google authentication.');
    } finally {
      setGoogleLoading(false);
    }
  };

  // Admin Email/Password Sign-In with strict UID verification
  const handleAdminSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || googleLoading) return;

    setError(null);
    setLoading(true);

    try {
      const trimmedEmail = email.trim();
      const res = await adminLogin(trimmedEmail, password);
      if (res.success) {
        onSuccess();
      } else {
        setError(res.message || 'Access Denied: You are not authorized as an administrator.');
      }
    } catch (err: any) {
      console.error('Admin login error:', err);
      setError(err.message || 'An unexpected error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1F070E] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        {/* Back Link */}
        <button
          id="back-to-storefront-btn"
          type="button"
          onClick={() => {
            if (onBackToStore) onBackToStore();
            else if (onClose) onClose();
          }}
          disabled={loading || googleLoading}
          className="mb-4 inline-flex items-center text-xs text-amber-200/70 hover:text-amber-200 transition-colors space-x-1.5 disabled:opacity-50 cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Return to Public Storefront</span>
        </button>

        <div 
          id="admin-login-card"
          className="bg-[#2A0B14] rounded-2xl border border-amber-500/20 shadow-2xl p-6 sm:p-8 text-white"
        >
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-400/10 text-amber-300 border border-amber-400/30 mb-3 shadow-inner">
              <ShieldCheck size={28} />
            </div>
            <h1 className="text-xl font-serif font-bold text-amber-100 tracking-wide">
              House of Mahi Portal
            </h1>
            <p className="text-xs text-amber-200/60 mt-1">
              Authorized Administrator & Staff Access Only
            </p>
          </div>

          {error && (
            <div 
              id="admin-auth-error"
              className="mb-5 p-3.5 rounded-xl bg-red-950/80 border border-red-500/40 text-red-200 text-xs flex items-start space-x-2.5"
            >
              <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold block text-red-300">Access Restricted</span>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Quick Authorized Google Sign-In */}
          <div className="mb-5">
            <button
              id="admin-google-signin-btn"
              type="button"
              onClick={handleAdminGoogleSignIn}
              disabled={loading || googleLoading}
              className="w-full py-3 px-4 bg-white hover:bg-stone-100 text-stone-900 font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center space-x-2.5 disabled:opacity-50 cursor-pointer"
            >
              {googleLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin text-[#4A1525]" />
                  <span>Verifying Authorized Admin Account...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.02 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <span>Sign In with Google (Owner & Staff)</span>
                </>
              )}
            </button>
          </div>

          <div className="relative flex py-2 items-center mb-5">
            <div className="flex-grow border-t border-amber-500/20"></div>
            <span className="shrink-0 mx-3 text-amber-200/40 text-[10px] uppercase tracking-wider font-semibold">
              Or with Admin Credentials
            </span>
            <div className="flex-grow border-t border-amber-500/20"></div>
          </div>

          <form onSubmit={handleAdminSignIn} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-amber-100/80 mb-1.5">
                Admin / Staff Email Address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-300/50" />
                <input
                  id="admin-email-input"
                  type="email"
                  required
                  disabled={loading || googleLoading}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@houseofmahi.com or staff email"
                  autoComplete="username"
                  className="w-full bg-[#18050B] border border-amber-500/30 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder:text-amber-200/30 focus:outline-hidden focus:border-amber-400 focus:ring-1 focus:ring-amber-400 disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-amber-100/80 mb-1.5">
                Security Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-300/50" />
                <input
                  id="admin-password-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  disabled={loading || googleLoading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  className="w-full bg-[#18050B] border border-amber-500/30 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder:text-amber-200/30 focus:outline-hidden focus:border-amber-400 focus:ring-1 focus:ring-amber-400 disabled:opacity-50"
                />
                <button
                  type="button"
                  id="toggle-password-visibility-btn"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-amber-300/50 hover:text-amber-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              id="admin-signin-submit-btn"
              type="submit"
              disabled={loading || googleLoading}
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-xs rounded-xl transition-all shadow-lg flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <span>Authenticate Admin / Staff Access</span>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-amber-500/10 text-center">
            <p className="text-[11px] text-amber-200/40 leading-relaxed">
              All access attempts are strictly verified against authorized administrator credentials. Unauthorized access attempts will be rejected.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
