// lib/admin-config.js
// Admin configuration for CertCat
// This file defines who has admin access and security settings

/**
 * ADMIN CONFIGURATION
 *
 * SECURITY NOTES:
 * - Admin emails are validated server-side only
 * - Never expose admin list to client
 * - All admin actions are logged
 * - Session tokens have limited lifetime
 */

// Admin users - add your email here
// These users will have access to the admin dashboard
// NOTE: Using a function to ensure env vars are read at runtime
function getAdminEmails() {
  const emails = [
    process.env.ADMIN_EMAIL,
    // Add additional admin emails here if needed:
    // 'another-admin@example.com',
  ].filter(Boolean);

  // Debug logging (remove in production)
  if (emails.length === 0) {
    console.warn('⚠️ No ADMIN_EMAIL configured in environment variables!');
  }

  return emails.map(email => email.toLowerCase());
}

// Export as a getter to ensure fresh read
export const ADMIN_EMAILS = getAdminEmails();

// Security configuration
export const SECURITY_CONFIG = {
  // Session settings
  SESSION_DURATION: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  SESSION_COOKIE_NAME: 'certcat_admin_session',

  // Rate limiting
  MAX_LOGIN_ATTEMPTS: 5,
  LOGIN_LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes

  // CSRF protection
  CSRF_TOKEN_LENGTH: 32,
  CSRF_COOKIE_NAME: 'certcat_csrf',

  // API rate limits
  API_RATE_LIMIT: 100, // requests per minute
  API_RATE_WINDOW: 60 * 1000, // 1 minute
};

// Admin permissions - what each admin can do
export const ADMIN_PERMISSIONS = {
  VIEW_USERS: 'view_users',
  MANAGE_USERS: 'manage_users',
  VIEW_CERTIFICATES: 'view_certificates',
  DELETE_CERTIFICATES: 'delete_certificates',
  VIEW_TEMPLATES: 'view_templates',
  DELETE_TEMPLATES: 'delete_templates',
  VIEW_ANALYTICS: 'view_analytics',
  VIEW_LOGS: 'view_logs',
  MANAGE_SETTINGS: 'manage_settings',
};

// Default permissions for all admins
export const DEFAULT_ADMIN_PERMISSIONS = Object.values(ADMIN_PERMISSIONS);

/**
 * Check if an email is an admin
 * @param {string} email - Email to check
 * @returns {boolean}
 */
export function isAdminEmail(email) {
  if (!email) return false;

  // Read ADMIN_EMAIL at runtime to ensure it's available
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  const emailLower = email.toLowerCase();

  // Check against env var directly (runtime check)
  if (adminEmail && emailLower === adminEmail) {
    return true;
  }

  // Also check against the static list
  return ADMIN_EMAILS.includes(emailLower);
}

/**
 * Validate admin session token format
 * @param {string} token - Session token
 * @returns {boolean}
 */
export function isValidTokenFormat(token) {
  if (!token || typeof token !== 'string') return false;
  // Token should be a valid format (alphanumeric, reasonable length)
  return /^[a-zA-Z0-9_-]{20,}$/.test(token);
}

// Audit log types
export const AUDIT_TYPES = {
  LOGIN: 'admin_login',
  LOGOUT: 'admin_logout',
  VIEW_USERS: 'view_users',
  VIEW_USER: 'view_user',
  SUSPEND_USER: 'suspend_user',
  UNSUSPEND_USER: 'unsuspend_user',
  DELETE_CERTIFICATE: 'delete_certificate',
  DELETE_TEMPLATE: 'delete_template',
  VIEW_ANALYTICS: 'view_analytics',
  SETTINGS_CHANGE: 'settings_change',
  FAILED_LOGIN: 'failed_login',
};
