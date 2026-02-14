// lib/firebase-admin.js
// Firebase Admin SDK for server-side operations
// This bypasses Firestore security rules (use only in API routes)

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let adminDb = null;

/**
 * Initialize Firebase Admin SDK
 * Uses service account credentials from environment variables
 */
function initializeFirebaseAdmin() {
  if (getApps().length === 0) {
    // Check if we have service account credentials
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (serviceAccount) {
      // Parse the service account JSON from environment variable
      try {
        const credentials = JSON.parse(serviceAccount);
        initializeApp({
          credential: cert(credentials),
          projectId: credentials.project_id,
        });
      } catch (error) {
        console.error('Failed to parse Firebase service account:', error);
        // Fall back to application default credentials
        initializeApp({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        });
      }
    } else {
      // Use application default credentials (works in Firebase hosting/Cloud Run)
      // Or initialize without credentials for development
      initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
    }
  }

  return getFirestore();
}

/**
 * Get the Admin Firestore instance
 * @returns {FirebaseFirestore.Firestore}
 */
export function getAdminDb() {
  if (!adminDb) {
    adminDb = initializeFirebaseAdmin();
  }
  return adminDb;
}

// Export for convenience
export { FieldValue } from 'firebase-admin/firestore';
