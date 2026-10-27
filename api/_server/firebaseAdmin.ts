import admin from 'firebase-admin';

// Determine Firebase Project ID
const projectId = 
  process.env.FIREBASE_PROJECT_ID || 
  process.env.VITE_FIREBASE_PROJECT_ID || 
  'houseofmahi';

// Initialize Firebase Admin singleton
if (!admin.apps.length) {
  try {
    let credential;

    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      try {
        const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY.trim();
        // Support either raw JSON string or base64 encoded JSON
        const parsedKey = rawKey.startsWith('{')
          ? JSON.parse(rawKey)
          : JSON.parse(Buffer.from(rawKey, 'base64').toString('utf8'));
        credential = admin.credential.cert(parsedKey);
      } catch (keyParseErr) {
        console.warn('[FirebaseAdmin] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY, falling back to applicationDefault / projectId:', keyParseErr);
      }
    }

    if (credential) {
      admin.initializeApp({
        credential,
        projectId
      });
      console.log('[FirebaseAdmin] Initialized successfully with Service Account.');
    } else {
      // Fallback initialization with Project ID (works with Google Cloud Application Default Credentials if hosted on GCP/Cloud Run)
      admin.initializeApp({
        projectId
      });
      console.log(`[FirebaseAdmin] Initialized with Project ID: ${projectId}`);
    }
  } catch (initErr) {
    console.error('[FirebaseAdmin] Error during initialization:', initErr);
  }
}

// Lazy initialization to avoid crashing the serverless function at module load time
let _adminAuth: ReturnType<typeof admin.auth> | null = null;
let _adminDb: ReturnType<typeof admin.firestore> | null = null;

export function getAdminAuth() {
  if (!_adminAuth) {
    try {
      _adminAuth = admin.auth();
    } catch (err) {
      console.error('[FirebaseAdmin] Failed to get adminAuth:', err);
      throw err;
    }
  }
  return _adminAuth;
}

export function getAdminDb() {
  if (!_adminDb) {
    try {
      _adminDb = admin.firestore();
    } catch (err) {
      console.error('[FirebaseAdmin] Failed to get adminDb:', err);
      throw err;
    }
  }
  return _adminDb;
}

// Backward-compatible exports (initialized lazily on first access)
export const adminAuth = {
  verifyIdToken: (token: string) => getAdminAuth().verifyIdToken(token)
};

export const adminDb = {
  collection: (name: string) => getAdminDb().collection(name)
};

export default admin;
