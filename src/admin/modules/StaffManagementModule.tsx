import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  ShieldAlert, 
  Trash2, 
  Ban, 
  Lock, 
  X,
  Mail,
  User,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Eye,
  EyeOff
} from 'lucide-react';
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { db, firebaseConfig } from '../../firebase/config';
import { useAuth, AUTHORIZED_ADMIN_UID, AUTHORIZED_ADMIN_EMAILS, StaffRole } from '../../context/AuthContext';

interface StaffMember {
  id: string;
  uid?: string;
  name: string;
  email: string;
  role: StaffRole;
  status: 'active' | 'suspended';
  isOwner?: boolean;
  isPermanent?: boolean;
  createdAt?: any;
  lastLoginAt?: any;
}

export const StaffManagementModule: React.FC = () => {
  const { currentUser, isOwner } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Authorize Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [showStaffPassword, setShowStaffPassword] = useState(false);
  const [staffRole, setStaffRole] = useState<StaffRole>('viewer');
  const [authorizing, setAuthorizing] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Helper to verify if an account is an authorized Owner
  const isProtectedOwner = (member: { id?: string; email?: string; isOwner?: boolean; isPermanent?: boolean }) => {
    const email = (member.email || '').toLowerCase().trim();
    const id = (member.id || '').toLowerCase().trim();
    return (
      member.isPermanent === true ||
      member.isOwner === true ||
      member.id === AUTHORIZED_ADMIN_UID ||
      id === AUTHORIZED_ADMIN_UID.toLowerCase() ||
      AUTHORIZED_ADMIN_EMAILS.some((ownerEmail) => ownerEmail.toLowerCase() === email || ownerEmail.toLowerCase() === id)
    );
  };

  // Real-time Firestore subscription to admin_users collection
  useEffect(() => {
    if (!currentUser || !isOwner) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      collection(db, 'admin_users'),
      (snapshot) => {
        const list: StaffMember[] = [];
        let hasOwner = false;

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const cleanEmail = (data.email || docSnap.id).toLowerCase().trim();
          const isOwnerUser = isProtectedOwner({
            id: docSnap.id,
            email: cleanEmail,
            isOwner: data.isOwner
          });

          if (isOwnerUser) {
            hasOwner = true;
          }

          list.push({
            id: docSnap.id,
            uid: data.uid || (docSnap.id !== cleanEmail ? docSnap.id : undefined),
            name: data.name || (isOwnerUser ? 'Store Owner' : 'Staff Member'),
            email: cleanEmail,
            role: isOwnerUser ? 'owner' : (['editor', 'viewer', 'full_access'].includes(data.role) ? data.role : 'viewer'),
            status: data.status || 'active',
            isOwner: isOwnerUser,
            isPermanent: isOwnerUser,
            createdAt: data.createdAt,
            lastLoginAt: data.lastLoginAt
          });
        });

        // Ensure permanent owner is always present at top of list
        if (!hasOwner) {
          list.unshift({
            id: AUTHORIZED_ADMIN_UID,
            uid: AUTHORIZED_ADMIN_UID,
            name: 'Store Owner',
            email: currentUser.email || AUTHORIZED_ADMIN_EMAILS[0],
            role: 'owner',
            status: 'active',
            isOwner: true,
            isPermanent: true
          });
        }

        setStaff(list);
        setLoading(false);
      },
      (err) => {
        console.error('Error subscribing to staff list:', err);
        setError(err.message || 'Permission denied while reading staff directory.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser, isOwner]);

  // Handle Authorizing a new Staff member with Firebase Auth and Firestore record
  const handleAuthorizeStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !staffEmail.trim()) return;

    setAuthorizing(true);
    setError(null);
    setModalError(null);
    setSuccessMessage(null);

    const cleanEmail = staffEmail.toLowerCase().trim();

    // Prevent granting owner role
    if (staffRole === 'owner') {
      setModalError('Cannot create an additional Owner. Only Permanent Store Owner is permitted.');
      setAuthorizing(false);
      return;
    }

    // Prevent adding owner email as regular staff
    if (AUTHORIZED_ADMIN_EMAILS.some((e) => e.toLowerCase() === cleanEmail)) {
      setModalError('এই ইমেইলটি অনুমোদিত Store Owner-এর অ্যাকাউন্ট। এটিকে সাধারণ স্টাফ হিসেবে যুক্ত করা যাবে না।');
      setAuthorizing(false);
      return;
    }

    // Check if email already in staff list
    if (staff.some((s) => s.email.toLowerCase() === cleanEmail || s.id.toLowerCase() === cleanEmail)) {
      setModalError('এই ইমেইলটি স্টাফ তালিকায় ইতিমধ্যে যুক্ত রয়েছে।');
      setAuthorizing(false);
      return;
    }

    // Step 1: Create Firebase Authentication account (if password is provided)
    let authUid: string | null = null;
    let authCreated = false;

    if (staffPassword.trim()) {
      if (staffPassword.length < 6) {
        setModalError('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে (Password must be at least 6 characters).');
        setAuthorizing(false);
        return;
      }

      // Use an isolated secondary Firebase App instance so the current Owner session is untouched
      const tempAppName = `staff_auth_${Date.now()}`;
      const secondaryApp = initializeApp(firebaseConfig, tempAppName);
      const secondaryAuth = getAuth(secondaryApp);

      try {
        const userCred = await createUserWithEmailAndPassword(secondaryAuth, cleanEmail, staffPassword.trim());
        authUid = userCred.user.uid;
        authCreated = true;
        await signOut(secondaryAuth);
      } catch (authErr: any) {
        console.warn('Firebase Auth secondary creation note:', authErr);
        if (authErr.code === 'auth/email-already-in-use') {
          // The account already exists in Firebase Auth (e.g. registered customer or existing auth)
          // We can proceed to authorize their email in admin_users
          console.log('Account already exists in Firebase Auth, linking staff permissions in Firestore.');
        } else if (authErr.code === 'auth/weak-password') {
          setModalError('Firebase Auth Error: পাসওয়ার্ড অত্যন্ত দুর্বল। কমপক্ষে ৬ অক্ষরের শক্তিশালী পাসওয়ার্ড দিন।');
          setAuthorizing(false);
          return;
        } else if (authErr.code === 'auth/invalid-email') {
          setModalError('Firebase Auth Error: ইমেইল ফরম্যাট সঠিক নয়।');
          setAuthorizing(false);
          return;
        } else {
          setModalError(`Firebase Auth তৈরি করতে ব্যর্থ: ${authErr.message || authErr.code}`);
          setAuthorizing(false);
          return;
        }
      } finally {
        try {
          await deleteApp(secondaryApp);
        } catch (delErr) {
          console.warn('Secondary app cleanup note:', delErr);
        }
      }
    }

    // Step 2: Write deterministic record to Firestore admin_users collection
    try {
      const docId = cleanEmail;
      const newStaffDoc: any = {
        name: staffName.trim() || 'Staff Member',
        email: cleanEmail,
        role: staffRole,
        status: 'active',
        isOwner: false,
        authorizedBy: currentUser.uid,
        authorizedByEmail: currentUser.email || 'admin@houseofmahi.com',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      if (authUid) {
        newStaffDoc.uid = authUid;
      }

      await setDoc(doc(db, 'admin_users', docId), newStaffDoc);

      setSuccessMessage(
        `সফলভাবে নতুন স্টাফ যোগ করা হয়েছে! ইমেইল: ${cleanEmail}, রোল: ${staffRole.toUpperCase()}${
          authCreated ? ' (নতুন Firebase Auth অ্যাকাউন্ট তৈরি সম্পন্ন)' : ''
        }। স্টাফ এখন এই ক্রেডেনশিয়াল অথবা গুগল দিয়ে অ্যাডমিন প্যানেলে লগইন করতে পারবেন।`
      );
      setIsModalOpen(false);
      setStaffName('');
      setStaffEmail('');
      setStaffPassword('');
      setStaffRole('viewer');
      setModalError(null);
    } catch (err: any) {
      console.error('Error authorizing staff:', err);
      const isPerm = err?.code === 'permission-denied' || err?.message?.toLowerCase().includes('permission');
      if (isPerm) {
        setModalError(
          'Missing or insufficient permissions: Firestore Rules-এ Staff সংরক্ষণের অনুমতি প্রত্যাখ্যাত হয়েছে। নিশ্চিত করুন যে আপনি অনুমোদিত Store Owner হিসেবে লগইন আছেন এবং houseofmahi প্রোজেক্টের Rules Publish করা হয়েছে।'
        );
      } else {
        setModalError(`Firestore Error: ${err.message || err.code || 'Failed to save staff record in Firestore.'}`);
      }
    } finally {
      setAuthorizing(false);
    }
  };

  // Change staff role
  const handleRoleChange = async (member: StaffMember, newRole: StaffRole) => {
    if (isProtectedOwner(member)) {
      alert('Permanent Store Owner role cannot be modified.');
      return;
    }
    if (newRole === 'owner') {
      alert('Cannot assign Owner role to staff members.');
      return;
    }
    if (!confirm(`Are you sure you want to change this staff member's role to ${newRole.toUpperCase()}?`)) {
      return;
    }

    try {
      await updateDoc(doc(db, 'admin_users', member.id), {
        role: newRole,
        updatedAt: serverTimestamp()
      });
    } catch (err: any) {
      console.error('Error updating role:', err);
      alert(err.message || 'Failed to update staff role.');
    }
  };

  // Toggle staff status (suspend / activate)
  const handleToggleStatus = async (member: StaffMember) => {
    if (isProtectedOwner(member)) {
      alert('Permanent Store Owner cannot be suspended.');
      return;
    }
    const newStatus = member.status === 'active' ? 'suspended' : 'active';
    if (!confirm(`Are you sure you want to ${newStatus === 'suspended' ? 'SUSPEND' : 'ACTIVATE'} this staff account?`)) {
      return;
    }

    try {
      await updateDoc(doc(db, 'admin_users', member.id), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
    } catch (err: any) {
      console.error('Error updating status:', err);
      alert(err.message || 'Failed to update staff status.');
    }
  };

  // Revoke staff access
  const handleRevokeStaff = async (member: StaffMember) => {
    if (isProtectedOwner(member)) {
      alert('Permanent Store Owner cannot be deleted.');
      return;
    }
    if (!confirm(`Revoke all staff access for "${member.name}" (${member.email})? They will no longer be able to log in to the admin panel.`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'admin_users', member.id));
    } catch (err: any) {
      console.error('Error revoking staff:', err);
      alert(err.message || 'Failed to revoke staff access.');
    }
  };

  if (!isOwner) {
    return (
      <div className="bg-amber-50 border border-amber-200 text-amber-900 p-6 rounded-2xl flex items-center gap-4">
        <ShieldAlert className="w-8 h-8 text-amber-600 shrink-0" />
        <div>
          <h3 className="font-serif font-bold text-base">Restricted Area</h3>
          <p className="text-xs text-amber-700 mt-1">
            Staff management and authorization controls are restricted exclusively to the Permanent Store Owner.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-6 border border-stone-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#800020]/10 text-[#800020] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-serif font-bold text-stone-900">Staff & Permissions</h2>
              <p className="text-xs text-stone-500 font-sans">
                Authorize staff Gmail accounts for direct Google Sign-In and assign role permissions
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setModalError(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#800020] hover:bg-[#66001a] text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add New Staff</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-xs flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl text-xs flex items-center gap-3">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Role Explanations */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <span className="font-bold text-amber-800 uppercase tracking-wider text-[10px] block mb-1">
            Owner (Permanent)
          </span>
          <p className="text-stone-600 text-[11px] leading-relaxed">
            Full control over store, payment credentials, courier API keys, and staff roles. Cannot be removed.
          </p>
        </div>
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <span className="font-bold text-emerald-800 uppercase tracking-wider text-[10px] block mb-1">
            Full Access
          </span>
          <p className="text-stone-600 text-[11px] leading-relaxed">
            All operational features (orders, products, banners, categories). Cannot touch payment keys or staff.
          </p>
        </div>
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <span className="font-bold text-blue-800 uppercase tracking-wider text-[10px] block mb-1">
            Editor
          </span>
          <p className="text-stone-600 text-[11px] leading-relaxed">
            Manage approved orders, update products and stocks, and book couriers.
          </p>
        </div>
        <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
          <span className="font-bold text-purple-800 uppercase tracking-wider text-[10px] block mb-1">
            Viewer
          </span>
          <p className="text-stone-600 text-[11px] leading-relaxed">
            Read-only analytics, order listings, and products. Customer contact details are masked for privacy.
          </p>
        </div>
      </div>

      {/* Authorized Staff Table */}
      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
          <h3 className="font-serif font-bold text-stone-900 text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-stone-500" />
            <span>Authorized Team Members ({staff.length})</span>
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-stone-50 text-stone-500 font-mono text-[10px] uppercase tracking-wider border-b border-stone-200/60">
                <th className="px-6 py-3 font-semibold">User & Gmail</th>
                <th className="px-6 py-3 font-semibold">Assigned Role</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {staff.map((member) => {
                const isPermanentOwner = isProtectedOwner(member);

                return (
                  <tr key={member.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                          isPermanentOwner ? 'bg-amber-100 text-amber-800 font-serif' : 'bg-stone-100 text-stone-600'
                        }`}>
                          {member.name ? member.name.charAt(0).toUpperCase() : 'S'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-stone-900">{member.name || 'Staff Member'}</span>
                            {isPermanentOwner && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[9px] font-bold tracking-wide uppercase border border-amber-200">
                                Permanent Owner
                              </span>
                            )}
                          </div>
                          <span className="text-stone-400 font-mono text-[11px]">{member.email}</span>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      {isPermanentOwner ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-semibold">
                          <Lock className="w-3 h-3 text-amber-600" />
                          <span>Owner (Root)</span>
                        </span>
                      ) : (
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member, e.target.value as StaffRole)}
                          className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1 text-xs text-stone-800 font-medium focus:ring-1 focus:ring-[#800020] outline-none"
                        >
                          <option value="viewer">Viewer (Read Only)</option>
                          <option value="editor">Editor (Manage Orders & Products)</option>
                          <option value="full_access">Full Access (Operations)</option>
                        </select>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      {isPermanentOwner ? (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold uppercase tracking-wide border border-emerald-200">
                          Active
                        </span>
                      ) : (
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide border ${
                          member.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {member.status}
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      {isPermanentOwner ? (
                        <span className="text-[11px] text-stone-400 font-mono italic">Protected</span>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleToggleStatus(member)}
                            className={`p-1.5 rounded-lg border text-xs transition-colors ${
                              member.status === 'active'
                                ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                                : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                            }`}
                            title={member.status === 'active' ? 'Suspend Account' : 'Reactivate Account'}
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleRevokeStaff(member)}
                            className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Revoke Staff Access"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Authorize Staff Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-100 animate-scale-in">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#800020]/10 text-[#800020] flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="font-serif font-bold text-stone-900 text-base">Add & Authorize Staff</h3>
              </div>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setModalError(null);
                }}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Error Banner */}
            {modalError && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-semibold block text-rose-900">Staff যোগ করতে সমস্যা হয়েছে:</span>
                  <p className="mt-0.5 break-words font-mono text-[11px] leading-relaxed">{modalError}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleAuthorizeStaff} className="py-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Staff Member Name</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mahin Ahmed"
                    value={staffName}
                    onChange={(e) => setStaffName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-stone-200 rounded-xl text-xs text-stone-900 outline-none focus:border-[#800020] focus:ring-1 focus:ring-[#800020]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Staff Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
                  <input
                    type="email"
                    required
                    placeholder="e.g. staff@houseofmahi.com or gmail"
                    value={staffEmail}
                    onChange={(e) => setStaffEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-stone-200 rounded-xl text-xs text-stone-900 outline-none focus:border-[#800020] focus:ring-1 focus:ring-[#800020]"
                  />
                </div>
                <p className="text-[10px] text-stone-500 mt-1">
                  স্টাফ এই ইমেইল ঠিকানা দিয়ে লগইন করবেন।
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Login Password <span className="font-normal text-stone-400">(Email/Password লগইনের জন্য)</span>
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
                  <input
                    type={showStaffPassword ? 'text' : 'password'}
                    placeholder="কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড দিন"
                    value={staffPassword}
                    onChange={(e) => setStaffPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2 border border-stone-200 rounded-xl text-xs text-stone-900 outline-none focus:border-[#800020] focus:ring-1 focus:ring-[#800020]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowStaffPassword(prev => !prev)}
                    className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600 transition-colors"
                  >
                    {showStaffPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <p className="text-[10px] text-stone-500 mt-1">
                  পাসওয়ার্ড দিলে Firebase Authentication অ্যাকাউন্ট তৈরি হবে এবং স্টাফ ইমেইল/পাসওয়ার্ড দিয়ে সরাসরি লগইন করতে পারবেন।
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Access Role & Permissions</label>
                <select
                  value={staffRole}
                  onChange={(e) => setStaffRole(e.target.value as StaffRole)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-xs text-stone-900 outline-none focus:border-[#800020] focus:ring-1 focus:ring-[#800020]"
                >
                  <option value="viewer">Viewer (Read-only access: Orders, Products, Customers)</option>
                  <option value="editor">Editor (Order updates, Products, Categories, Courier dispatch)</option>
                  <option value="full_access">Full Access (Operations Manager: Store Operations & Analytics)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setModalError(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 text-xs font-medium hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={authorizing}
                  className="px-5 py-2 rounded-xl bg-[#800020] hover:bg-[#66001a] text-white text-xs font-semibold shadow-sm disabled:opacity-50 flex items-center gap-2"
                >
                  {authorizing ? (
                    <span>Authorizing Staff...</span>
                  ) : (
                    <span>Authorize & Save Staff</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffManagementModule;
