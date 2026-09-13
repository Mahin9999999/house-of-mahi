import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup,
  GoogleAuthProvider,
  signInWithPhoneNumber,
  ConfirmationResult,
  RecaptchaVerifier,
  signOut as firebaseSignOut,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  phoneNumber?: string;
  photoURL?: string;
  role: 'customer' | 'admin' | 'superadmin';
  address?: string;
  city?: string;
  district?: string;
  thana?: string;
  createdAt?: any;
  updatedAt?: any;
}

// HARD-LOCKED AUTHORIZED MASTER ADMIN IDENTIFIERS
export const AUTHORIZED_ADMIN_UID = 'nJqbz63bzIXRiycPC5JYA13pVOi1';
export const AUTHORIZED_ADMIN_EMAILS = [
  'mahincollege1@gmail.com',
  'admin@houseofmahi.com',
  'houseofmahibd@gmail.com'
];

export const checkIsMasterAdmin = (user: User | null): boolean => {
  if (!user) return false;
  if (user.uid === AUTHORIZED_ADMIN_UID) return true;
  if (user.email && AUTHORIZED_ADMIN_EMAILS.includes(user.email.toLowerCase())) return true;
  return false;
};

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  isAdmin: boolean;
  loading: boolean;
  customerLogin: (email: string, pass: string) => Promise<void>;
  customerSignup: (name: string, email: string, pass: string, phone?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  sendPhoneOtp: (phoneNumber: string, appVerifier: RecaptchaVerifier) => Promise<ConfirmationResult>;
  verifyPhoneOtp: (confirmationResult: ConfirmationResult, verificationCode: string, name?: string) => Promise<void>;
  setupRecaptcha: (containerId: string) => RecaptchaVerifier;
  updateCustomerProfile: (data: Partial<UserProfile>) => Promise<void>;
  adminGoogleLogin: () => Promise<{ success: boolean; message?: string }>;
  adminLogin: (email: string, pass: string) => Promise<{ success: boolean; message?: string }>;
  adminLogout: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch or create user profile document in Firestore
  const fetchUserProfile = async (user: User): Promise<UserProfile | null> => {
    try {
      const isMasterAdmin = checkIsMasterAdmin(user);
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data() as UserProfile;
        
        // Auto-enforce superadmin role for the designated Master Admin
        if (isMasterAdmin && data.role !== 'superadmin' && data.role !== 'admin') {
          await setDoc(userRef, { role: 'superadmin', updatedAt: serverTimestamp() }, { merge: true });
          data.role = 'superadmin';
        }

        // Sync photo or display name if updated externally
        if (user.displayName && (!data.displayName || data.displayName === 'Customer')) {
          data.displayName = user.displayName;
        }
        if (user.photoURL && !data.photoURL) {
          data.photoURL = user.photoURL;
        }
        
        const hasAdminRole = isMasterAdmin || data.role === 'admin' || data.role === 'superadmin';
        setUserProfile(data);
        setIsAdmin(hasAdminRole);
        return data;
      } else {
        // Create initial profile for new user
        const newProfile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || (user.phoneNumber ? `User ${user.phoneNumber.slice(-4)}` : 'Customer'),
          phoneNumber: user.phoneNumber || '',
          photoURL: user.photoURL || '',
          role: isMasterAdmin ? 'superadmin' : 'customer',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        await setDoc(userRef, newProfile);
        setUserProfile(newProfile);
        setIsAdmin(isMasterAdmin);
        return newProfile;
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      const isMasterAdmin = checkIsMasterAdmin(user);
      setIsAdmin(isMasterAdmin);
      return null;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await fetchUserProfile(user);
      } else {
        setUserProfile(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const refreshProfile = async () => {
    if (currentUser) {
      await fetchUserProfile(currentUser);
    }
  };

  // Customer Email Login
  const customerLogin = async (email: string, pass: string) => {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
    await fetchUserProfile(cred.user);
  };

  // Customer Email Signup
  const customerSignup = async (name: string, email: string, pass: string, phone?: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    if (cred.user) {
      await updateProfile(cred.user, { displayName: name.trim() });
      const userRef = doc(db, 'users', cred.user.uid);
      const isMasterAdmin = cred.user.uid === AUTHORIZED_ADMIN_UID;

      const profile: UserProfile = {
        uid: cred.user.uid,
        email: cred.user.email || '',
        displayName: name.trim(),
        phoneNumber: phone || '',
        role: isMasterAdmin ? 'superadmin' : 'customer',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      await setDoc(userRef, profile);
      setUserProfile(profile);
      setIsAdmin(isMasterAdmin);
    }
  };

  // Customer Google Sign-In
  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const cred = await signInWithPopup(auth, provider);
    if (cred.user) {
      await fetchUserProfile(cred.user);
    }
  };

  // Setup Recaptcha for Phone Authentication
  const setupRecaptcha = (containerId: string): RecaptchaVerifier => {
    const existingVerifier = (window as any).recaptchaVerifier;
    if (existingVerifier) {
      try {
        existingVerifier.clear();
      } catch (e) {
        console.warn('Existing recaptcha clear warning:', e);
      }
    }

    const recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: () => {
        // reCAPTCHA solved
      },
      'expired-callback': () => {
        console.warn('reCAPTCHA expired, please try again.');
      }
    });

    (window as any).recaptchaVerifier = recaptchaVerifier;
    return recaptchaVerifier;
  };

  // Send Phone OTP
  const sendPhoneOtp = async (phoneNumber: string, appVerifier: RecaptchaVerifier): Promise<ConfirmationResult> => {
    let formattedPhone = phoneNumber.trim();
    if (!formattedPhone.startsWith('+')) {
      if (formattedPhone.startsWith('01')) {
        formattedPhone = '+88' + formattedPhone;
      } else if (formattedPhone.startsWith('8801')) {
        formattedPhone = '+' + formattedPhone;
      }
    }
    const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
    return confirmationResult;
  };

  // Verify Phone OTP
  const verifyPhoneOtp = async (confirmationResult: ConfirmationResult, verificationCode: string, name?: string) => {
    const cred = await confirmationResult.confirm(verificationCode.trim());
    if (cred.user) {
      if (name && name.trim() && !cred.user.displayName) {
        await updateProfile(cred.user, { displayName: name.trim() });
      }
      await fetchUserProfile(cred.user);
    }
  };

  // Update Profile Data
  const updateCustomerProfile = async (data: Partial<UserProfile>) => {
    if (!currentUser) throw new Error('No user logged in');
    const userRef = doc(db, 'users', currentUser.uid);
    await updateDoc(userRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
    if (data.displayName && currentUser) {
      await updateProfile(currentUser, { displayName: data.displayName });
    }
    await refreshProfile();
  };

  // =========================================================================
  // STRICT ADMIN AUTHENTICATION (LOCKED TO AUTHORIZED_ADMIN_UID)
  // =========================================================================

  // Admin Google Sign-In with strict UID/email verification
  const adminGoogleLogin = async (): Promise<{ success: boolean; message?: string }> => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const cred = await signInWithPopup(auth, provider);
      
      const isMasterAdmin = checkIsMasterAdmin(cred.user);
      const profile = await fetchUserProfile(cred.user);
      const isAuthorized = isMasterAdmin || profile?.role === 'admin' || profile?.role === 'superadmin';

      if (!isAuthorized) {
        // Immediately terminate unauthorized user session
        await firebaseSignOut(auth);
        setCurrentUser(null);
        setUserProfile(null);
        setIsAdmin(false);
        return {
          success: false,
          message: 'Access Denied: This Google account is not authorized to access the Admin Panel.'
        };
      }

      setIsAdmin(true);
      return { success: true };
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        return { success: false, message: 'Google sign-in popup was closed.' };
      }
      return {
        success: false,
        message: error.message || 'Failed to authenticate Google administrator account.'
      };
    }
  };

  // Dedicated Admin Login with strict admin enforcement
  const adminLogin = async (email: string, pass: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
      const isMasterAdmin = checkIsMasterAdmin(cred.user);
      const profile = await fetchUserProfile(cred.user);
      const isAuthorized = isMasterAdmin || profile?.role === 'admin' || profile?.role === 'superadmin';

      if (!isAuthorized) {
        // Reject non-admin and immediately sign out
        await firebaseSignOut(auth);
        setCurrentUser(null);
        setUserProfile(null);
        setIsAdmin(false);
        return { 
          success: false, 
          message: 'Access Denied: This account is not authorized to access the Admin Panel.' 
        };
      }

      setIsAdmin(true);
      return { success: true };
    } catch (error: any) {
      return { 
        success: false, 
        message: error.message || 'Failed to authenticate admin credentials.' 
      };
    }
  };

  // Dedicated Admin Logout (terminates current admin session)
  const adminLogout = async () => {
    await firebaseSignOut(auth);
    setCurrentUser(null);
    setUserProfile(null);
    setIsAdmin(false);
  };

  // Sign out (Customer & General)
  const logout = async () => {
    await firebaseSignOut(auth);
    setCurrentUser(null);
    setUserProfile(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        isAdmin,
        loading,
        customerLogin,
        customerSignup,
        loginWithGoogle,
        sendPhoneOtp,
        verifyPhoneOtp,
        setupRecaptcha,
        updateCustomerProfile,
        adminGoogleLogin,
        adminLogin,
        adminLogout,
        logout,
        refreshProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
