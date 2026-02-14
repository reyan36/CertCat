// app/api/admin/users/route.js
// Admin API for user management
// Lists users, their certificates, and allows status management

import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  getDocs,
  orderBy,
  limit as firestoreLimit,
  startAfter,
  where,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import { requireAdminAuth, getPaginationParams } from '@/lib/admin-middleware';
import { logAdminAction } from '@/lib/admin-auth';
import { AUDIT_TYPES } from '@/lib/admin-config';

/**
 * GET /api/admin/users
 * Get list of users (derived from certificates and templates)
 *
 * Query params:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - search: Search by email
 * - status: Filter by status (active, suspended)
 */
export async function GET(request) {
  // Authenticate admin
  const auth = await requireAdminAuth(request);
  if (!auth.authorized) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, offset } = getPaginationParams(searchParams);
    const search = searchParams.get('search')?.toLowerCase() || '';
    const statusFilter = searchParams.get('status') || '';

    // Get all unique users from certificates (by organizerEmail)
    const certificatesRef = collection(db, 'certificates');
    const certificatesSnapshot = await getDocs(certificatesRef);

    // Get all unique users from templates (by userId)
    const templatesRef = collection(db, 'templates');
    const templatesSnapshot = await getDocs(templatesRef);

    // Get suspended users list
    const suspendedUsersRef = collection(db, 'suspendedUsers');
    const suspendedSnapshot = await getDocs(suspendedUsersRef);
    const suspendedEmails = new Set(suspendedSnapshot.docs.map(doc => doc.data().email?.toLowerCase()));

    // Aggregate user data
    const usersMap = new Map();

    // Process certificates
    certificatesSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const email = data.organizerEmail?.toLowerCase();
      if (!email) return;

      if (!usersMap.has(email)) {
        usersMap.set(email, {
          email,
          displayName: data.organizer || email,
          certificateCount: 0,
          templateCount: 0,
          lastActivity: null,
          firstSeen: null,
          status: suspendedEmails.has(email) ? 'suspended' : 'active',
        });
      }

      const user = usersMap.get(email);
      user.certificateCount++;

      // Track activity dates
      const issuedAt = data.issuedAt?.toDate?.() || (data.issuedAt ? new Date(data.issuedAt) : null);
      if (issuedAt) {
        if (!user.lastActivity || issuedAt > user.lastActivity) {
          user.lastActivity = issuedAt;
        }
        if (!user.firstSeen || issuedAt < user.firstSeen) {
          user.firstSeen = issuedAt;
        }
      }
    });

    // Process templates
    templatesSnapshot.docs.forEach(doc => {
      const data = doc.data();
      // Templates don't have email directly, but we can match by userId later
      // For now, we'll track by template count
    });

    // Convert to array and apply filters
    let users = Array.from(usersMap.values());

    // Apply search filter
    if (search) {
      users = users.filter(user =>
        user.email.includes(search) ||
        user.displayName?.toLowerCase().includes(search)
      );
    }

    // Apply status filter
    if (statusFilter) {
      users = users.filter(user => user.status === statusFilter);
    }

    // Sort by last activity (most recent first)
    users.sort((a, b) => {
      if (!a.lastActivity) return 1;
      if (!b.lastActivity) return -1;
      return b.lastActivity - a.lastActivity;
    });

    // Get total count before pagination
    const totalCount = users.length;

    // Apply pagination
    users = users.slice(offset, offset + limit);

    // Format dates for response
    users = users.map(user => ({
      ...user,
      lastActivity: user.lastActivity?.toISOString() || null,
      firstSeen: user.firstSeen?.toISOString() || null,
    }));

    // Log the action
    await logAdminAction(AUDIT_TYPES.VIEW_USERS, auth.session.email, {
      page,
      limit,
      search: search || undefined,
      statusFilter: statusFilter || undefined,
      resultCount: users.length,
    });

    return NextResponse.json({
      success: true,
      users,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: offset + limit < totalCount,
      },
    });
  } catch (error) {
    console.error('Admin users list error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/users
 * Manage user status (suspend/unsuspend)
 *
 * Request body:
 * - email: User email
 * - action: 'suspend' | 'unsuspend'
 * - reason: Reason for action (required for suspend)
 */
export async function POST(request) {
  // Authenticate admin with CSRF
  const auth = await requireAdminAuth(request, { requireCSRF: true });
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json();
    const { email, action, reason } = body;

    // Validate input
    if (!email || !action) {
      return NextResponse.json(
        { success: false, error: 'Email and action are required' },
        { status: 400 }
      );
    }

    if (!['suspend', 'unsuspend'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      );
    }

    if (action === 'suspend' && !reason) {
      return NextResponse.json(
        { success: false, error: 'Reason is required for suspension' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase();
    const suspendedRef = doc(db, 'suspendedUsers', normalizedEmail);

    if (action === 'suspend') {
      await setDoc(suspendedRef, {
        email: normalizedEmail,
        reason,
        suspendedBy: auth.session.email,
        suspendedAt: new Date(),
      });

      await logAdminAction(AUDIT_TYPES.SUSPEND_USER, auth.session.email, {
        targetEmail: normalizedEmail,
        reason,
      });

      return NextResponse.json({
        success: true,
        message: `User ${email} has been suspended`,
      });
    } else {
      await deleteDoc(suspendedRef);

      await logAdminAction(AUDIT_TYPES.UNSUSPEND_USER, auth.session.email, {
        targetEmail: normalizedEmail,
      });

      return NextResponse.json({
        success: true,
        message: `User ${email} has been unsuspended`,
      });
    }
  } catch (error) {
    console.error('Admin user action error:', error);
    return NextResponse.json(
      { success: false, error: 'Action failed' },
      { status: 500 }
    );
  }
}
