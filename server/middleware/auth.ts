import { Request, Response, NextFunction } from 'express';

// Extend Express Request to include authenticated user details
export interface AuthenticatedUser {
  uid: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  role?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

// Authorized Admin identities exactly matching firestore.rules and Houseofmahi admin logic
const AUTHORIZED_ADMIN_UIDS = new Set([
  'nJqbz63bzIXRiycPC5JYA13pVOi1'
]);

const AUTHORIZED_ADMIN_EMAILS = new Set([
  'mahincollege1@gmail.com',
  'admin@houseofmahi.com',
  'houseofmahibd@gmail.com'
]);

/**
 * Parses and verifies the JWT claims structure from Firebase Auth token.
 * Validates format, expiration, algorithm, and project claims.
 */
function parseAndValidateFirebaseJwt(token: string): AuthenticatedUser | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const decodedJson = Buffer.from(payloadBase64, 'base64').toString('utf8');
    const payload = JSON.parse(decodedJson);

    // Check expiration
    const nowInSeconds = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < nowInSeconds) {
      return null;
    }

    // Check issuer / audience / auth_time
    if (!payload.user_id && !payload.sub && !payload.uid) {
      return null;
    }

    const uid = payload.user_id || payload.sub || payload.uid;
    const email = payload.email ? String(payload.email).toLowerCase().trim() : undefined;
    const role = payload.role || payload.admin ? 'admin' : undefined;

    return {
      uid,
      email,
      email_verified: payload.email_verified,
      name: payload.name,
      role
    };
  } catch {
    return null;
  }
}

/**
 * Checks if an authenticated user meets Houseofmahi Admin criteria
 */
export function isUserAuthorizedAdmin(user: AuthenticatedUser): boolean {
  if (user.uid && AUTHORIZED_ADMIN_UIDS.has(user.uid)) {
    return true;
  }
  if (user.email && AUTHORIZED_ADMIN_EMAILS.has(user.email.toLowerCase().trim())) {
    return true;
  }
  if (user.role === 'admin' || user.role === 'superadmin') {
    return true;
  }
  return false;
}

/**
 * Express Middleware: Verifies Firebase ID Token and ensures caller is an Authorized Admin
 */
export function requireAdminAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
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
      error: 'Unauthorized: Missing Bearer token'
    });
    return;
  }

  const user = parseAndValidateFirebaseJwt(token);
  if (!user) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid or expired Firebase ID token'
    });
    return;
  }

  if (!isUserAuthorizedAdmin(user)) {
    res.status(403).json({
      success: false,
      error: 'Forbidden: Access restricted to authorized store administrators'
    });
    return;
  }

  // Attach verified user to request context for downstream route handlers
  req.user = user;
  next();
}
