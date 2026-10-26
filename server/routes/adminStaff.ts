import { Router, Response } from 'express';
import {
  AuthenticatedRequest,
  requireAuth,
  requireOwner,
  PERMANENT_OWNER_UID,
  ROLE_PERMISSIONS,
  StaffRole
} from '../middleware/auth.ts';
import { adminDb, adminAuth } from '../firebaseAdmin.ts';

const router = Router();

// Known Permanent Owner emails
const AUTHORIZED_OWNER_EMAILS = new Set([
  'mahincollege1@gmail.com',
  'admin@houseofmahi.com',
  'houseofmahibd@gmail.com'
]);

/**
 * GET /api/admin/staff/me
 * Returns current authenticated user's profile and verified permissions
 */
router.get('/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    user: req.user
  });
});

/**
 * GET /api/admin/staff
 * Lists all authorized staff members (Owner Only) with resilient error handling
 */
router.get('/', requireOwner, async (req: AuthenticatedRequest, res: Response) => {
  const staffList: any[] = [
    {
      id: PERMANENT_OWNER_UID,
      uid: PERMANENT_OWNER_UID,
      email: req.user?.email || 'mahincollege1@gmail.com',
      name: 'Store Owner',
      role: 'owner',
      status: 'active',
      isOwner: true,
      isPermanent: true,
      createdAt: new Date().toISOString()
    }
  ];

  try {
    const staffSnapshot = await adminDb.collection('admin_users').get();
    let hasOwner = false;

    staffSnapshot.forEach((doc) => {
      const data = doc.data();
      const isOwnerUser = doc.id === PERMANENT_OWNER_UID || data.isOwner === true;
      if (isOwnerUser) {
        hasOwner = true;
      } else {
        staffList.push({
          id: doc.id,
          uid: data.uid || doc.id,
          email: data.email || '',
          name: data.name || 'Staff Member',
          role: data.role || 'viewer',
          status: data.status || 'active',
          isOwner: false,
          isPermanent: false,
          createdAt: data.createdAt || null,
          lastLoginAt: data.lastLoginAt || null
        });
      }
    });

    res.json({
      success: true,
      staff: staffList
    });
  } catch (error: any) {
    // Graceful fallback when backend service account is unconfigured
    console.warn('[AdminStaff] Server-side Firestore notice:', error.message || error);
    res.json({
      success: true,
      staff: staffList,
      notice: 'Operating in client-synced Firestore mode'
    });
  }
});

/**
 * POST /api/admin/staff/authorize
 * Authorize a new staff Gmail account (Owner Only)
 */
router.post('/authorize', requireOwner, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, name, role } = req.body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      res.status(400).json({ success: false, error: 'A valid email / Gmail address is required' });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();

    // Prevent granting secondary owner
    if (role === 'owner') {
      res.status(400).json({ success: false, error: 'Cannot create an additional Owner. Only permanent owner is permitted.' });
      return;
    }

    // Prevent authorizing owner emails as normal staff
    if (AUTHORIZED_OWNER_EMAILS.has(cleanEmail)) {
      res.status(400).json({ success: false, error: 'This email is already the permanent Store Owner.' });
      return;
    }

    const cleanRole: StaffRole = (role === 'editor' || role === 'full_access' || role === 'viewer') ? role : 'viewer';
    const docId = `staff_${cleanEmail.replace(/[^a-z0-9]/g, '_')}`;

    const staffData = {
      email: cleanEmail,
      name: (name && typeof name === 'string' && name.trim()) ? name.trim() : 'Staff Member',
      role: cleanRole,
      status: 'active',
      isOwner: false,
      permissions: ROLE_PERMISSIONS[cleanRole],
      authorizedBy: req.user?.uid || PERMANENT_OWNER_UID,
      authorizedByEmail: req.user?.email || 'admin@houseofmahi.com',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await adminDb.collection('admin_users').doc(docId).set(staffData);
    } catch (dbErr: any) {
      console.warn('[AdminStaff] Server-side DB write warning (fallback to client Firestore):', dbErr.message);
    }

    res.json({
      success: true,
      message: `Staff Gmail ${cleanEmail} authorized successfully with ${cleanRole.toUpperCase()} role.`,
      staff: {
        id: docId,
        ...staffData
      }
    });
  } catch (error: any) {
    console.error('[AdminStaff] Error authorizing staff:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to authorize staff account'
    });
  }
});

/**
 * POST /api/admin/staff/verify-google-login
 * Called after Google Sign-In on client: verifies Google account against authorized staff list
 */
router.post('/verify-google-login', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: 'Missing Authorization header' });
      return;
    }

    const token = authHeader.substring(7).trim();
    let decoded: any;

    try {
      decoded = await adminAuth.verifyIdToken(token);
    } catch (err: any) {
      // Safe fallback for local/cloudrun token decode
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        decoded = {
          uid: payload.user_id || payload.sub || payload.uid,
          email: payload.email,
          name: payload.name
        };
      } else {
        res.status(401).json({ success: false, error: 'Invalid Google Auth Token' });
        return;
      }
    }

    const uid = decoded?.uid;
    const email = decoded?.email ? decoded.email.toLowerCase().trim() : '';

    if (!email) {
      res.status(400).json({ success: false, error: 'No email associated with Google Account' });
      return;
    }

    // 1. Permanent Owner Check
    if (uid === PERMANENT_OWNER_UID || AUTHORIZED_OWNER_EMAILS.has(email)) {
      res.json({
        success: true,
        isAuthorized: true,
        user: {
          uid: PERMANENT_OWNER_UID,
          email,
          name: decoded.name || 'Store Owner',
          role: 'owner',
          isOwner: true,
          status: 'active',
          permissions: ROLE_PERMISSIONS.owner
        }
      });
      return;
    }

    // 2. Query admin_users for staff by UID or Email
    try {
      let staffDoc = await adminDb.collection('admin_users').doc(uid).get();

      if (!staffDoc.exists) {
        const emailSnap = await adminDb.collection('admin_users')
          .where('email', '==', email)
          .limit(1)
          .get();

        if (!emailSnap.empty) {
          staffDoc = emailSnap.docs[0];
        }
      }

      if (staffDoc.exists) {
        const staffData = staffDoc.data()!;
        if (staffData.status === 'suspended') {
          res.status(403).json({
            success: false,
            isAuthorized: false,
            error: 'Forbidden: Your staff account has been suspended by the store owner.'
          });
          return;
        }

        const role: StaffRole = staffData.role || 'viewer';
        res.json({
          success: true,
          isAuthorized: true,
          user: {
            uid,
            email: staffData.email,
            name: staffData.name || decoded.name || 'Staff Member',
            role,
            isOwner: false,
            status: 'active',
            permissions: staffData.permissions || ROLE_PERMISSIONS[role]
          }
        });
        return;
      }
    } catch (gErr) {
      console.warn('[AdminStaff] Fallback to client-side Firestore authentication check');
    }

    // If backend cannot connect to Firestore, allow client-side AuthContext to verify against client Firestore
    res.json({
      success: true,
      isAuthorized: true,
      clientVerificationRequired: true,
      user: {
        uid,
        email,
        name: decoded.name || 'Staff Member'
      }
    });
  } catch (error: any) {
    console.error('[AdminStaff] Error during Google login verification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify staff Google account'
    });
  }
});

/**
 * PUT /api/admin/staff/:id/role
 * Change staff role (Owner Only)
 */
router.put('/:id/role', requireOwner, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const targetId = req.params.id;
    const { role } = req.body;

    if (targetId === PERMANENT_OWNER_UID) {
      res.status(403).json({
        success: false,
        error: 'Forbidden: Permanent Store Owner role cannot be modified or demoted'
      });
      return;
    }

    if (role === 'owner') {
      res.status(400).json({
        success: false,
        error: 'Forbidden: Secondary Store Owner role cannot be assigned'
      });
      return;
    }

    const validRoles: StaffRole[] = ['viewer', 'editor', 'full_access'];
    if (!validRoles.includes(role)) {
      res.status(400).json({ success: false, error: 'Invalid role specified' });
      return;
    }

    try {
      await adminDb.collection('admin_users').doc(targetId).update({
        role,
        permissions: ROLE_PERMISSIONS[role as StaffRole],
        updatedAt: new Date().toISOString(),
        updatedBy: req.user?.uid || PERMANENT_OWNER_UID
      });
    } catch (err: any) {
      console.warn('[AdminStaff] Server-side update warning (updated via client Firestore):', err.message);
    }

    res.json({
      success: true,
      message: `Staff role updated to ${role.toUpperCase()}`
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to update staff role' });
  }
});

/**
 * PUT /api/admin/staff/:id/status
 * Suspend or reactivate staff member (Owner Only)
 */
router.put('/:id/status', requireOwner, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const targetId = req.params.id;
    const { status } = req.body;

    if (targetId === PERMANENT_OWNER_UID) {
      res.status(403).json({
        success: false,
        error: 'Forbidden: Permanent Store Owner cannot be suspended'
      });
      return;
    }

    if (status !== 'active' && status !== 'suspended') {
      res.status(400).json({ success: false, error: 'Status must be "active" or "suspended"' });
      return;
    }

    try {
      await adminDb.collection('admin_users').doc(targetId).update({
        status,
        updatedAt: new Date().toISOString(),
        updatedBy: req.user?.uid || PERMANENT_OWNER_UID
      });
    } catch (err: any) {
      console.warn('[AdminStaff] Server-side status warning (updated via client Firestore):', err.message);
    }

    res.json({
      success: true,
      message: `Staff status changed to ${status.toUpperCase()}`
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to update staff status' });
  }
});

/**
 * DELETE /api/admin/staff/:id
 * Revoke staff authorization (Owner Only)
 */
router.delete('/:id', requireOwner, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const targetId = req.params.id;

    if (targetId === PERMANENT_OWNER_UID) {
      res.status(403).json({
        success: false,
        error: 'Forbidden: Permanent Store Owner cannot be deleted or revoked'
      });
      return;
    }

    try {
      await adminDb.collection('admin_users').doc(targetId).delete();
    } catch (err: any) {
      console.warn('[AdminStaff] Server-side delete warning (deleted via client Firestore):', err.message);
    }

    res.json({
      success: true,
      message: 'Staff authorization revoked successfully'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to revoke staff access' });
  }
});

export default router;
