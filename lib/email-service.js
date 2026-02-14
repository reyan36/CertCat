// lib/email-service.js
// Gmail email service with custom message support

import nodemailer from 'nodemailer';

const DAILY_LIMIT = 500; // Gmail's daily limit

let usage = {
  date: new Date().toDateString(),
  count: 0,
};

function resetIfNewDay() {
  const today = new Date().toDateString();
  if (usage.date !== today) {
    usage = { date: today, count: 0 };
    console.log('📅 Email counter reset');
  }
}

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
 * Send email via Gmail
 */
export async function sendEmail({ to, subject, html, senderName = 'CertCat' }) {
  resetIfNewDay();

  if (!isGmailConfigured()) {
    throw new Error('Gmail is not configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD in .env.local');
  }

  if (usage.count >= DAILY_LIMIT) {
    throw new Error(`Daily email limit reached (${DAILY_LIMIT}). Resets at midnight.`);
  }

  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"${senderName}" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    });

    usage.count++;
    console.log(`✅ Sent via Gmail (${usage.count}/${DAILY_LIMIT})`);
    return { success: true, provider: 'Gmail' };

  } catch (error) {
    console.error('❌ Gmail failed:', error.message);
    throw error;
  }
}

/**
 * Verify Gmail connection
 */
export async function verifyProvider() {
  if (!isGmailConfigured()) {
    return { provider: 'Gmail', status: 'not_configured' };
  }

  try {
    const transporter = createTransporter();
    await transporter.verify();
    return { provider: 'Gmail', status: 'connected' };
  } catch (error) {
    return { provider: 'Gmail', status: 'error', message: error.message };
  }
}

/**
 * Get capacity info
 */
export function getCapacity() {
  resetIfNewDay();

  const configured = isGmailConfigured();
  const remaining = configured ? Math.max(0, DAILY_LIMIT - usage.count) : 0;
  const used = usage.count;
  const limit = configured ? DAILY_LIMIT : 0;
  const percentage = limit > 0 ? Math.round((used / limit) * 100) : 0;

  return {
    date: usage.date,
    providers: {
      Gmail: {
        configured,
        used,
        limit: DAILY_LIMIT,
        remaining,
        status: !configured ? 'not_configured' : usage.count >= DAILY_LIMIT ? 'exhausted' : 'available',
      },
    },
    total: {
      used,
      limit,
      remaining,
      percentage,
    },
    configuredCount: configured ? 1 : 0,
  };
}

export function canSend(count) {
  return getCapacity().total.remaining >= count;
}

/**
 * Generate certificate email HTML with custom message support
 */
export function generateCertificateEmail({
  name,
  eventName,
  certificateId,
  verificationUrl,
  organizerName,
  customMessage = ''
}) {
  const customMessageHTML = customMessage
    ? `<p style="font-size: 15px; color: #555; line-height: 1.6; margin: 24px 0; padding: 20px; background: #fef3c7; border-radius: 12px; border-left: 4px solid #f59e0b;">
        💬 <em>${customMessage}</em>
      </p>`
    : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">

        <!-- Header -->
        <tr>
          <td style="background: linear-gradient(135deg, #f97316, #ea580c); padding: 48px 40px; text-align: center;">
            <h1 style="color: #fff; margin: 0; font-size: 32px;">🎉 Congratulations!</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 12px 0 0; font-size: 16px;">You've earned a certificate</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding: 48px 40px;">
            <p style="font-size: 18px; color: #333; margin: 0 0 24px;">
              Dear <strong>${name}</strong>,
            </p>

            <p style="font-size: 16px; color: #666; margin: 0 0 16px; line-height: 1.6;">
              You have been awarded a certificate for successfully completing
            </p>

            <p style="font-size: 24px; color: #f97316; margin: 0 0 24px; font-weight: 700; text-align: center;">
              ${eventName}
            </p>

            <!-- Custom Message -->
            ${customMessageHTML}

            <!-- Certificate ID -->
            <table width="100%" style="background: #f8f9fa; border-radius: 12px; margin-bottom: 32px;">
              <tr>
                <td style="padding: 20px;">
                  <p style="font-size: 11px; color: #999; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 1px;">Certificate ID</p>
                  <code style="font-size: 14px; color: #333; font-family: monospace;">${certificateId}</code>
                </td>
              </tr>
            </table>

            <!-- CTA -->
            <table width="100%"><tr><td align="center">
              <a href="${verificationUrl}" style="display: inline-block; background: linear-gradient(135deg, #f97316, #ea580c); color: #fff; text-decoration: none; padding: 18px 48px; border-radius: 10px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 14px rgba(249,115,22,0.4);">
                View & Download Certificate
              </a>
            </td></tr></table>

            <p style="font-size: 14px; color: #999; margin: 32px 0 0; text-align: center;">
              💼 Add this credential to your LinkedIn profile!
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background: #f8f9fa; padding: 24px; text-align: center; border-top: 1px solid #eee;">
            <p style="font-size: 14px; color: #666; margin: 0 0 8px;">Issued by <strong>${organizerName}</strong></p>
            <p style="font-size: 12px; color: #999; margin: 0;">Powered by <span style="color: #f97316; font-weight: 600;">CertCat</span></p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}