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

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
export default admin;
