// app/api/generate/route.js
// Certificate generation with multi-provider email and custom message support

import { db } from '@/lib/firebase';
import { collection, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { sendEmail, canSend, getCapacity, generateCertificateEmail } from '@/lib/email-service';
import QRCode from 'qrcode';

export async function POST(req) {
  console.log('=== Certificate Generation Started ===');

  try {
    const {
      participants,
      eventName,
      organizerName,
      organizerEmail,
      templateData,
      customMessage = '' // NEW: Custom message from organization
    } = await req.json();

    if (!participants || !eventName || !templateData) {
      return Response.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // Filter valid participants
    const validParticipants = participants.filter(p => p.name?.trim() && p.email?.trim());
    console.log(`📋 ${validParticipants.length} participants for: ${eventName}`);
    if (customMessage) console.log(`💬 Custom message: "${customMessage.slice(0, 50)}..."`);

    // Check email capacity
    const capacity = getCapacity();
    console.log(`📧 Email capacity: ${capacity.total.remaining}/${capacity.total.limit}`);

    if (!canSend(validParticipants.length)) {
      return Response.json({
        success: false,
        error: `Need ${validParticipants.length} emails but only ${capacity.total.remaining} available today.`,
        capacity,
      }, { status: 429 });
    }

    const batch = writeBatch(db);
    const certificates = [];
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Create certificates
    for (const participant of validParticipants) {
      const name = participant.name.trim();
      const email = participant.email.trim();

      const certRef = doc(collection(db, 'certificates'));
      const certificateId = certRef.id;
      const verificationUrl = `${appUrl}/verify/${certificateId}`;

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

      // Process template elements
      const processedElements = (templateData.elements || []).map(el => {
        if (el.type === 'text') {
          let value = el.value || '';
          value = value.replace(/\{name\}/gi, name);
          value = value.replace(/\{event\}/gi, eventName);
          value = value.replace(/\{date\}/gi, currentDate);
          value = value.replace(/\{id\}/gi, certificateId);
          value = value.replace(/\{organizer\}/gi, organizerName || '');
          return { ...el, value };
        }
        if (el.type === 'qrcode') {
          return { ...el, qrDataUrl, qrUrl: verificationUrl };
        }
        return el;
      });

      batch.set(certRef, {
        certificateId, name, email, eventName,
        organizer: organizerName,
        organizerEmail,
        templateUrl: templateData.imageUrl,
        elements: processedElements,
        verificationUrl,
        customMessage, // Store custom message with certificate
        issuedAt: serverTimestamp(),
      });

      certificates.push({ id: certificateId, name, email, verificationUrl });
    }

    await batch.commit();
    console.log(`✅ ${certificates.length} certificates saved`);

    // Send emails
    const emailResults = {
      sent: 0,
      failed: 0,
      errors: [],
      providers: {},
    };

    for (let i = 0; i < certificates.length; i++) {
      const cert = certificates[i];

      try {
        // Generate email with custom message
        const emailHtml = generateCertificateEmail({
          name: cert.name,
          eventName,
          certificateId: cert.id,
          verificationUrl: cert.verificationUrl,
          organizerName,
          customMessage, // NEW: Include custom message in email
        });

        const result = await sendEmail({
          to: cert.email,
          subject: `🎉 Your Certificate for ${eventName}`,
          html: emailHtml,
          senderName: organizerName || 'CertCat',
        });

        emailResults.sent++;
        emailResults.providers[result.provider] = (emailResults.providers[result.provider] || 0) + 1;

        if ((i + 1) % 10 === 0) {
          console.log(`📧 Progress: ${i + 1}/${certificates.length}`);
        }

        await new Promise(r => setTimeout(r, 200));

      } catch (error) {
        console.error(`❌ ${cert.email}:`, error.message);
        emailResults.failed++;
        emailResults.errors.push({ email: cert.email, error: error.message });

        if (error.message.includes('exhausted')) break;
      }
    }

    console.log('=== Generation Complete ===');
    console.log(`Certs: ${certificates.length}, Sent: ${emailResults.sent}, Failed: ${emailResults.failed}`);
    console.log('Providers:', emailResults.providers);

    return Response.json({
      success: true,
      count: certificates.length,
      emails: {
        sent: emailResults.sent,
        failed: emailResults.failed,
        providers: emailResults.providers,
      },
      remainingCapacity: getCapacity().total.remaining,
    });

  } catch (error) {
    console.error('❌ API Error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}