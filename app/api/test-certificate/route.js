// app/api/test-certificate/route.js
// Creates a temporary test certificate that expires in 1 hour

import { db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import QRCode from 'qrcode';

export async function POST(req) {
  console.log('=== Test Certificate Generation ===');

  try {
    const {
      eventName,
      organizerName,
      templateData,
      testName = 'John Doe (Test)'
    } = await req.json();

    if (!eventName || !templateData) {
      return Response.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Generate a test certificate ID with TEST prefix
    const testId = `TEST-${Date.now().toString(36).toUpperCase()}`;
    const verificationUrl = `${appUrl}/verify/${testId}`;

    // Generate QR Code
    let qrDataUrl = null;
    try {
      qrDataUrl = await QRCode.toDataURL(verificationUrl, {
        width: 300, margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' },
      });
    } catch (e) {
      console.error('QR error:', e.message);
    }

    // Process template elements with test data
    const processedElements = (templateData.elements || []).map(el => {
      if (el.type === 'text') {
        let value = el.value || '';
        value = value.replace(/\{name\}/gi, testName);
        value = value.replace(/\{event\}/gi, eventName);
        value = value.replace(/\{date\}/gi, currentDate);
        value = value.replace(/\{id\}/gi, testId);
        value = value.replace(/\{organizer\}/gi, organizerName || '');
        return { ...el, value };
      }
      if (el.type === 'qrcode') {
        return { ...el, qrDataUrl, qrUrl: verificationUrl };
      }
      return el;
    });

    // Calculate expiration time (1 hour from now)
    const expiresAt = Timestamp.fromDate(new Date(Date.now() + 60 * 60 * 1000));

    // Save test certificate with expiration
    await setDoc(doc(db, 'certificates', testId), {
      certificateId: testId,
      name: testName,
      email: 'test@example.com',
      eventName,
      organizer: organizerName,
      organizerEmail: 'test@example.com',
      templateUrl: templateData.imageUrl,
      elements: processedElements,
      verificationUrl,
      issuedAt: serverTimestamp(),
      isTest: true,
      expiresAt: expiresAt,
    });

    console.log(`✅ Test certificate created: ${testId}`);
    console.log(`⏰ Expires at: ${new Date(Date.now() + 60 * 60 * 1000).toISOString()}`);

    return Response.json({
      success: true,
      certificateId: testId,
      verificationUrl,
      expiresAt: expiresAt.toDate().toISOString(),
      expiresIn: '1 hour',
    });

  } catch (error) {
    console.error('❌ Test Certificate Error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
