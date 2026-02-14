// app/api/test-email/route.js
// Test Gmail email provider

import nodemailer from 'nodemailer';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

function isGmailConfigured() {
  return !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

function createTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

/**
 * GET - Check Gmail provider status
 */
export async function GET(request) {
  const results = {};

  if (!isGmailConfigured()) {
    results.gmail = {
      name: 'Gmail',
      status: 'not_configured',
      message: 'Missing environment variables',
      configured: false,
    };
  } else {
    try {
      const transporter = createTransporter();
      await transporter.verify();
      results.gmail = {
        name: 'Gmail',
        status: 'verified',
        message: 'SMTP connection successful',
        configured: true,
        from: process.env.GMAIL_USER,
      };
    } catch (error) {
      results.gmail = {
        name: 'Gmail',
        status: 'error',
        message: error.message,
        configured: true,
        from: process.env.GMAIL_USER,
        help: "Make sure you're using an App Password, not your regular password. Get one at: https://myaccount.google.com/apppasswords",
      };
    }
  }

  const configured = results.gmail?.configured ? 1 : 0;
  const verified = results.gmail?.status === 'verified' ? 1 : 0;

  return Response.json({
    success: true,
    timestamp: new Date().toISOString(),
    summary: {
      total: 1,
      configured,
      verified,
      message: verified > 0
        ? '✅ Gmail is ready to send'
        : '❌ Gmail is not configured correctly',
    },
    providers: results,
  });
}

/**
 * POST - Send a test email via Gmail
 */
export async function POST(request) {
  try {
    const { to, userId } = await request.json();

    if (!to) {
      return Response.json({
        success: false,
        error: 'Missing required field: to'
      }, { status: 400 });
    }

    // Rate limiting: 5 test emails per user per day
    if (userId) {
      const today = new Date().toDateString();
      const rateLimitRef = doc(db, 'testEmailLimits', userId);
      const rateLimitDoc = await getDoc(rateLimitRef);

      let testCount = 0;
      if (rateLimitDoc.exists()) {
        const data = rateLimitDoc.data();
        if (data.date === today) {
          testCount = data.count || 0;
        }
      }

      if (testCount >= 5) {
        return Response.json({
          success: false,
          error: 'Daily test email limit reached (5/day). Try again tomorrow.',
          remaining: 0,
        }, { status: 429 });
      }

      // Update count
      await setDoc(rateLimitRef, { date: today, count: testCount + 1 });
    }

    if (!isGmailConfigured()) {
      return Response.json({
        success: false,
        error: 'Gmail is not configured. Add GMAIL_USER and GMAIL_APP_PASSWORD to your .env.local file.',
        help: "Required: GMAIL_USER, GMAIL_APP_PASSWORD. Get an App Password at: https://myaccount.google.com/apppasswords",
      }, { status: 400 });
    }

    // Send test email
    const testHtml = generateTestEmailHTML();
    const transporter = createTransporter();

    await transporter.sendMail({
      from: `"CertCat Test" <${process.env.GMAIL_USER}>`,
      to,
      subject: '✅ CertCat Test Email - Gmail',
      html: testHtml,
    });

    return Response.json({
      success: true,
      message: 'Test email sent via Gmail!',
      provider: 'Gmail',
      to,
      remaining: userId ? 4 - (await getTestCount(userId)) : null,
    });

  } catch (error) {
    console.error('Test email error:', error);
    return Response.json({
      success: false,
      error: error.message,
      help: "Check your Gmail credentials. Make sure you're using an App Password, not your regular password.",
    }, { status: 500 });
  }
}

async function getTestCount(userId) {
  const today = new Date().toDateString();
  const rateLimitRef = doc(db, 'testEmailLimits', userId);
  const rateLimitDoc = await getDoc(rateLimitRef);

  if (rateLimitDoc.exists()) {
    const data = rateLimitDoc.data();
    if (data.date === today) {
      return data.count || 0;
    }
  }
  return 0;
}

function generateTestEmailHTML() {
  return `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; margin: 0; padding: 40px 20px;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center">
      <table width="500" style="background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <tr>
          <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px; text-align: center;">
            <h1 style="color: #fff; margin: 0; font-size: 28px;">✅ Test Successful!</h1>
          </td>
        </tr>
        <tr>
          <td style="padding: 40px; text-align: center;">
            <p style="font-size: 18px; color: #333; margin: 0 0 20px;">
              Your <strong style="color: #10b981;">Gmail</strong> email provider is working correctly!
            </p>

            <table width="100%" style="background: #f0fdf4; border-radius: 12px; margin: 20px 0;">
              <tr>
                <td style="padding: 20px;">
                  <p style="font-size: 14px; color: #166534; margin: 0;">
                    📧 Provider: <strong>Gmail</strong><br>
                    🕐 Sent: ${new Date().toLocaleString()}<br>
                    ✅ Status: Verified
                  </p>
                </td>
              </tr>
            </table>

            <p style="font-size: 14px; color: #666; margin: 20px 0 0;">
              Gmail is now ready to send certificate emails!
            </p>
          </td>
        </tr>
        <tr>
          <td style="background: #f8f9fa; padding: 20px; text-align: center;">
            <p style="font-size: 12px; color: #999; margin: 0;">
              Powered by <span style="color: #f97316; font-weight: bold;">CertCat</span>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
