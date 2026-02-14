// lib/admin-auth.js
// Server-side admin authentication utilities
// IMPORTANT: This file should only be imported in server-side code (API routes)

import { db } from './firebase';
import { doc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { isAdminEmail, SECURITY_CONFIG, AUDIT_TYPES } from './admin-config';
import crypto from 'crypto';

/**
 * Generate a secure random token
 * @param {number} length - Token length in bytes
 * @returns {string} Hex-encoded token
 */
export function generateSecureToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate CSRF token
 * @returns {string}
 */
export function generateCSRFToken() {
  return generateSecureToken(SECURITY_CONFIG.CSRF_TOKEN_LENGTH);
}

/**
 * Hash a token for secure storage
 * @param {string} token - Token to hash
 * @returns {string} Hashed token
 */
export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Create an admin session
 * @param {string} email - Admin email
 * @param {string} uid - Firebase user ID
 * @param {string} displayName - User display name
 * @returns {Promise<{sessionToken: string, csrfToken: string}>}
 */
export async function createAdminSession(email, uid, displayName) {
  // Verify this is an admin
  if (!isAdminEmail(email)) {
    throw new Error('Unauthorized: Not an admin');
  }

  // Generate tokens
  const sessionToken = generateSecureToken();
  const csrfToken = generateCSRFToken();
  const hashedSessionToken = hashToken(sessionToken);

  // Calculate expiry
  const expiresAt = new Date(Date.now() + SECURITY_CONFIG.SESSION_DURATION);

  // Store session in Firestore
  await setDoc(doc(db, 'adminSessions', hashedSessionToken), {
    email: email.toLowerCase(),
    uid,
    displayName,
    csrfToken: hashToken(csrfToken),
    createdAt: serverTimestamp(),
    expiresAt,
    lastActivity: serverTimestamp(),
    ipAddress: null, // Will be set by API route
    userAgent: null, // Will be set by API route
  });

  // Log the login
  await logAdminAction(AUDIT_TYPES.LOGIN, email, {
    uid,
    displayName,
  });

  return { sessionToken, csrfToken, expiresAt };
}

/**
 * Validate an admin session
 * @param {string} sessionToken - Session token from cookie
 * @param {string} csrfToken - CSRF token from header (optional for GET requests)
 * @param {boolean} requireCSRF - Whether to validate CSRF token
 * @returns {Promise<{valid: boolean, session?: object, error?: string}>}
 */
export async function validateAdminSession(sessionToken, csrfToken = null, requireCSRF = false) {
  try {
    if (!sessionToken) {
      return { valid: false, error: 'No session token provided' };
    }

    const hashedToken = hashToken(sessionToken);
    const sessionDoc = await getDoc(doc(db, 'adminSessions', hashedToken));

    if (!sessionDoc.exists()) {
      return { valid: false, error: 'Invalid session' };
    }

    const session = sessionDoc.data();

    // Check expiry
    const expiresAt = session.expiresAt?.toDate?.() || new Date(session.expiresAt);
    if (expiresAt < new Date()) {
      // Clean up expired session
      await deleteDoc(doc(db, 'adminSessions', hashedToken));
      return { valid: false, error: 'Session expired' };
    }

    // Validate CSRF token for non-GET requests
    if (requireCSRF) {
      if (!csrfToken) {
        return { valid: false, error: 'CSRF token required' };
      }
      if (hashToken(csrfToken) !== session.csrfToken) {
        return { valid: false, error: 'Invalid CSRF token' };
      }
    }

    // Update last activity
    await setDoc(doc(db, 'adminSessions', hashedToken), {
      ...session,
      lastActivity: serverTimestamp(),
    });

    return {
      valid: true,
      session: {
        email: session.email,
        uid: session.uid,
        displayName: session.displayName,
        createdAt: session.createdAt,
      },
    };
  } catch (error) {
    console.error('Session validation error:', error);
    return { valid: false, error: 'Session validation failed' };
  }
}

/**
 * Destroy an admin session (logout)
 * @param {string} sessionToken - Session token to destroy
 * @returns {Promise<boolean>}
 */
export async function destroyAdminSession(sessionToken) {
  try {
    const hashedToken = hashToken(sessionToken);
    const sessionDoc = await getDoc(doc(db, 'adminSessions', hashedToken));

    if (sessionDoc.exists()) {
      const session = sessionDoc.data();
      await deleteDoc(doc(db, 'adminSessions', hashedToken));

      // Log the logout
      await logAdminAction(AUDIT_TYPES.LOGOUT, session.email, {
        uid: session.uid,
      });
    }

    return true;
  } catch (error) {
    console.error('Session destruction error:', error);
    return false;
  }
}

/**
 * Log an admin action for audit trail
 * @param {string} action - Action type from AUDIT_TYPES
 * @param {string} adminEmail - Admin who performed the action
 * @param {object} details - Additional details
 * @returns {Promise<void>}
 */
export async function logAdminAction(action, adminEmail, details = {}) {
  try {
    const logId = `${Date.now()}_${generateSecureToken(8)}`;
    await setDoc(doc(db, 'adminAuditLogs', logId), {
      action,
      adminEmail: adminEmail?.toLowerCase(),
      details,
      timestamp: serverTimestamp(),
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Audit log error:', error);
    // Don't throw - logging should not break functionality
  }
}

/**
 * Check login rate limiting
 * @param {string} email - Email attempting login
 * @returns {Promise<{allowed: boolean, remainingAttempts?: number, lockoutEnd?: Date}>}
 */
export async function checkLoginRateLimit(email) {
  try {
    const rateLimitDoc = await getDoc(doc(db, 'adminLoginAttempts', email.toLowerCase()));

    if (!rateLimitDoc.exists()) {
      return { allowed: true, remainingAttempts: SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS };
    }

    const data = rateLimitDoc.data();
    const lockoutEnd = data.lockoutEnd?.toDate?.() || new Date(data.lockoutEnd);

    // Check if locked out
    if (data.attempts >= SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS && lockoutEnd > new Date()) {
      return { allowed: false, lockoutEnd };
    }

    // Reset if lockout expired
    if (lockoutEnd < new Date()) {
      await deleteDoc(doc(db, 'adminLoginAttempts', email.toLowerCase()));
      return { allowed: true, remainingAttempts: SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS };
    }

    return {
      allowed: true,
      remainingAttempts: SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS - data.attempts,
    };
  } catch (error) {
    console.error('Rate limit check error:', error);
    return { allowed: true }; // Fail open to prevent lockout on errors
  }
}

/**
 * Record a failed login attempt
 * @param {string} email - Email that failed login
 * @returns {Promise<void>}
 */
export async function recordFailedLogin(email) {
  try {
    const docRef = doc(db, 'adminLoginAttempts', email.toLowerCase());
    const rateLimitDoc = await getDoc(docRef);

    let attempts = 1;
    if (rateLimitDoc.exists()) {
      attempts = (rateLimitDoc.data().attempts || 0) + 1;
    }

    const lockoutEnd = new Date(Date.now() + SECURITY_CONFIG.LOGIN_LOCKOUT_DURATION);

    await setDoc(docRef, {
      email: email.toLowerCase(),
      attempts,
      lastAttempt: serverTimestamp(),
      lockoutEnd: attempts >= SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS ? lockoutEnd : null,
    });

    // Log failed attempt
    await logAdminAction(AUDIT_TYPES.FAILED_LOGIN, email, {
      attempts,
      lockedOut: attempts >= SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS,
    });
  } catch (error) {
    console.error('Record failed login error:', error);
  }
}

/**
 * Clear login attempts after successful login
 * @param {string} email - Email that logged in successfully
 * @returns {Promise<void>}
 */
export async function clearLoginAttempts(email) {
  try {
    await deleteDoc(doc(db, 'adminLoginAttempts', email.toLowerCase()));
  } catch (error) {
    console.error('Clear login attempts error:', error);
  }
}

/**
 * Clean up expired sessions (run periodically)
 * @returns {Promise<number>} Number of sessions cleaned
 */
export async function cleanupExpiredSessions() {
  try {
    const now = new Date();
    const sessionsRef = collection(db, 'adminSessions');
    const q = query(sessionsRef, where('expiresAt', '<', now));
    const snapshot = await getDocs(q);

    let cleaned = 0;
    for (const doc of snapshot.docs) {
      await deleteDoc(doc.ref);
      cleaned++;
    }

    return cleaned;
  } catch (error) {
    console.error('Session cleanup error:', error);
    return 0;
  }
}
