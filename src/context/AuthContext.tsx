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
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  limit, 
  getDocs, 
  serverTimestamp 
} from 'firebase/firestore';
import { auth, db } from '../firebase/config';

export type StaffRole = 'owner' | 'full_access' | 'editor' | 'viewer';

export interface StaffProfile {
  uid: string;
  email: string;
  name: string;
  role: StaffRole;
  status: 'active' | 'suspended';
  isOwner: boolean;
  permissions: string[];
}

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

// Default role permissions
export const DEFAULT_ROLE_PERMISSIONS: Record<StaffRole, string[]> = {
  owner: ['*'],
  full_access: [
    'orders_read',
    'orders_write',
    'products_read',
    'products_write',
    'categories_read',
    'categories_write',
    'customers_read',
    'courier_dispatch',
    'reviews_moderate',
    'analytics_read'
  ],
  editor: [
    'orders_read',
    'orders_write',
    'products_read',
    'products_write',
    'categories_read',
    'categories_write',
    'courier_dispatch',
    'reviews_moderate'
  ],
  viewer: [
    'orders_read',
    'products_read',
    'categories_read',
    'customers_read',
    'reviews_read',
    'analytics_read'
  ]
};

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  staffProfile: StaffProfile | null;
  staffRole: StaffRole | null;
  isOwner: boolean;
  isAdmin: boolean;
  loading: boolean;
  hasPermission: (permission: string) => boolean;
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
  const [staffProfile, setStaffProfile] = useState<StaffProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Helper to fetch staff record directly via email or uid point lookups
  const fetchStaffDataDirectly = async (user: User): Promise<any | null> => {
    const cleanEmail = (user.email || '').toLowerCase().trim();

    // 1. Point lookup by user.uid
    try {
      const uidSnap = await getDoc(doc(db, 'admin_users', user.uid));
      if (uidSnap.exists()) {
        return uidSnap.data();
      }
    } catch (e) {
      // Continue to email lookups
    }

    // 2. Direct point lookup by clean email (StaffManagementModule format)
    if (cleanEmail) {
      try {
        const emailSnap = await getDoc(doc(db, 'admin_users', cleanEmail));
        if (emailSnap.exists()) {
          return emailSnap.data();
        }
      } catch (e) {
        // Continue to legacy lookups
      }

      // 3. Legacy point lookup by sanitized email ID
      try {
        const legacyDocId = `staff_${cleanEmail.replace(/[^a-z0-9]/g, '_')}`;
        const legacySnap = await getDoc(doc(db, 'admin_users', legacyDocId));
        if (legacySnap.exists()) {
          return legacySnap.data();
        }
      } catch (e) {
        // Continue to query fallback
      }

      // 4. Safe query fallback (if user has list permissions)
      try {
        const q = query(
          collection(db, 'admin_users'),
          where('email', '==', cleanEmail),
          limit(1)
        );
        const querySnap = await getDocs(q);
        if (!querySnap.empty) {
          return querySnap.docs[0].data();
        }
      } catch (queryErr) {
        // Silently catch query permission rejections without erroring out
      }
    }

    return null;
  };

  // Fetch or create user profile and resolve staff role directly in Firestore
  const fetchUserProfile = async (user: User): Promise<UserProfile | null> => {
    try {
      const isMasterAdmin = checkIsMasterAdmin(user);

      // 1. Resolve Staff / Admin Role
      if (isMasterAdmin) {
        const ownerStaff: StaffProfile = {
          uid: user.uid,
          email: user.email || 'mahincollege1@gmail.com',
          name: user.displayName || 'Store Owner',
          role: 'owner',
          status: 'active',
          isOwner: true,
          permissions: DEFAULT_ROLE_PERMISSIONS.owner
        };
        setStaffProfile(ownerStaff);
        setIsAdmin(true);
      } else {
        try {
          const staffData = await fetchStaffDataDirectly(user);

          if (staffData && staffData.status === 'active') {
            const role: StaffRole = (['editor', 'viewer', 'full_access'].includes(staffData.role) ? staffData.role : 'viewer') as StaffRole;
            const staffObj: StaffProfile = {
              uid: user.uid,
              email: staffData.email || user.email || '',
              name: staffData.name || user.displayName || 'Staff Member',
              role,
              status: 'active',
              isOwner: false,
              permissions: Array.isArray(staffData.permissions) ? staffData.permissions : DEFAULT_ROLE_PERMISSIONS[role]
            };
            setStaffProfile(staffObj);
            setIsAdmin(true);
          } else {
            setStaffProfile(null);
            setIsAdmin(false);
          }
        } catch (adminErr) {
          console.warn('Staff verification note:', adminErr);
        }
      }

      // 2. Resolve Customer User Profile
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data() as UserProfile;
        
        if (isMasterAdmin && data.role !== 'superadmin' && data.role !== 'admin') {
          await setDoc(userRef, { role: 'superadmin', updatedAt: serverTimestamp() }, { merge: true });
          data.role = 'superadmin';
        }

        if (user.displayName && (!data.displayName || data.displayName === 'Customer')) {
          data.displayName = user.displayName;
        }
        if (user.photoURL && !data.photoURL) {
          data.photoURL = user.photoURL;
        }
        
        setUserProfile(data);
        return data;
      } else {
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
        setStaffProfile(null);
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

  // Permission checking helper
  const hasPermission = (permission: string): boolean => {
    if (!staffProfile) return false;
    if (staffProfile.status === 'suspended') return false;
    if (staffProfile.isOwner || staffProfile.role === 'owner') return true;
    if (staffProfile.permissions.includes('*')) return true;
    return staffProfile.permissions.includes(permission);
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

  // Customer Google Sign-In with safe cancellation handling
  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const cred = await signInWithPopup(auth, provider);
      if (cred.user) {
        await fetchUserProfile(cred.user);
      }
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        // User deliberately closed Google sign-in window; ignore safely
        return;
      }
      console.error('Google Sign In Error:', error);
      throw error;
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
      callback: () => {},
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
  // SECURE DIRECT GOOGLE SIGN-IN FOR ADMIN & AUTHORIZED STAFF GMAIL ACCOUNTS
  // =========================================================================

  const adminGoogleLogin = async (): Promise<{ success: boolean; message?: string }> => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const cred = await signInWithPopup(auth, provider);

      // Check Master Owner
      const isMasterAdmin = checkIsMasterAdmin(cred.user);
      if (isMasterAdmin) {
        const ownerStaff: StaffProfile = {
          uid: cred.user.uid,
          email: cred.user.email || 'mahincollege1@gmail.com',
          name: cred.user.displayName || 'Store Owner',
          role: 'owner',
          status: 'active',
          isOwner: true,
          permissions: DEFAULT_ROLE_PERMISSIONS.owner
        };
        setStaffProfile(ownerStaff);
        setIsAdmin(true);
        await fetchUserProfile(cred.user);
        return { success: true };
      }

      // Check /admin_users directly via point lookups
      const cleanEmail = (cred.user.email || '').toLowerCase().trim();
      const staffData = await fetchStaffDataDirectly(cred.user);

      if (!staffData) {
        await firebaseSignOut(auth);
        setCurrentUser(null);
        setUserProfile(null);
        setStaffProfile(null);
        setIsAdmin(false);
        return {
          success: false,
          message: `Access Denied: The Google account (${cleanEmail}) is not an authorized store administrator or staff member.`
        };
      }

      if (staffData.status === 'suspended') {
        await firebaseSignOut(auth);
        setCurrentUser(null);
        setUserProfile(null);
        setStaffProfile(null);
        setIsAdmin(false);
        return {
          success: false,
          message: 'Access Denied: Your staff account has been suspended by the store owner.'
        };
      }

      const role: StaffRole = (['editor', 'viewer', 'full_access'].includes(staffData.role) ? staffData.role : 'viewer') as StaffRole;
      const staffObj: StaffProfile = {
        uid: cred.user.uid,
        email: cleanEmail,
        name: staffData.name || cred.user.displayName || 'Staff Member',
        role,
        status: 'active',
        isOwner: false,
        permissions: Array.isArray(staffData.permissions) ? staffData.permissions : DEFAULT_ROLE_PERMISSIONS[role]
      };

      setStaffProfile(staffObj);
      setIsAdmin(true);
      await fetchUserProfile(cred.user);
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

  // Dedicated Admin Login (Email/Password for Owner and Authorized Staff)
  const adminLogin = async (email: string, pass: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const trimmedEmail = email.trim();
      const cred = await signInWithEmailAndPassword(auth, trimmedEmail, pass);
      const isMasterAdmin = checkIsMasterAdmin(cred.user);

      if (isMasterAdmin) {
        const ownerStaff: StaffProfile = {
          uid: cred.user.uid,
          email: cred.user.email || 'mahincollege1@gmail.com',
          name: cred.user.displayName || 'Store Owner',
          role: 'owner',
          status: 'active',
          isOwner: true,
          permissions: DEFAULT_ROLE_PERMISSIONS.owner
        };
        setStaffProfile(ownerStaff);
        setIsAdmin(true);
        await fetchUserProfile(cred.user);
        return { success: true };
      }

      // Check Staff /admin_users record directly
      const cleanEmail = (cred.user.email || trimmedEmail).toLowerCase().trim();
      const staffData = await fetchStaffDataDirectly(cred.user);

      if (!staffData) {
        await firebaseSignOut(auth);
        setCurrentUser(null);
        setUserProfile(null);
        setStaffProfile(null);
        setIsAdmin(false);
        return { 
          success: false, 
          message: `Access Denied: (${cleanEmail}) অ্যাকাউন্টটি অ্যাডমিন প্যানেলে অনুমোদিত স্টাফ বা অ্যাডমিন নয়।` 
        };
      }

      if (staffData.status === 'suspended') {
        await firebaseSignOut(auth);
        setCurrentUser(null);
        setUserProfile(null);
        setStaffProfile(null);
        setIsAdmin(false);
        return { 
          success: false, 
          message: 'Access Denied: আপনার স্টাফ অ্যাকাউন্টটি সাময়িকভাবে স্থগিত (Suspended) করা হয়েছে।' 
        };
      }

      const role: StaffRole = (['editor', 'viewer', 'full_access'].includes(staffData.role) ? staffData.role : 'viewer') as StaffRole;
      const staffObj: StaffProfile = {
        uid: cred.user.uid,
        email: cleanEmail,
        name: staffData.name || cred.user.displayName || 'Staff Member',
        role,
        status: 'active',
        isOwner: false,
        permissions: Array.isArray(staffData.permissions) ? staffData.permissions : DEFAULT_ROLE_PERMISSIONS[role]
      };

      setStaffProfile(staffObj);
      setIsAdmin(true);
      await fetchUserProfile(cred.user);
      return { success: true };
    } catch (error: any) {
      console.error('Admin login error:', error);
      let errorMsg = error.message || 'Failed to authenticate admin credentials.';
      if (
        error.code === 'auth/user-not-found' || 
        error.code === 'auth/wrong-password' || 
        error.code === 'auth/invalid-credential'
      ) {
        errorMsg = 'ভুল ইমেইল বা পাসওয়ার্ড দেওয়া হয়েছে। অনুগ্রহ করে সঠিক তথ্য দিয়ে চেষ্টা করুন।';
      } else if (error.code === 'auth/too-many-requests') {
        errorMsg = 'একাধিকবার ভুল তথ্য দেওয়ার কারণে সাময়িকভাবে ব্লক করা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।';
      }
      return { 
        success: false, 
        message: errorMsg 
      };
    }
  };

  // Dedicated Admin Logout
  const adminLogout = async () => {
    await firebaseSignOut(auth);
    setCurrentUser(null);
    setUserProfile(null);
    setStaffProfile(null);
    setIsAdmin(false);
  };

  // General Logout
  const logout = async () => {
    await firebaseSignOut(auth);
    setCurrentUser(null);
    setUserProfile(null);
    setStaffProfile(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        staffProfile,
        staffRole: staffProfile?.role || (checkIsMasterAdmin(currentUser) ? 'owner' : null),
        isOwner: staffProfile?.isOwner || checkIsMasterAdmin(currentUser),
        isAdmin,
        loading,
        hasPermission,
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

export default AuthContext;
