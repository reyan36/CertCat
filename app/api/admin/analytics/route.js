// app/api/admin/analytics/route.js
// Admin API for analytics and metrics

import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { requireAdminAuth } from '@/lib/admin-middleware';
import { logAdminAction } from '@/lib/admin-auth';
import { AUDIT_TYPES } from '@/lib/admin-config';

/**
 * GET /api/admin/analytics
 * Get system analytics and metrics
 */
export async function GET(request) {
  const auth = await requireAdminAuth(request);
  if (!auth.authorized) return auth.response;

  try {
    const db = getAdminDb();
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month';

    const now = new Date();
    let startDate;
    switch (period) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
      default:
        startDate = new Date(0);
    }

    const certificatesSnapshot = await db.collection('certificates').get();
    const templatesSnapshot = await db.collection('templates').get();

    const allCertificates = certificatesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        issuedAt: data.issuedAt?.toDate?.() || null,
        organizerEmail: data.organizerEmail,
        eventName: data.eventName,
        isTest: data.isTest || false,
      };
    });

    const periodCertificates = allCertificates.filter(cert => {
      if (!cert.issuedAt) return false;
      return cert.issuedAt >= startDate;
    });

    const totalCertificates = allCertificates.length;
    const periodCertificateCount = periodCertificates.length;
    const testCertificates = allCertificates.filter(c => c.isTest).length;

    const allOrganizers = new Set(allCertificates.map(c => c.organizerEmail).filter(Boolean));
    const periodOrganizers = new Set(periodCertificates.map(c => c.organizerEmail).filter(Boolean));

    const allEvents = new Set(allCertificates.map(c => c.eventName).filter(Boolean));
    const periodEvents = new Set(periodCertificates.map(c => c.eventName).filter(Boolean));

    const totalTemplates = templatesSnapshot.docs.length;

    const dailyData = {};
    periodCertificates.forEach(cert => {
      if (!cert.issuedAt) return;
      const dateKey = cert.issuedAt.toISOString().split('T')[0];
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = { certificates: 0, events: new Set(), users: new Set() };
      }
      dailyData[dateKey].certificates++;
      if (cert.eventName) dailyData[dateKey].events.add(cert.eventName);
      if (cert.organizerEmail) dailyData[dateKey].users.add(cert.organizerEmail);
    });

    const dailyBreakdown = Object.entries(dailyData)
      .map(([date, data]) => ({
        date,
        certificates: data.certificates,
        events: data.events.size,
        users: data.users.size,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const organizerCounts = {};
    periodCertificates.forEach(cert => {
      if (cert.organizerEmail) {
        organizerCounts[cert.organizerEmail] = (organizerCounts[cert.organizerEmail] || 0) + 1;
      }
    });

    const topOrganizers = Object.entries(organizerCounts)
      .map(([email, count]) => ({ email, certificateCount: count }))
      .sort((a, b) => b.certificateCount - a.certificateCount)
      .slice(0, 10);

    const eventCounts = {};
    periodCertificates.forEach(cert => {
      if (cert.eventName) {
        eventCounts[cert.eventName] = (eventCounts[cert.eventName] || 0) + 1;
      }
    });

    const topEvents = Object.entries(eventCounts)
      .map(([name, count]) => ({ name, certificateCount: count }))
      .sort((a, b) => b.certificateCount - a.certificateCount)
      .slice(0, 10);

    await logAdminAction(AUDIT_TYPES.VIEW_ANALYTICS, auth.session.email, { period });

    return NextResponse.json({
      success: true,
      analytics: {
        overview: {
          totalCertificates,
          periodCertificates: periodCertificateCount,
          testCertificates,
          totalTemplates,
          totalUsers: allOrganizers.size,
          periodUsers: periodOrganizers.size,
          totalEvents: allEvents.size,
          periodEvents: periodEvents.size,
        },
        period,
        periodStart: startDate.toISOString(),
        periodEnd: now.toISOString(),
        dailyBreakdown,
        topOrganizers,
        topEvents,
      },
    });
  } catch (error) {
    console.error('Admin analytics error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
