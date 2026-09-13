import React, { useState, useEffect } from 'react';
import { 
  X, 
  Mail, 
  Lock, 
  User, 
  Phone, 
  Sparkles, 
  AlertCircle, 
  Loader2 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { trackingService } from '../services/trackingService';

interface CustomerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
}

export const CustomerAuthModal: React.FC<CustomerAuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login'
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);

  // Email / Password states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Status & Error
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const { 
    customerLogin, 
    customerSignup, 
    loginWithGoogle 
  } = useAuth();

  // Reset states on open/close
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setError(null);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  // Handle Email & Password Submit
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'signup') {
      if (!name.trim()) {
        setError('Please enter your full name.');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await customerLogin(email, password);
        trackingService.trackAuthEvent('login', 'email_password', email);
        toast.success('Successfully signed in to House of Mahi!');
      } else {
        await customerSignup(name, email, password, phone);
        trackingService.trackAuthEvent('signup', 'email_password', email);
        toast.success('Welcome to House of Mahi! Your account has been created.');
      }
      onClose();
    } catch (err: any) {
      console.error('Auth error:', err);
      let msg = 'Authentication failed. Please try again.';
      if (
        err.code === 'auth/user-not-found' || 
        err.code === 'auth/wrong-password' || 
        err.code === 'auth/invalid-credential'
      ) {
        msg = 'Invalid email or password. Please check your credentials.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'This email address is already registered. Please sign in instead.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Please enter a valid email address.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password is too weak. Please use at least 6 characters.';
      } else if (err.code === 'auth/too-many-requests') {
        msg = 'Too many failed attempts. Please wait a moment before trying again.';
      } else if (err.code === 'auth/network-request-failed') {
        msg = 'Network connection issue. Please check your internet connection.';
      } else if (err.message && !err.message.includes('Firebase:')) {
        msg = err.message;
      }
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Handle Google Sign-In
  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      trackingService.trackAuthEvent('login', 'google_auth');
      toast.success('Signed in with Google successfully!');
      onClose();
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        let msg = 'Google sign-in failed. Please try again.';
        if (err.code === 'auth/unauthorized-domain') {
          msg = 'Google Sign-In is not authorized on this domain. Please add this domain to Firebase Console > Authentication > Settings > Authorized domains, or sign in using Email & Password below.';
        } else if (err.code === 'auth/popup-blocked') {
          msg = 'Google Sign-In popup was blocked by your browser. Please allow popups for this site.';
        } else if (err.code === 'auth/account-exists-with-different-credential') {
          msg = 'An account already exists with this email address. Please sign in with your email and password.';
        } else if (err.code === 'auth/network-request-failed') {
          msg = 'Network connection error. Please check your internet connection.';
        } else if (err.code === 'auth/cancelled-popup-request') {
          return;
        } else if (err.message && !err.message.includes('Firebase:')) {
          msg = err.message;
        }
        setError(msg);
        toast.error(msg);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div 
      id="customer-auth-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        id="customer-auth-card"
        className="relative w-full max-w-md bg-[#FFFDF9] rounded-2xl shadow-2xl border border-amber-900/20 overflow-hidden max-h-[92vh] flex flex-col"
      >
        {/* Top Header Banner */}
        <div className="bg-[#4A1525] px-6 py-4.5 text-white relative shrink-0">
          <button
            id="close-auth-modal-btn"
            onClick={onClose}
            className="absolute top-4 right-4 text-amber-200/70 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10 cursor-pointer"
            aria-label="Close"
          >
            <X size={20} />
          </button>
          <div className="flex items-center space-x-2 text-amber-300 text-xs font-semibold uppercase tracking-wider mb-1">
            <Sparkles size={14} />
            <span>House of Mahi Member</span>
          </div>
          <h3 className="text-xl font-serif font-bold text-amber-100">
            {mode === 'login' ? 'Customer Sign In' : 'Create Customer Account'}
          </h3>
          <p className="text-xs text-amber-100/70 mt-0.5">
            Access your orders, fast checkout, wishlist, and VIP member perks
          </p>
        </div>

        {/* Form Container */}
        <div className="p-6 overflow-y-auto">
          {error && (
            <div 
              id="auth-error-banner"
              className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start space-x-2 animate-in fade-in"
            >
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Google Sign-In Button */}
          <div className="mb-4">
            <button
              id="google-signin-btn"
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || loading}
              className="w-full py-2.5 px-4 bg-white hover:bg-stone-50 text-stone-800 border border-stone-300 font-semibold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center space-x-2.5 disabled:opacity-60 cursor-pointer"
            >
              {googleLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin text-[#4A1525]" />
                  <span>Connecting with Google...</span>
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
                  <span>Continue with Google</span>
                </>
              )}
            </button>
          </div>

          <div className="relative flex py-2 items-center mb-4">
            <div className="flex-grow border-t border-stone-200"></div>
            <span className="shrink-0 mx-3 text-stone-400 text-[11px] uppercase tracking-wider font-medium">
              Or with Email
            </span>
            <div className="flex-grow border-t border-stone-200"></div>
          </div>

          {/* EMAIL / PASSWORD FORM */}
          <form onSubmit={handleEmailSubmit} className="space-y-3.5">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Full Name *</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      id="auth-name-input"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Mahima Rahman"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-stone-300 focus:outline-hidden focus:border-[#4A1525] focus:ring-1 focus:ring-[#4A1525]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Phone Number (Optional)</label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      id="auth-phone-input"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 01700000000"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-stone-300 focus:outline-hidden focus:border-[#4A1525] focus:ring-1 focus:ring-[#4A1525]"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Email Address *</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  id="auth-email-input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-stone-300 focus:outline-hidden focus:border-[#4A1525] focus:ring-1 focus:ring-[#4A1525]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Password *</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  id="auth-password-input"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-stone-300 focus:outline-hidden focus:border-[#4A1525] focus:ring-1 focus:ring-[#4A1525]"
                />
              </div>
            </div>

            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Confirm Password *</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    id="auth-confirm-password-input"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-stone-300 focus:outline-hidden focus:border-[#4A1525] focus:ring-1 focus:ring-[#4A1525]"
                  />
                </div>
              </div>
            )}

            <button
              id="auth-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 bg-[#4A1525] hover:bg-[#3D111E] text-amber-200 font-semibold text-xs rounded-xl transition-all shadow-md flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>{mode === 'login' ? 'Sign In to Account' : 'Create Account'}</span>
              )}
            </button>

            {/* Switch Email Modes */}
            <div className="pt-2 text-center text-xs text-stone-600">
              {mode === 'login' ? (
                <p>
                  Don't have an account?{' '}
                  <button
                    id="switch-to-signup-btn"
                    type="button"
                    onClick={() => {
                      setMode('signup');
                      setError(null);
                    }}
                    className="font-bold text-[#4A1525] hover:underline cursor-pointer"
                  >
                    Create one now
                  </button>
                </p>
              ) : (
                <p>
                  Already have an account?{' '}
                  <button
                    id="switch-to-login-btn"
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setError(null);
                    }}
                    className="font-bold text-[#4A1525] hover:underline cursor-pointer"
                  >
                    Sign In
                  </button>
                </p>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
