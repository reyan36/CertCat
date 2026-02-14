// app/api/admin/auth/route.js
// Admin authentication API endpoints
// Handles login verification, session management, and logout

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  createAdminSession,
  validateAdminSession,
  destroyAdminSession,
  checkLoginRateLimit,
  recordFailedLogin,
  clearLoginAttempts,
} from '@/lib/admin-auth';
import { isAdminEmail, SECURITY_CONFIG } from '@/lib/admin-config';
import { auth } from '@/lib/firebase';

/**
 * POST /api/admin/auth
 * Verify Firebase token and create admin session
 *
 * Request body:
 * - idToken: Firebase ID token from client
 *
 * Response:
 * - success: boolean
 * - csrfToken: string (for subsequent requests)
 * - admin: { email, displayName }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { idToken, email, uid, displayName } = body;

    // Validate required fields
    if (!email || !uid) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check rate limiting
    const rateLimit = await checkLoginRateLimit(email);
    if (!rateLimit.allowed) {
      const waitTime = Math.ceil((rateLimit.lockoutEnd - new Date()) / 1000 / 60);
      return NextResponse.json(
        {
          success: false,
          error: `Too many login attempts. Please wait ${waitTime} minutes.`,
          lockoutEnd: rateLimit.lockoutEnd,
        },
        { status: 429 }
      );
    }

    // Verify this is an admin email
    if (!isAdminEmail(email)) {
      await recordFailedLogin(email);
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Admin access required' },
        { status: 403 }
      );
    }

    // Create admin session
    const { sessionToken, csrfToken, expiresAt } = await createAdminSession(
      email,
      uid,
      displayName || email
    );

    // Clear any previous failed attempts
    await clearLoginAttempts(email);

    // Set session cookie
    const cookieStore = await cookies();
    cookieStore.set(SECURITY_CONFIG.SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: expiresAt,
      path: '/',
    });

    return NextResponse.json({
      success: true,
      csrfToken,
      admin: {
        email,
        displayName: displayName || email,
      },
      expiresAt,
    });
  } catch (error) {
    console.error('Admin auth error:', error);
    return NextResponse.json(
      { success: false, error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/auth
 * Validate current session and return admin info
 *
 * Response:
 * - success: boolean
 * - admin: { email, displayName } (if valid)
 */
export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SECURITY_CONFIG.SESSION_COOKIE_NAME)?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const validation = await validateAdminSession(sessionToken);

    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      admin: {
        email: validation.session.email,
        displayName: validation.session.displayName,
      },
    });
  } catch (error) {
    console.error('Admin session check error:', error);
    return NextResponse.json(
      { success: false, error: 'Session check failed' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/auth
 * Logout - destroy session
 */
export async function DELETE(request) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SECURITY_CONFIG.SESSION_COOKIE_NAME)?.value;

    if (sessionToken) {
      await destroyAdminSession(sessionToken);
    }

    // Clear the cookie
    cookieStore.delete(SECURITY_CONFIG.SESSION_COOKIE_NAME);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin logout error:', error);
    return NextResponse.json(
      { success: false, error: 'Logout failed' },
      { status: 500 }
    );
  }
}
