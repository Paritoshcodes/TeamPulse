import nodemailer from 'nodemailer';
import { EventEmitter } from 'events';

// Lightweight email service with optional Bull+Redis queue when REDIS_URL is set.
// In test/dev (no REDIS_URL) it uses an in-memory immediate queue so no external
// dependency (Redis) is required for local runs or CI.

let _transporter = null;
let _testAccount = null;
const emitter = new EventEmitter(); // emit 'sent' events useful for tests

function envBool(v) {
  return String(v || '').toLowerCase() === 'true';
}

async function createTransporter() {
  if (_transporter) return _transporter;

  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    _transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587,
      secure: envBool(process.env.SMTP_SECURE),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      pool: true,
      maxConnections: 5,
      connectionTimeout: 10_000,
    });
    return _transporter;
  }

  // fallback to Ethereal for dev/test
  if (!_testAccount) {
    _testAccount = await nodemailer.createTestAccount();
  }
  _transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
      user: _testAccount.user,
      pass: _testAccount.pass,
    },
  });
  return _transporter;
}

async function sendMailNow(mail) {
  const transporter = await createTransporter();
  const info = await transporter.sendMail(mail);
  // log preview URL for Ethereal (or other transports that support it)
  try {
    const url = nodemailer.getTestMessageUrl(info);
    if (url) console.log('[Mail] Preview URL:', url);
  } catch (_) { }
  // Emit for tests to know mail was sent
  emitter.emit('sent', { mail, info });
  return info;
}

// In-memory queue (used when REDIS_URL not set) with simple retry/backoff.
const inMemoryQueue = {
  async add(job, opts = { attempts: 3 }) {
    // Process immediately but return a promise that resolves when processed
    const attemptSend = async (attempt = 1) => {
      try {
        const info = await sendMailNow(job);
        return info;
      } catch (err) {
        if (attempt < (opts.attempts || 1)) {
          const backoff = 100 * Math.pow(2, attempt - 1);
          await new Promise((r) => setTimeout(r, backoff));
          return attemptSend(attempt + 1);
        }
        throw err;
      }
    };
    return attemptSend();
  },
};

let bullQueue = null;
let usingBull = false;
if (process.env.REDIS_URL) {
  try {
    const Queue = await import('bull'); // dynamic import to avoid requiring Redis in dev if not configured
    // Bull v4 uses default export
    const q = new Queue.default('email', process.env.REDIS_URL);
    q.process(async (job) => {
      await sendMailNow(job.data);
    });
    bullQueue = q;
    usingBull = true;
  } catch (e) {
    console.warn('Failed to initialize Bull queue for emails (REDIS_URL set?):', e.message || e);
    usingBull = false;
  }
}

export async function enqueueMail(mail, options = { attempts: 3 }) {
  if (usingBull && bullQueue) {
    return bullQueue.add(mail, { attempts: options.attempts || 3 });
  }
  return inMemoryQueue.add(mail, options);
}

/**
 * Create a branded email template with HTML and plain text versions
 * @param {string} title - Email title
 * @param {string} htmlContent - HTML content for email body
 * @param {string} textContent - Plain text content for email body
 * @returns {object} Object with html and text properties
 */
function createEmailTemplate(title, htmlContent, textContent) {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
      background-color: #f5f5f5;
      line-height: 1.6;
    }
    .email-container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    .email-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 20px;
      text-align: center;
      color: #ffffff;
    }
    .email-header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
      letter-spacing: -0.5px;
    }
    .email-body {
      padding: 40px 30px;
      color: #333333;
    }
    .email-body h2 {
      margin: 0 0 20px 0;
      font-size: 20px;
      font-weight: 600;
      color: #1f2937;
    }
    .email-body p {
      margin: 0 0 15px 0;
      color: #4b5563;
      font-size: 16px;
    }
    .otp-container {
      background-color: #f9fafb;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      padding: 30px;
      text-align: center;
      margin: 30px 0;
    }
    .otp-code {
      font-size: 36px;
      font-weight: 700;
      letter-spacing: 8px;
      color: #667eea;
      font-family: 'Courier New', monospace;
      margin: 10px 0;
    }
    .otp-label {
      font-size: 14px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 10px;
    }
    .warning {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .warning p {
      margin: 0;
      color: #92400e;
      font-size: 14px;
    }
    .email-footer {
      background-color: #f9fafb;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
    }
    .email-footer p {
      margin: 5px 0;
      color: #6b7280;
      font-size: 14px;
    }
    .email-footer a {
      color: #667eea;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <h1>TeamPulse</h1>
    </div>
    <div class="email-body">
      ${htmlContent}
    </div>
    <div class="email-footer">
      <p>&copy; ${new Date().getFullYear()} TeamPulse. All rights reserved.</p>
      <p>This is an automated message, please do not reply.</p>
    </div>
  </div>
</body>
</html>`;

  return { html, text: textContent };
}

export async function sendOtpEmail(toEmail, otp) {
  const expiryMinutes = process.env.OTP_EXPIRY_MINUTES || 10;

  // HTML content for the email
  const htmlContent = `
    <h2>Verify Your Email Address</h2>
    <p>Thank you for signing up with TeamPulse! To complete your registration, please verify your email address using the code below:</p>
    
    <div class="otp-container">
      <div class="otp-label">Your Verification Code</div>
      <div class="otp-code">${otp}</div>
    </div>
    
    <p>Enter this code in the verification page to activate your account.</p>
    
    <div class="warning">
      <p><strong>⏱️ Important:</strong> This code will expire in ${expiryMinutes} minutes.</p>
    </div>
    
    <p>If you didn't request this code, please ignore this email or contact support if you have concerns.</p>
  `;

  // Plain text version for email clients that don't support HTML
  const textContent = `TeamPulse - Email Verification

Your verification code is: ${otp}

This code will expire in ${expiryMinutes} minutes.

Enter this code in the verification page to activate your account.

If you didn't request this code, please ignore this email.

---
© ${new Date().getFullYear()} TeamPulse. All rights reserved.
This is an automated message, please do not reply.`;

  const template = createEmailTemplate('Verify Your Email', htmlContent, textContent);

  const mail = {
    from: process.env.FROM_EMAIL || 'no-reply@teampulse.local',
    to: toEmail,
    subject: 'Verify your TeamPulse account',
    html: template.html,
    text: template.text,
  };

  // enqueue and don't block
  return enqueueMail(mail).catch((err) => {
    // bubble error to caller if they want to know; callers may choose to ignore
    throw err;
  });
}

export async function sendPasswordResetEmail(toEmail, otp) {
  const expiryMinutes = process.env.RESET_OTP_EXPIRY_MINUTES || 10;

  const htmlContent = `
    <h2>Reset Your Password</h2>
    <p>We received a request to reset your TeamPulse password. Use the code below to continue:</p>

    <div class="otp-container">
      <div class="otp-label">Your Reset Code</div>
      <div class="otp-code">${otp}</div>
    </div>

    <p>If you did not request a password reset, you can safely ignore this email.</p>

    <div class="warning">
      <p><strong>Notice:</strong> This code will expire in ${expiryMinutes} minutes.</p>
    </div>
  `;

  const textContent = `TeamPulse - Password Reset

Your password reset code is: ${otp}

This code will expire in ${expiryMinutes} minutes.

If you did not request a password reset, you can ignore this email.

---
© ${new Date().getFullYear()} TeamPulse. All rights reserved.
This is an automated message, please do not reply.`;

  const template = createEmailTemplate('Reset Your Password', htmlContent, textContent);

  const mail = {
    from: process.env.FROM_EMAIL || 'no-reply@teampulse.local',
    to: toEmail,
    subject: 'Reset your TeamPulse password',
    html: template.html,
    text: template.text,
  };

  return enqueueMail(mail).catch((err) => {
    throw err;
  });
}

// Expose sent event for tests
export function onMailSent(cb) {
  emitter.on('sent', cb);
}

export default {
  enqueueMail,
  sendMailNow,
  sendOtpEmail,
  sendPasswordResetEmail,
  onMailSent,
};
