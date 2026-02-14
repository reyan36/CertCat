// app/api/admin/certificates/route.js
// Admin API for certificate management

import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { requireAdminAuth, getPaginationParams } from '@/lib/admin-middleware';
import { logAdminAction } from '@/lib/admin-auth';
import { AUDIT_TYPES } from '@/lib/admin-config';

/**
 * GET /api/admin/certificates
 * List all certificates with filtering
 */
export async function GET(request) {
  const auth = await requireAdminAuth(request);
  if (!auth.authorized) return auth.response;

  try {
    const db = getAdminDb();
    const { searchParams } = new URL(request.url);
    const { page, limit, offset } = getPaginationParams(searchParams);
    const search = searchParams.get('search')?.toLowerCase() || '';
    const organizerFilter = searchParams.get('organizer')?.toLowerCase() || '';
    const isTestFilter = searchParams.get('isTest');

    const certificatesSnapshot = await db.collection('certificates').get();

    let certificates = certificatesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        certificateId: data.certificateId,
        recipientName: data.name,
        recipientEmail: data.email,
        eventName: data.eventName,
        organizer: data.organizer,
        organizerEmail: data.organizerEmail,
        issuedAt: data.issuedAt?.toDate?.()?.toISOString() || null,
        isTest: data.isTest || false,
        expiresAt: data.expiresAt?.toDate?.()?.toISOString() || null,
      };
    });

    if (search) {
      certificates = certificates.filter(cert =>
        cert.recipientName?.toLowerCase().includes(search) ||
        cert.recipientEmail?.toLowerCase().includes(search) ||
        cert.eventName?.toLowerCase().includes(search) ||
        cert.certificateId?.toLowerCase().includes(search)
      );
    }

    if (organizerFilter) {
      certificates = certificates.filter(cert =>
        cert.organizerEmail?.toLowerCase().includes(organizerFilter)
      );
    }

    if (isTestFilter !== null && isTestFilter !== '') {
      const showTest = isTestFilter === 'true';
      certificates = certificates.filter(cert => cert.isTest === showTest);
    }

    certificates.sort((a, b) => {
      if (!a.issuedAt) return 1;
      if (!b.issuedAt) return -1;
      return new Date(b.issuedAt) - new Date(a.issuedAt);
    });

    const totalCount = certificates.length;
    certificates = certificates.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      certificates,
      pagination: {
        page, limit, totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: offset + limit < totalCount,
      },
    });
  } catch (error) {
    console.error('Admin certificates list error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch certificates' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/certificates
 * Delete a certificate
 */
export async function DELETE(request) {
  const auth = await requireAdminAuth(request, { requireCSRF: true });
  if (!auth.authorized) return auth.response;

  try {
    const db = getAdminDb();
    const body = await request.json();
    const { certificateId, reason } = body;

    if (!certificateId) {
      return NextResponse.json({ success: false, error: 'Certificate ID is required' }, { status: 400 });
    }

    if (!reason) {
      return NextResponse.json({ success: false, error: 'Reason is required for deletion' }, { status: 400 });
    }

    const certDoc = await db.collection('certificates').doc(certificateId).get();
    if (!certDoc.exists) {
      return NextResponse.json({ success: false, error: 'Certificate not found' }, { status: 404 });
    }

    const certData = certDoc.data();

    await db.collection('certificates').doc(certificateId).delete();

    await logAdminAction(AUDIT_TYPES.DELETE_CERTIFICATE, auth.session.email, {
      certificateId,
      recipientName: certData.name,
      recipientEmail: certData.email,
      eventName: certData.eventName,
      organizerEmail: certData.organizerEmail,
      reason,
    });

    return NextResponse.json({ success: true, message: 'Certificate deleted successfully' });
  } catch (error) {
    console.error('Admin certificate delete error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete certificate' }, { status: 500 });
  }
}
