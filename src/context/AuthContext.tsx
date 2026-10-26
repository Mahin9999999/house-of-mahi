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
        // Query Firestore /admin_users directly (via UID or email)
        try {
          let staffData: any = null;
          let docId = user.uid;

          const directDoc = await getDoc(doc(db, 'admin_users', user.uid));
          if (directDoc.exists()) {
            staffData = directDoc.data();
          } else if (user.email) {
            // Check by authorized Gmail
            const q = query(
              collection(db, 'admin_users'),
              where('email', '==', user.email.toLowerCase().trim()),
              limit(1)
            );
            const querySnap = await getDocs(q);
            if (!querySnap.empty) {
              const matchedDoc = querySnap.docs[0];
              docId = matchedDoc.id;
              staffData = matchedDoc.data();
              // Update with user's actual UID for faster lookups
              await updateDoc(doc(db, 'admin_users', matchedDoc.id), {
                uid: user.uid,
                lastLoginAt: serverTimestamp()
              }).catch(() => {});
            }
          }

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
          console.warn('Staff verification query note:', adminErr);
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

      // Check /admin_users directly
      const cleanEmail = (cred.user.email || '').toLowerCase().trim();
      let staffData: any = null;

      const directSnap = await getDoc(doc(db, 'admin_users', cred.user.uid));
      if (directSnap.exists()) {
        staffData = directSnap.data();
      } else if (cleanEmail) {
        const q = query(
          collection(db, 'admin_users'),
          where('email', '==', cleanEmail),
          limit(1)
        );
        const qSnap = await getDocs(q);
        if (!qSnap.empty) {
          staffData = qSnap.docs[0].data();
          await updateDoc(doc(db, 'admin_users', qSnap.docs[0].id), {
            uid: cred.user.uid,
            lastLoginAt: serverTimestamp()
          }).catch(() => {});
        }
      }

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

  // Dedicated Admin Login (Email/Password fallback for Owner)
  const adminLogin = async (email: string, pass: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
      const isMasterAdmin = checkIsMasterAdmin(cred.user);

      if (!isMasterAdmin) {
        await firebaseSignOut(auth);
        setCurrentUser(null);
        setUserProfile(null);
        setStaffProfile(null);
        setIsAdmin(false);
        return { 
          success: false, 
          message: 'Access Denied: Please use the "Sign In with Google" button with your authorized staff Gmail.' 
        };
      }

      setIsAdmin(true);
      await fetchUserProfile(cred.user);
      return { success: true };
    } catch (error: any) {
      return { 
        success: false, 
        message: error.message || 'Failed to authenticate admin credentials.' 
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
