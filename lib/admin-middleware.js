// lib/admin-middleware.js
// Middleware utilities for admin API routes
// Provides authentication and CSRF protection

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { validateAdminSession } from './admin-auth';
import { SECURITY_CONFIG } from './admin-config';

/**
 * Middleware to protect admin API routes
 * Use this in API routes that require admin authentication
 *
 * @param {Request} request - The incoming request
 * @param {Object} options - Options
 * @param {boolean} options.requireCSRF - Whether to require CSRF token (default: true for non-GET)
 * @returns {Promise<{authorized: boolean, session?: object, response?: NextResponse}>}
 *
 * Usage in API route:
 * ```
 * const auth = await requireAdminAuth(request);
 * if (!auth.authorized) return auth.response;
 * // auth.session contains admin info
 * ```
 */
export async function requireAdminAuth(request, options = {}) {
  const method = request.method;
  const requireCSRF = options.requireCSRF ?? (method !== 'GET');

  try {
    // Get session token from cookie
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SECURITY_CONFIG.SESSION_COOKIE_NAME)?.value;

    if (!sessionToken) {
      return {
        authorized: false,
        response: NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        ),
      };
    }

    // Get CSRF token from header (for non-GET requests)
    const csrfToken = request.headers.get('X-CSRF-Token');

    // Validate session
    const validation = await validateAdminSession(sessionToken, csrfToken, requireCSRF);

    if (!validation.valid) {
      const status = validation.error === 'Invalid CSRF token' ? 403 : 401;
      return {
        authorized: false,
        response: NextResponse.json(
          { success: false, error: validation.error },
          { status }
        ),
      };
    }

    return {
      authorized: true,
      session: validation.session,
    };
  } catch (error) {
    console.error('Admin auth middleware error:', error);
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, error: 'Authentication error' },
        { status: 500 }
      ),
    };
  }
}

/**
 * Rate limiting for admin API routes
 * Simple in-memory rate limiter (consider Redis for production)
 */
const rateLimitStore = new Map();

export function checkRateLimit(identifier, maxRequests = 100, windowMs = 60000) {
  const now = Date.now();
  const key = `${identifier}`;

  // Clean old entries
  const windowStart = now - windowMs;

  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, []);
  }

  const requests = rateLimitStore.get(key).filter(time => time > windowStart);
  rateLimitStore.set(key, requests);

  if (requests.length >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(requests[0] + windowMs),
    };
  }

  requests.push(now);
  rateLimitStore.set(key, requests);

  return {
    allowed: true,
    remaining: maxRequests - requests.length,
  };
}

/**
 * Sanitize user input to prevent XSS
 * @param {string} input - User input to sanitize
 * @returns {string} Sanitized input
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate and sanitize pagination parameters
 * @param {URLSearchParams} searchParams
 * @returns {{ page: number, limit: number, offset: number }}
 */
export function getPaginationParams(searchParams) {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}
