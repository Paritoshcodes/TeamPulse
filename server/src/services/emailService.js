import { Resend } from 'resend';
import { EventEmitter } from 'events';

const emitter = new EventEmitter();

// -------- RESEND CLIENT --------
function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('Missing required env: RESEND_API_KEY');
  return new Resend(apiKey);
}

// -------- HELPERS --------
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// -------- SEND MAIL VIA RESEND --------
async function sendMailNow(mail) {
  const resend = getResend();
  const { data, error } = await resend.emails.send({
    from: mail.from,
    to: Array.isArray(mail.to) ? mail.to : [mail.to],
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
  });

  if (error) {
    throw new Error(error.message || JSON.stringify(error));
  }

  console.log('[Mail Sent]', {
    to: mail.to,
    subject: mail.subject,
    messageId: data?.id,
  });

  emitter.emit('sent', { mail, info: data });
  return data;
}

// -------- SIMPLE RETRY QUEUE --------
async function enqueueMail(mail, attempts = 3) {
  for (let i = 1; i <= attempts; i++) {
    try {
      return await sendMailNow(mail);
    } catch (err) {
      if (i === attempts) throw err;
      const backoff = 200 * Math.pow(2, i);
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
}

// -------- EMAIL TEMPLATE --------
function createEmailTemplate({ title, preheader, accentColor = '#6366f1', badge, heading, subheading, otpCode, expiryMinutes, footerNote }) {
  const year = new Date().getFullYear();

  const otpDigits = otpCode
    ? String(otpCode).split('').map(d => `
        <td style="padding:0 4px;">
          <div style="
            width:48px;
            height:60px;
            background:#1e1e2e;
            border:1.5px solid #2e2e42;
            border-radius:10px;
            font-family:'Courier New',monospace;
            font-size:28px;
            font-weight:700;
            color:#e2e8f0;
            text-align:center;
            line-height:60px;
            letter-spacing:0;
          ">${d}</div>
        </td>`).join('')
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="dark" />
  <title>${title}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#0f0f17;font-family:Arial,sans-serif;">

  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">
    ${preheader}&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0f0f17;min-height:100vh;">
    <tr>
      <td align="center" style="padding:40px 16px;">

        <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">

          <tr>
            <td align="center" style="padding-bottom:28px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="
                    background:linear-gradient(135deg,${accentColor},#a855f7);
                    border-radius:14px;
                    padding:10px 20px;
                  ">
                    <span style="
                      font-family:Arial,sans-serif;
                      font-size:20px;
                      font-weight:900;
                      color:#ffffff;
                      letter-spacing:-0.5px;
                    ">⚡ TeamPulse</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="
              background:linear-gradient(160deg,#16162a 0%,#12121f 100%);
              border-radius:20px;
              border:1px solid #2a2a3e;
              overflow:hidden;
            ">

              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="
                    height:4px;
                    background:linear-gradient(90deg,${accentColor},#a855f7,#ec4899);
                    border-radius:20px 20px 0 0;
                  "></td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:44px 48px 40px;">

                    ${badge ? `
                    <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
                      <tr>
                        <td style="
                          background:rgba(99,102,241,0.12);
                          border:1px solid rgba(99,102,241,0.25);
                          border-radius:100px;
                          padding:5px 14px;
                        ">
                          <span style="font-size:12px;font-weight:600;color:${accentColor};letter-spacing:0.8px;text-transform:uppercase;">${badge}</span>
                        </td>
                      </tr>
                    </table>` : ''}

                    <h1 style="
                      margin:0 0 10px;
                      font-size:28px;
                      font-weight:800;
                      color:#f1f5f9;
                      letter-spacing:-0.5px;
                      line-height:1.2;
                    ">${heading}</h1>

                    <p style="
                      margin:0 0 36px;
                      font-size:15px;
                      color:#94a3b8;
                      line-height:1.6;
                    ">${subheading}</p>

                    ${otpCode ? `
                    <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
                      <tr>${otpDigits}</tr>
                    </table>

                    <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
                      <tr>
                        <td style="
                          background:#1e1e2e;
                          border:1px solid #2e2e42;
                          border-radius:8px;
                          padding:10px 16px;
                        ">
                          <span style="font-size:13px;color:#64748b;">⏱&nbsp;</span>
                          <span style="font-size:13px;color:#94a3b8;">Expires in&nbsp;</span>
                          <span style="font-size:13px;font-weight:700;color:#e2e8f0;">${expiryMinutes} minutes</span>
                        </td>
                      </tr>
                    </table>` : ''}

                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
                      <tr>
                        <td style="height:1px;background:linear-gradient(90deg,transparent,#2a2a3e,transparent);"></td>
                      </tr>
                    </table>

                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="
                          background:rgba(239,68,68,0.06);
                          border:1px solid rgba(239,68,68,0.12);
                          border-radius:10px;
                          padding:14px 16px;
                        ">
                          <p style="margin:0;font-size:13px;color:#f87171;line-height:1.5;">
                            🔒&nbsp;<strong>Never share this code.</strong> TeamPulse will never ask for it via phone or chat.
                          </p>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <tr>
            <td align="center" style="padding:28px 0 0;">
              <p style="margin:0 0 6px;font-size:12px;color:#3d3d56;">
                © ${year} TeamPulse · Automated message, do not reply
              </p>
              ${footerNote ? `<p style="margin:0;font-size:12px;color:#3d3d56;">${footerNote}</p>` : ''}
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}

// -------- OTP EMAIL --------
export async function sendOtpEmail(toEmail, otp) {
  const expiryMinutes = process.env.OTP_EXPIRY_MINUTES || 10;
  const safeOtp = escapeHtml(String(otp));
  const safeExpiry = escapeHtml(String(expiryMinutes));

  const html = createEmailTemplate({
    title: 'Verify Your Email — TeamPulse',
    preheader: `Your verification code is ${safeOtp}. Valid for ${safeExpiry} minutes.`,
    accentColor: '#6366f1',
    badge: 'Email Verification',
    heading: 'Verify your email',
    subheading: 'Enter the code below in TeamPulse to complete your sign-in. Each code is single-use.',
    otpCode: safeOtp,
    expiryMinutes: safeExpiry,
    footerNote: "If you didn't request this, you can safely ignore this email.",
  });

  const mail = {
    from: 'TeamPulse <noreply@paritoshsingh.me>',
    to: toEmail,
    subject: '🔐 Your TeamPulse Verification Code',
    html,
    text: `Your TeamPulse OTP is ${otp}. It expires in ${expiryMinutes} minutes. Never share this code.`,
  };

  try {
    const result = await enqueueMail(mail);
    console.log(`[OTP] Email sent to ${toEmail}`);
    return result;
  } catch (err) {
    console.error(`[OTP] Failed: ${err.message || err}`);
    throw err;
  }
}

// -------- PASSWORD RESET --------
export async function sendPasswordResetEmail(toEmail, otp) {
  const expiryMinutes = process.env.RESET_OTP_EXPIRY_MINUTES || 10;
  const safeOtp = escapeHtml(String(otp));
  const safeExpiry = escapeHtml(String(expiryMinutes));

  const html = createEmailTemplate({
    title: 'Reset Your Password — TeamPulse',
    preheader: `Your password reset code is ${safeOtp}. Valid for ${safeExpiry} minutes.`,
    accentColor: '#f59e0b',
    badge: 'Password Reset',
    heading: 'Reset your password',
    subheading: 'Use the code below to reset your TeamPulse password. If you did not request this, no action is needed.',
    otpCode: safeOtp,
    expiryMinutes: safeExpiry,
    footerNote: "Didn't request a reset? Your account is safe — just ignore this.",
  });

  const mail = {
    from: 'TeamPulse <noreply@paritoshsingh.me>',
    to: toEmail,
    subject: '🔑 Reset Your TeamPulse Password',
    html,
    text: `Your TeamPulse password reset code is ${otp}. Expires in ${expiryMinutes} minutes.`,
  };

  try {
    const result = await enqueueMail(mail);
    console.log(`[OTP] Email sent to ${toEmail}`);
    return result;
  } catch (err) {
    console.error(`[OTP] Failed: ${err.message || err}`);
    throw err;
  }
}

// -------- EVENTS --------
export function onMailSent(cb) {
  emitter.on('sent', cb);
}

export default {
  sendOtpEmail,
  sendPasswordResetEmail,
  onMailSent,
};