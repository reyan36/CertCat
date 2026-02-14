// app/api/admin/users/[email]/route.js
// Admin API for individual user details

import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit as firestoreLimit,
  doc,
  getDoc,
} from 'firebase/firestore';
import { requireAdminAuth } from '@/lib/admin-middleware';
import { logAdminAction } from '@/lib/admin-auth';
import { AUDIT_TYPES } from '@/lib/admin-config';

/**
 * GET /api/admin/users/[email]
 * Get detailed information about a specific user
 */
export async function GET(request, { params }) {
  // Authenticate admin
  const auth = await requireAdminAuth(request);
  if (!auth.authorized) return auth.response;

  try {
    const { email } = await params;
    const decodedEmail = decodeURIComponent(email).toLowerCase();

    // Check if user is suspended
    const suspendedDoc = await getDoc(doc(db, 'suspendedUsers', decodedEmail));
    const isSuspended = suspendedDoc.exists();
    const suspensionData = isSuspended ? suspendedDoc.data() : null;

    // Get user's certificates
    const certificatesRef = collection(db, 'certificates');
    const certQuery = query(
      certificatesRef,
      where('organizerEmail', '==', decodedEmail),
      orderBy('issuedAt', 'desc'),
      firestoreLimit(50)
    );
    const certificatesSnapshot = await getDocs(certQuery);

    const certificates = certificatesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        recipientName: data.name,
        recipientEmail: data.email,
        eventName: data.eventName,
        issuedAt: data.issuedAt?.toDate?.()?.toISOString() || null,
        isTest: data.isTest || false,
      };
    });

    // Get user's templates
    const templatesRef = collection(db, 'templates');
    const templatesSnapshot = await getDocs(templatesRef);

    // We need to filter templates - they're stored by userId, not email
    // For now, we'll count all templates and note this limitation
    const allTemplates = templatesSnapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      userId: doc.data().userId,
    }));

    // Calculate stats
    const stats = {
      totalCertificates: certificates.length,
      testCertificates: certificates.filter(c => c.isTest).length,
      uniqueEvents: [...new Set(certificates.map(c => c.eventName))].length,
      uniqueRecipients: [...new Set(certificates.map(c => c.recipientEmail))].length,
    };

    // Get activity timeline (last 10 certificates)
    const recentActivity = certificates.slice(0, 10);

    // Log the action
    await logAdminAction(AUDIT_TYPES.VIEW_USER, auth.session.email, {
      targetEmail: decodedEmail,
    });

    return NextResponse.json({
      success: true,
      user: {
        email: decodedEmail,
        status: isSuspended ? 'suspended' : 'active',
        suspension: suspensionData ? {
          reason: suspensionData.reason,
          suspendedBy: suspensionData.suspendedBy,
          suspendedAt: suspensionData.suspendedAt?.toDate?.()?.toISOString() || null,
        } : null,
        stats,
        recentCertificates: recentActivity,
        // Note: template count may not be accurate without email-to-userId mapping
      },
    });
  } catch (error) {
    console.error('Admin user detail error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user details' },
      { status: 500 }
    );
  }
}
