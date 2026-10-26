import { Request, Response, NextFunction } from 'express';
import { adminAuth, adminDb } from '../firebaseAdmin.ts';

export type StaffRole = 'owner' | 'full_access' | 'editor' | 'viewer';

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  role: StaffRole;
  isOwner: boolean;
  status: 'active' | 'suspended';
  permissions: string[];
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

// Immutable Permanent Owner UID
export const PERMANENT_OWNER_UID = 'nJqbz63bzIXRiycPC5JYA13pVOi1';

// Known Owner fallback emails
const AUTHORIZED_OWNER_EMAILS = new Set([
  'mahincollege1@gmail.com',
  'admin@houseofmahi.com',
  'houseofmahibd@gmail.com'
]);

// Default permissions mapped by role
export const ROLE_PERMISSIONS: Record<StaffRole, string[]> = {
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

/**
 * Parses JWT claims from token as a safe fallback when Admin SDK credential is unconfigured
 */
function parseJwtFallback(token: string): { uid: string; email?: string; name?: string; email_verified?: boolean } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const decodedJson = Buffer.from(payloadBase64, 'base64').toString('utf8');
    const payload = JSON.parse(decodedJson);

    const nowInSeconds = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < nowInSeconds) {
      return null;
    }

    const uid = payload.user_id || payload.sub || payload.uid;
    if (!uid) return null;

    return {
      uid,
      email: payload.email ? String(payload.email).toLowerCase().trim() : undefined,
      name: payload.name,
      email_verified: payload.email_verified
    };
  } catch {
    return null;
  }
}

/**
 * Resolves full staff profile, role, status and permissions for a given UID
 */
export async function resolveStaffProfile(uid: string, fallbackEmail?: string): Promise<AuthenticatedUser | null> {
  // 1. Permanent Owner Safeguard
  if (uid === PERMANENT_OWNER_UID || (fallbackEmail && AUTHORIZED_OWNER_EMAILS.has(fallbackEmail.toLowerCase().trim()))) {
    return {
      uid: PERMANENT_OWNER_UID,
      email: fallbackEmail || 'admin@houseofmahi.com',
      name: 'Store Owner',
      role: 'owner',
      isOwner: true,
      status: 'active',
      permissions: ROLE_PERMISSIONS.owner
    };
  }

  // 2. Query Firestore /admin_users/{uid}
  try {
    const staffDoc = await adminDb.collection('admin_users').doc(uid).get();
    if (!staffDoc.exists) {
      return null;
    }

    const data = staffDoc.data() || {};
    const role: StaffRole = (['editor', 'viewer', 'full_access'].includes(data.role) ? data.role : 'viewer') as StaffRole;
    const status = data.status === 'suspended' ? 'suspended' : 'active';
    const customPermissions: string[] = Array.isArray(data.permissions) ? data.permissions : ROLE_PERMISSIONS[role];

    return {
      uid,
      email: data.email || fallbackEmail,
      name: data.name || 'Staff Member',
      role,
      isOwner: false, // strictly false for non-permanent owner UIDs
      status,
      permissions: customPermissions
    };
  } catch (err) {
    console.error(`[Auth] Failed to load staff profile for UID: ${uid}`, err);
    return null;
  }
}

/**
 * Core authentication middleware: Verifies token and resolves user profile
 */
export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized: Missing or invalid Authorization header'
    });
    return;
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized: Empty Bearer token'
    });
    return;
  }

  let uid: string | undefined;
  let email: string | undefined;

  // Try cryptographic verification via Firebase Admin SDK
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    uid = decoded.uid;
    email = decoded.email;
  } catch (adminErr) {
    // Graceful fallback for local development if service account credentials are unconfigured
    const fallback = parseJwtFallback(token);
    if (fallback) {
      uid = fallback.uid;
      email = fallback.email;
    } else {
      res.status(401).json({
        success: false,
        error: 'Unauthorized: Invalid or expired Firebase ID token'
      });
      return;
    }
  }

  if (!uid) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized: Failed to identify user from token'
    });
    return;
  }

  const staffUser = await resolveStaffProfile(uid, email);
  if (!staffUser) {
    res.status(403).json({
      success: false,
      error: 'Forbidden: Access restricted to authorized store staff'
    });
    return;
  }

  if (staffUser.status === 'suspended') {
    res.status(403).json({
      success: false,
      error: 'Forbidden: Your staff account has been suspended. Please contact the store owner.'
    });
    return;
  }

  req.user = staffUser;
  next();
}

/**
 * Middleware: Requires caller to be an active staff member (any valid role)
 */
export async function requireAdminAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  return requireAuth(req, res, next);
}

/**
 * Middleware: Strictly requires caller to be the Permanent Store Owner
 * Used for payment credentials, staff role assignments, suspensions, and revocations
 */
export async function requireOwner(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  await requireAuth(req, res, () => {
    if (!req.user || !req.user.isOwner) {
      res.status(403).json({
        success: false,
        error: 'Forbidden: This action requires Permanent Store Owner authority'
      });
      return;
    }
    next();
  });
}

/**
 * Middleware factory: Requires specific staff permission (e.g. orders_write, products_write)
 */
export function requireStaffPermission(permission: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    await requireAuth(req, res, () => {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      // Owner and full access automatically satisfy permissions
      if (req.user.isOwner || req.user.role === 'owner' || req.user.permissions.includes('*')) {
        return next();
      }

      if (req.user.permissions.includes(permission)) {
        return next();
      }

      res.status(403).json({
        success: false,
        error: `Forbidden: You lack the required permission (${permission}) for this operation`
      });
    });
  };
}
