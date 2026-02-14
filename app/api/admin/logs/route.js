// app/api/admin/logs/route.js
// Admin API for audit logs

import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, orderBy, limit as firestoreLimit } from 'firebase/firestore';
import { requireAdminAuth, getPaginationParams } from '@/lib/admin-middleware';
import { AUDIT_TYPES } from '@/lib/admin-config';

/**
 * GET /api/admin/logs
 * Get audit logs
 *
 * Query params:
 * - page: Page number
 * - limit: Items per page (max 100)
 * - action: Filter by action type
 * - admin: Filter by admin email
 */
export async function GET(request) {
  // Authenticate admin
  const auth = await requireAdminAuth(request);
  if (!auth.authorized) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, offset } = getPaginationParams(searchParams);
    const actionFilter = searchParams.get('action') || '';
    const adminFilter = searchParams.get('admin')?.toLowerCase() || '';

    // Fetch audit logs
    const logsRef = collection(db, 'adminAuditLogs');
    const logsSnapshot = await getDocs(logsRef);

    let logs = logsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        action: data.action,
        adminEmail: data.adminEmail,
        details: data.details,
        timestamp: data.timestamp?.toDate?.()?.toISOString() || data.createdAt || null,
      };
    });

    // Apply filters
    if (actionFilter) {
      logs = logs.filter(log => log.action === actionFilter);
    }

    if (adminFilter) {
      logs = logs.filter(log => log.adminEmail?.toLowerCase().includes(adminFilter));
    }

    // Sort by timestamp (newest first)
    logs.sort((a, b) => {
      if (!a.timestamp) return 1;
      if (!b.timestamp) return -1;
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    // Get total count
    const totalCount = logs.length;

    // Apply pagination
    logs = logs.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      logs,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: offset + limit < totalCount,
      },
      actionTypes: Object.values(AUDIT_TYPES),
    });
  } catch (error) {
    console.error('Admin logs error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch logs' },
      { status: 500 }
    );
  }
}
