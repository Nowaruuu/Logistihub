'use strict';

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host:   process.env.MAIL_HOST || 'smtp.gmail.com',
  port:   parseInt(process.env.MAIL_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

/**
 * Send tenant invitation email.
 * @param {string} toEmail  - Recipient
 * @param {string} company  - Company name
 * @param {string} token    - Signed invitation JWT
 */
async function sendInviteEmail(toEmail, company, token) {
  const link = `${process.env.BASE_URL}/onboarding?invite=${token}`;

  await transporter.sendMail({
    from:    process.env.MAIL_FROM || '"Logistics OS" <noreply@logisticsos.io>',
    to:      toEmail,
    subject: `You've been invited to Logistics OS`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;">
        <h2 style="color:#0f2235;margin-bottom:8px;">Welcome to Logistics OS</h2>
        <p style="color:#475569;line-height:1.6;">
          You've been invited to create an admin workspace for <strong>${company}</strong>.
          Click the button below to choose your subscription and complete your account setup.
        </p>
        <p style="color:#64748b;font-size:13px;margin-top:4px;">
          This link expires in <strong>48 hours</strong>.
        </p>
        <a href="${link}"
           style="display:inline-block;margin-top:24px;padding:12px 28px;background:#0f2235;
                  color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px;">
          Set Up My Workspace
        </a>
        <p style="margin-top:28px;font-size:12px;color:#94a3b8;">
          If you didn't expect this email, you can safely ignore it.<br/>
          Your workspace is private and isolated from all other companies on this platform.
        </p>
      </div>
    `,
  });
}

async function sendRegistrationEmail(email, name, companyName, slug, downloadUrl, emailToken) {
    // Attach the permanent emailToken to the link!
    const emailLink = `https://logistihub.ddns.net/${slug}/get-app?token=${emailToken}`;

    await transporter.sendMail({
      from:    `"${companyName}" <${process.env.MAIL_FROM}>`,
      to:      email,
      subject: `Welcome to ${companyName} — Download Your App`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
          <h2 style="color:#0a1628;">Welcome, ${name}! 👋</h2>
          <p style="color:#475569;">Your account for <strong>${companyName}</strong> has been created successfully.</p>
          <p style="color:#475569;">Download the mobile app to track your shipments:</p>
          <a href="${emailLink}" style="display:inline-block;margin:16px 0;background:#0a1628;color:#fff;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:700;">
            📱 Download App
          </a>
          <p style="color:#94a3b8;font-size:12px;">Or visit: <a href="${emailLink}">${emailLink}</a></p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;"/>
          <p style="color:#94a3b8;font-size:11px;">This link is permanent and will always work.</p>
        </div>
      `,
    });
  }
/**
 * Send welcome email after admin account is created.
 */
async function sendWelcomeEmail(toEmail, adminName, companyName, slug) {
  const adminUrl    = `${process.env.BASE_URL}/${slug}/admin`;
  const registerUrl = `${process.env.BASE_URL}/${slug}/register`;

  await transporter.sendMail({
    from:    process.env.MAIL_FROM,
    to:      toEmail,
    subject: `Your Logistics OS workspace is live — ${companyName}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;">
        <h2 style="color:#0f2235;">Your workspace is ready, ${adminName}!</h2>
        <p style="color:#475569;line-height:1.6;">
          <strong>${companyName}</strong>'s private Logistics OS workspace has been activated.
        </p>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:20px 0;">
          <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#0f2235;">Your private URLs</p>
          <p style="margin:4px 0;font-size:12px;color:#64748b;">
            Admin dashboard: <a href="${adminUrl}" style="color:#3b82f6;">${adminUrl}</a>
          </p>
          <p style="margin:4px 0;font-size:12px;color:#64748b;">
            Staff registration: <a href="${registerUrl}" style="color:#3b82f6;">${registerUrl}</a>
          </p>
        </div>
        <p style="font-size:12px;color:#94a3b8;">
          Keep your registration URL private — only share it with your own staff and drivers.
        </p>
      </div>
    `,
  });
}

module.exports = { sendInviteEmail, sendWelcomeEmail, sendRegistrationEmail };
