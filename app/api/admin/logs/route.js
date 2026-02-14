// app/api/admin/logs/route.js
// Admin API for audit logs

import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { requireAdminAuth, getPaginationParams } from '@/lib/admin-middleware';
import { AUDIT_TYPES } from '@/lib/admin-config';

/**
 * GET /api/admin/logs
 * Get audit logs
 */
export async function GET(request) {
  const auth = await requireAdminAuth(request);
  if (!auth.authorized) return auth.response;

  try {
    const db = getAdminDb();
    const { searchParams } = new URL(request.url);
    const { page, limit, offset } = getPaginationParams(searchParams);
    const actionFilter = searchParams.get('action') || '';
    const adminFilter = searchParams.get('admin')?.toLowerCase() || '';

    const logsSnapshot = await db.collection('adminAuditLogs').get();

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

    if (actionFilter) {
      logs = logs.filter(log => log.action === actionFilter);
    }

    if (adminFilter) {
      logs = logs.filter(log => log.adminEmail?.toLowerCase().includes(adminFilter));
    }

    logs.sort((a, b) => {
      if (!a.timestamp) return 1;
      if (!b.timestamp) return -1;
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    const totalCount = logs.length;
    logs = logs.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      logs,
      pagination: {
        page, limit, totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: offset + limit < totalCount,
      },
      actionTypes: Object.values(AUDIT_TYPES),
    });
  } catch (error) {
    console.error('Admin logs error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch logs' }, { status: 500 });
  }
}
