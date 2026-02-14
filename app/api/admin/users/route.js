// app/api/admin/users/route.js
// Admin API for user management
// Lists users, their certificates, and allows status management

import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { requireAdminAuth, getPaginationParams } from '@/lib/admin-middleware';
import { logAdminAction } from '@/lib/admin-auth';
import { AUDIT_TYPES } from '@/lib/admin-config';

/**
 * GET /api/admin/users
 * Get list of users (derived from certificates and templates)
 */
export async function GET(request) {
  const auth = await requireAdminAuth(request);
  if (!auth.authorized) return auth.response;

  try {
    const db = getAdminDb();
    const { searchParams } = new URL(request.url);
    const { page, limit, offset } = getPaginationParams(searchParams);
    const search = searchParams.get('search')?.toLowerCase() || '';
    const statusFilter = searchParams.get('status') || '';

    // Get all unique users from certificates
    const certificatesSnapshot = await db.collection('certificates').get();
    const templatesSnapshot = await db.collection('templates').get();
    const suspendedSnapshot = await db.collection('suspendedUsers').get();

    const suspendedEmails = new Set(suspendedSnapshot.docs.map(doc => doc.data().email?.toLowerCase()));

    // Aggregate user data
    const usersMap = new Map();

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

    let users = Array.from(usersMap.values());

    if (search) {
      users = users.filter(user =>
        user.email.includes(search) ||
        user.displayName?.toLowerCase().includes(search)
      );
    }

    if (statusFilter) {
      users = users.filter(user => user.status === statusFilter);
    }

    users.sort((a, b) => {
      if (!a.lastActivity) return 1;
      if (!b.lastActivity) return -1;
      return b.lastActivity - a.lastActivity;
    });

    const totalCount = users.length;
    users = users.slice(offset, offset + limit);

    users = users.map(user => ({
      ...user,
      lastActivity: user.lastActivity?.toISOString() || null,
      firstSeen: user.firstSeen?.toISOString() || null,
    }));

    await logAdminAction(AUDIT_TYPES.VIEW_USERS, auth.session.email, {
      page, limit, search: search || undefined, statusFilter: statusFilter || undefined,
      resultCount: users.length,
    });

    return NextResponse.json({
      success: true,
      users,
      pagination: {
        page, limit, totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: offset + limit < totalCount,
      },
    });
  } catch (error) {
    console.error('Admin users list error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch users' }, { status: 500 });
  }
}

/**
 * POST /api/admin/users
 * Manage user status (suspend/unsuspend)
 */
export async function POST(request) {
  const auth = await requireAdminAuth(request, { requireCSRF: true });
  if (!auth.authorized) return auth.response;

  try {
    const db = getAdminDb();
    const body = await request.json();
    const { email, action, reason } = body;

    if (!email || !action) {
      return NextResponse.json({ success: false, error: 'Email and action are required' }, { status: 400 });
    }

    if (!['suspend', 'unsuspend'].includes(action)) {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }

    if (action === 'suspend' && !reason) {
      return NextResponse.json({ success: false, error: 'Reason is required for suspension' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase();
    const suspendedRef = db.collection('suspendedUsers').doc(normalizedEmail);

    if (action === 'suspend') {
      await suspendedRef.set({
        email: normalizedEmail,
        reason,
        suspendedBy: auth.session.email,
        suspendedAt: new Date(),
      });

      await logAdminAction(AUDIT_TYPES.SUSPEND_USER, auth.session.email, {
        targetEmail: normalizedEmail,
        reason,
      });

      return NextResponse.json({ success: true, message: `User ${email} has been suspended` });
    } else {
      await suspendedRef.delete();

      await logAdminAction(AUDIT_TYPES.UNSUSPEND_USER, auth.session.email, {
        targetEmail: normalizedEmail,
      });

      return NextResponse.json({ success: true, message: `User ${email} has been unsuspended` });
    }
  } catch (error) {
    console.error('Admin user action error:', error);
    return NextResponse.json({ success: false, error: 'Action failed' }, { status: 500 });
  }
}
