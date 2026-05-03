const nodemailer = require('nodemailer');

const mailPort = parseInt(process.env.MAIL_PORT || '587');
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: mailPort,
  secure: mailPort === 465,   // true for SSL(465), false for STARTTLS(587)
  auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS }
});

async function sendInviteEmail(email, companyName, inviteToken) {
  const link = process.env.BASE_URL + '/onboarding?invite=' + inviteToken;
  const subject = 'You\'ve been invited to Logistics OS';
  const html = `
  <div style="font-family:Arial,sans-serif;background:#f1f5f9;padding:40px 20px;">
    <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
      <div style="background:#0a1628;padding:32px;text-align:center;">
        <div style="color:#fff;font-size:22px;font-weight:800;">Welcome to Logistics OS</div>
      </div>
      <div style="padding:32px;">
        <p style="color:#334155;font-size:15px;line-height:1.6;">
          You've been invited to create an admin workspace for <strong>${companyName}</strong>.
          Click the button below to choose your subscription and complete your account setup.
        </p>
        <p style="color:#64748b;font-size:14px;">This link expires in <strong>48 hours</strong>.</p>
        <div style="text-align:center;margin:28px 0;">
          <a href="${link}" style="background:#0a1628;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">
            Set Up My Workspace
          </a>
        </div>
        <p style="font-size:12px;color:#94a3b8;text-align:center;word-break:break-all;">
          If the button doesn't work, copy this link:<br/>
          <a href="${link}" style="color:#0a1628;">${link}</a>
        </p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;"/>
        <p style="font-size:12px;color:#94a3b8;">
          If you didn't expect this email, you can safely ignore it.<br/>
          Your workspace is private and isolated from all other companies on this platform.
        </p>
      </div>
      <div style="background:#f8fafc;padding:16px;text-align:center;font-size:11px;color:#cbd5e1;">
        © ${new Date().getFullYear()} Logistics OS
      </div>
    </div>
  </div>`;

  await transporter.sendMail({
    from: process.env.MAIL_FROM || 'noreply@logistihub.com',
    to: email,
    subject,
    html
  });
}

async function sendRegistrationEmail(email, fullName, companyName, slug, downloadLink) {
  const subject = `Welcome to ${companyName} — Download Your App`;
  const html = `
  <div style="font-family:Arial,sans-serif;background:#f1f5f9;padding:40px 20px;">
    <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
      <div style="background:#0a1628;padding:32px;text-align:center;">
        <div style="color:#fff;font-size:22px;font-weight:800;">${companyName}</div>
        <div style="color:#94a3b8;font-size:12px;">Powered by Logistics OS</div>
      </div>
      <div style="padding:32px;">
        <h2 style="color:#0a1628;">Welcome, ${fullName}!</h2>
        <p style="color:#64748b;">Your account is ready for <strong>${companyName}</strong>.</p>
        <div style="text-align:center;margin:28px 0;">
          <a href="${downloadLink}" style="background:#0a1628;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">
            📱 Download the App
          </a>
        </div>
        <p style="font-size:12px;color:#94a3b8;text-align:center;word-break:break-all;">
          Or copy: <a href="${downloadLink}">${downloadLink}</a>
        </p>
      </div>
      <div style="background:#f8fafc;padding:16px;text-align:center;font-size:11px;color:#cbd5e1;">
        © ${new Date().getFullYear()} ${companyName} · Powered by Logistics OS
      </div>
    </div>
  </div>`;

  await transporter.sendMail({
    from: process.env.MAIL_FROM || 'noreply@logistihub.com',
    to: email,
    subject,
    html
  });
}


async function sendWelcomeEmail(email, fullName, companyName, slug, staffUsername) {
  const adminUrl = process.env.BASE_URL + '/' + slug + '/admin-login';
  const staffUrl = process.env.BASE_URL + '/' + slug + '/staff-login';
  const registerUrl = process.env.BASE_URL + '/' + slug + '/register';

  const subject = 'Your Logistics OS workspace is ready!';
  const html = `
  <div style="font-family:Arial,sans-serif;background:#f1f5f9;padding:40px 20px;">
    <div style="max-width:540px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.05);">
      <div style="background:#0a1628;padding:32px;text-align:center;">
        <div style="color:#22c55e;font-size:11px;font-weight:700;letter-spacing:0.08em;margin-bottom:8px;text-transform:uppercase;">Workspace Activated</div>
        <div style="color:#fff;font-size:24px;font-weight:800;margin-bottom:4px;">${companyName}</div>
        <div style="color:#94a3b8;font-size:11px;">Powered by Logistics OS</div>
      </div>
      <div style="padding:32px;">
        <h2 style="color:#0a1628;margin:0 0 16px;font-size:20px;">Welcome, ${fullName}!</h2>
        <p style="color:#475569;font-size:14px;line-height:1.6;margin-bottom:24px;">
          Your <strong>${companyName}</strong> workspace has been fully initialized. Below are all the portal links and instructions you need to get started.
        </p>
        <p style="color:#0a1628;font-size:14px;font-weight:600;margin-bottom:24px;background:#f8fafc;padding:12px;border-radius:8px;border:1px solid #e2e8f0;">
          Your Admin Username: <span style="color:#3b82f6;">${staffUsername}</span>
        </p>

        <!-- Admin -->
        <div style="border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin-bottom:16px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
            <span style="background:#0a1628;color:#fff;font-size:10px;font-weight:700;padding:4px 8px;border-radius:4px;letter-spacing:0.05em;">ADMIN</span>
            <strong style="color:#0a1628;font-size:14px;">Admin Dashboard</strong>
          </div>
          <p style="color:#64748b;font-size:13px;line-height:1.5;margin-bottom:16px;">
            Use this link to log in and manage your workspace &mdash; create staff, track shipments, and configure your logistics portal.
          </p>
          <a href="${adminUrl}" style="display:inline-block;background:#0a1628;color:#fff;text-decoration:none;font-weight:600;font-size:13px;padding:10px 20px;border-radius:6px;margin-bottom:12px;">Go to Admin Login &rarr;</a>
          <div><a href="${adminUrl}" style="color:#3b82f6;font-size:11px;text-decoration:underline;">${adminUrl}</a></div>
        </div>

        <!-- Staff -->
        <div style="border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin-bottom:16px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
            <span style="background:#0f766e;color:#fff;font-size:10px;font-weight:700;padding:4px 8px;border-radius:4px;letter-spacing:0.05em;">STAFF</span>
            <strong style="color:#0a1628;font-size:14px;">Staff Login Portal</strong>
          </div>
          <p style="color:#64748b;font-size:13px;line-height:1.5;margin-bottom:16px;">
            Share this link with your drivers and staff members. They will use their assigned credentials to log in and manage deliveries.
          </p>
          <a href="${staffUrl}" style="display:inline-block;background:#0f766e;color:#fff;text-decoration:none;font-weight:600;font-size:13px;padding:10px 20px;border-radius:6px;margin-bottom:12px;">Go to Staff Login &rarr;</a>
          <div><a href="${staffUrl}" style="color:#3b82f6;font-size:11px;text-decoration:underline;">${staffUrl}</a></div>
        </div>

        <!-- Register -->
        <div style="border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin-bottom:24px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
            <span style="background:#8b5cf6;color:#fff;font-size:10px;font-weight:700;padding:4px 8px;border-radius:4px;letter-spacing:0.05em;">REGISTER</span>
            <strong style="color:#0a1628;font-size:14px;">Staff Registration</strong>
          </div>
          <p style="color:#64748b;font-size:13px;line-height:1.5;margin-bottom:16px;">
            Use your Admin dashboard to invite new staff members. Their credentials will be auto-generated and emailed to them directly.
          </p>
          <div><a href="${registerUrl}" style="color:#3b82f6;font-size:11px;text-decoration:underline;">${registerUrl}</a></div>
        </div>

        <p style="font-size:12px;color:#94a3b8;text-align:center;">
          Save this email &mdash; it contains all your portal access links.
        </p>
      </div>
      <div style="background:#f8fafc;padding:16px;text-align:center;font-size:11px;color:#cbd5e1;">
        © ${new Date().getFullYear()} ${companyName} · Powered by Logistics OS
      </div>
    </div>
  </div>`;

  await transporter.sendMail({
    from: process.env.MAIL_FROM || 'noreply@logistihub.com',
    to: email,
    subject,
    html
  });
}

async function sendForgotCredentialsEmail(email, username, companyName, type) {
  const isUsername = type === 'username';
  const subject = isUsername
    ? `Your ${companyName} username`
    : `Password reset request — ${companyName}`;
  const bodyHtml = isUsername
    ? `<p style="color:#334155;font-size:15px;line-height:1.6;">Your username for <strong>${companyName}</strong> is:</p>
       <div style="text-align:center;margin:24px 0;font-size:22px;font-weight:800;color:#0a1628;background:#f1f5f9;padding:16px;border-radius:10px;letter-spacing:0.04em;">${username}</div>
       <p style="color:#64748b;font-size:13px;">Use this to log in at your workspace portal.</p>`
    : `<p style="color:#334155;font-size:15px;line-height:1.6;">We received a password reset request for your <strong>${companyName}</strong> admin account.</p>
       <p style="color:#64748b;font-size:13px;">Your username is: <strong>${username}</strong>. Please contact your platform administrator to reset your password, or use the admin panel if you have access.</p>`;

  const html = `
  <div style="font-family:Arial,sans-serif;background:#f1f5f9;padding:40px 20px;">
    <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
      <div style="background:#0a1628;padding:32px;text-align:center;">
        <div style="color:#fff;font-size:22px;font-weight:800;">${companyName}</div>
        <div style="color:#94a3b8;font-size:12px;">Powered by Logistics OS</div>
      </div>
      <div style="padding:32px;">
        <h2 style="color:#0a1628;margin:0 0 16px;">${isUsername ? 'Your Username' : 'Password Reset'}</h2>
        ${bodyHtml}
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;"/>
        <p style="font-size:12px;color:#94a3b8;">If you didn't request this, you can safely ignore this email.</p>
      </div>
      <div style="background:#f8fafc;padding:16px;text-align:center;font-size:11px;color:#cbd5e1;">
        © ${new Date().getFullYear()} ${companyName} · Powered by Logistics OS
      </div>
    </div>
  </div>`;

  await transporter.sendMail({
    from: process.env.MAIL_FROM || 'noreply@logistihub.com',
    to: email,
    subject,
    html
  });
}

async function sendPasswordResetEmail(email, otp, companyName) {
  const subject = `Password Reset Code — ${companyName}`;
  const html = `
  <div style="font-family:Arial,sans-serif;background:#f1f5f9;padding:40px 20px;">
    <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
      <div style="background:#0a1628;padding:32px;text-align:center;">
        <div style="color:#fff;font-size:22px;font-weight:800;">${companyName}</div>
        <div style="color:#94a3b8;font-size:12px;">Password Reset</div>
      </div>
      <div style="padding:32px;">
        <h2 style="color:#0a1628;margin:0 0 12px;">Your Reset Code</h2>
        <p style="color:#64748b;font-size:14px;line-height:1.6;">
          Use the code below to reset your password. This code expires in <strong>15 minutes</strong>.
        </p>
        <div style="text-align:center;margin:28px 0;font-size:40px;font-weight:900;letter-spacing:12px;color:#0a1628;background:#f8fafc;padding:20px;border-radius:12px;border:2px dashed #e2e8f0;">
          ${otp}
        </div>
        <p style="font-size:12px;color:#94a3b8;text-align:center;">
          If you did not request a password reset, ignore this email.<br/>Your password will not change.
        </p>
      </div>
      <div style="background:#f8fafc;padding:16px;text-align:center;font-size:11px;color:#cbd5e1;">
        © ${new Date().getFullYear()} ${companyName} · Powered by Logistics OS
      </div>
    </div>
  </div>`;

  await transporter.sendMail({
    from: process.env.MAIL_FROM || 'noreply@logistihub.com',
    to: email,
    subject,
    html
  });
}

async function sendRegistrationOtpEmail(email, otp, companyName) {
  const subject = `Authentication Code — ${companyName}`;
  const html = `
  <div style="font-family:Arial,sans-serif;background:#f1f5f9;padding:40px 20px;">
    <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
      <div style="background:#0a1628;padding:32px;text-align:center;">
        <div style="color:#fff;font-size:22px;font-weight:800;">${companyName}</div>
        <div style="color:#94a3b8;font-size:12px;">Account Registration</div>
      </div>
      <div style="padding:32px;">
        <h2 style="color:#0a1628;margin:0 0 12px;">Your Authentication Code</h2>
        <p style="color:#64748b;font-size:14px;line-height:1.6;">
          Use the code below to complete your registration. This code expires in <strong>15 minutes</strong>.
        </p>
        <div style="text-align:center;margin:28px 0;font-size:40px;font-weight:900;letter-spacing:12px;color:#0a1628;background:#f8fafc;padding:20px;border-radius:12px;border:2px dashed #e2e8f0;">
          ${otp}
        </div>
        <p style="font-size:12px;color:#94a3b8;text-align:center;">
          If you did not request to register, ignore this email.
        </p>
      </div>
      <div style="background:#f8fafc;padding:16px;text-align:center;font-size:11px;color:#cbd5e1;">
        © ${new Date().getFullYear()} ${companyName} · Powered by Logistics OS
      </div>
    </div>
  </div>`;

  await transporter.sendMail({
    from: process.env.MAIL_FROM || 'noreply@logistihub.com',
    to: email,
    subject,
    html
  });
}

async function sendStaffWelcomeEmail(toEmail, staffName, username, tempPassword, role, companyName, loginUrl) {
  const subject = `You've been added to ${companyName} — Your Login Details`;
  const roleColor = role === 'Driver' ? '#6366f1' : role === 'Manager' ? '#0ea5e9' : '#10b981';
  const html = `
  <div style="font-family:Arial,sans-serif;background:#f1f5f9;padding:40px 20px;">
    <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
      <div style="background:#0a1628;padding:32px;text-align:center;">
        <div style="color:#fff;font-size:22px;font-weight:800;">${companyName}</div>
        <div style="color:#94a3b8;font-size:12px;">Staff Portal · Powered by Logistics OS</div>
      </div>
      <div style="padding:32px;">
        <h2 style="color:#0a1628;margin-bottom:6px;">Welcome, ${staffName}!</h2>
        <p style="color:#64748b;font-size:14px;line-height:1.6;margin-bottom:24px;">
          You have been added to <strong>${companyName}</strong> as a <strong style="color:${roleColor};">${role}</strong>.
          Use the temporary credentials below to log in for the first time.
        </p>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:24px;">
          <div style="margin-bottom:12px;">
            <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">Username</div>
            <div style="font-size:16px;font-weight:700;color:#0a1628;font-family:monospace;">${username}</div>
          </div>
          <div>
            <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">Temporary Password</div>
            <div style="font-size:16px;font-weight:700;color:#dc2626;font-family:monospace;">${tempPassword}</div>
          </div>
        </div>
        <p style="color:#f59e0b;font-size:13px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px 14px;margin-bottom:24px;">
          ⚠️ Please change your password immediately after your first login.
        </p>
        <div style="text-align:center;margin:28px 0;">
          <a href="${loginUrl}" style="background:#0a1628;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">
            Sign In Now →
          </a>
        </div>
        <p style="font-size:12px;color:#94a3b8;text-align:center;">Or visit: <a href="${loginUrl}" style="color:#0a1628;">${loginUrl}</a></p>
      </div>
      <div style="background:#f8fafc;padding:16px;text-align:center;font-size:11px;color:#cbd5e1;">
        © ${new Date().getFullYear()} ${companyName} · Powered by Logistics OS
      </div>
    </div>
  </div>`;

  await transporter.sendMail({
    from: process.env.MAIL_FROM || 'noreply@logistihub.com',
    to: toEmail,
    subject,
    html
  });
}

// ── Business Permit Application Emails ──────────────────────────────────────

async function sendApplicationReceivedEmail(email, name, companyName) {
  const subject = 'Application Received — Logistics OS';
  const html = `
  <div style="font-family:Arial,sans-serif;background:#f1f5f9;padding:40px 20px;">
    <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
      <div style="background:#0a1628;padding:32px;text-align:center;">
        <div style="color:#fbbf24;font-size:11px;font-weight:700;letter-spacing:0.08em;margin-bottom:8px;text-transform:uppercase;">Application Under Review</div>
        <div style="color:#fff;font-size:22px;font-weight:800;">Logistics OS</div>
      </div>
      <div style="padding:32px;">
        <h2 style="color:#0a1628;margin:0 0 16px;font-size:20px;">Hi ${name},</h2>
        <p style="color:#475569;font-size:14px;line-height:1.6;margin-bottom:24px;">
          Thank you for applying to create a workspace for <strong>${companyName}</strong> on Logistics OS. We have received your application and business permit.
        </p>
        <div style="background:#fefce8;border:1px solid #fde68a;border-radius:10px;padding:16px;margin-bottom:24px;display:flex;align-items:flex-start;gap:10px;">
          <span style="font-size:20px;">⏳</span>
          <div>
            <strong style="color:#92400e;font-size:13px;">What happens next?</strong>
            <p style="color:#a16207;font-size:12px;margin:4px 0 0;line-height:1.5;">Our team will review your business permit. You'll receive an email once your application is approved — typically within 1-2 business days.</p>
          </div>
        </div>
        <p style="font-size:12px;color:#94a3b8;text-align:center;">You can check your application status anytime at the onboarding page.</p>
      </div>
      <div style="background:#f8fafc;padding:16px;text-align:center;font-size:11px;color:#cbd5e1;">
        © ${new Date().getFullYear()} Logistics OS
      </div>
    </div>
  </div>`;

  await transporter.sendMail({
    from: process.env.MAIL_FROM || 'noreply@logistihub.com',
    to: email, subject, html
  });
}

async function sendApplicationApprovedEmail(email, name, companyName, paymentLink) {
  const subject = '✅ Application Approved — Complete Your Setup';
  const html = `
  <div style="font-family:Arial,sans-serif;background:#f1f5f9;padding:40px 20px;">
    <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
      <div style="background:#0a1628;padding:32px;text-align:center;">
        <div style="color:#22c55e;font-size:11px;font-weight:700;letter-spacing:0.08em;margin-bottom:8px;text-transform:uppercase;">Application Approved</div>
        <div style="color:#fff;font-size:22px;font-weight:800;">Logistics OS</div>
      </div>
      <div style="padding:32px;">
        <h2 style="color:#0a1628;margin:0 0 16px;font-size:20px;">Great news, ${name}!</h2>
        <p style="color:#475569;font-size:14px;line-height:1.6;margin-bottom:24px;">
          Your business permit for <strong>${companyName}</strong> has been verified and approved. You're almost there — just choose a plan and complete payment to activate your workspace.
        </p>
        <div style="text-align:center;margin:28px 0;">
          <a href="${paymentLink}" style="background:#0a1628;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">
            Complete Setup & Pay →
          </a>
        </div>
        <p style="font-size:12px;color:#94a3b8;text-align:center;word-break:break-all;">
          If the button doesn't work, copy this link:<br/>
          <a href="${paymentLink}" style="color:#0a1628;">${paymentLink}</a>
        </p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;"/>
        <p style="font-size:12px;color:#94a3b8;">This link expires in <strong>7 days</strong>. If it expires, you may re-apply.</p>
      </div>
      <div style="background:#f8fafc;padding:16px;text-align:center;font-size:11px;color:#cbd5e1;">
        © ${new Date().getFullYear()} Logistics OS
      </div>
    </div>
  </div>`;

  await transporter.sendMail({
    from: process.env.MAIL_FROM || 'noreply@logistihub.com',
    to: email, subject, html
  });
}

async function sendApplicationRejectedEmail(email, name, companyName, reason, reapplyLink) {
  const subject = 'Application Update — Action Required';
  const html = `
  <div style="font-family:Arial,sans-serif;background:#f1f5f9;padding:40px 20px;">
    <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
      <div style="background:#0a1628;padding:32px;text-align:center;">
        <div style="color:#f97316;font-size:11px;font-weight:700;letter-spacing:0.08em;margin-bottom:8px;text-transform:uppercase;">Action Required</div>
        <div style="color:#fff;font-size:22px;font-weight:800;">Logistics OS</div>
      </div>
      <div style="padding:32px;">
        <h2 style="color:#0a1628;margin:0 0 16px;font-size:20px;">Hi ${name},</h2>
        <p style="color:#475569;font-size:14px;line-height:1.6;margin-bottom:24px;">
          Unfortunately, we were unable to approve your application for <strong>${companyName}</strong> at this time.
        </p>
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:16px;margin-bottom:24px;">
          <strong style="color:#991b1b;font-size:13px;display:block;margin-bottom:6px;">Reason:</strong>
          <p style="color:#dc2626;font-size:13px;margin:0;line-height:1.5;">${reason}</p>
        </div>
        <p style="color:#475569;font-size:14px;line-height:1.6;margin-bottom:24px;">
          You may re-apply with a corrected business permit by clicking the button below.
        </p>
        <div style="text-align:center;margin:28px 0;">
          <a href="${reapplyLink}" style="background:#0a1628;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">
            Re-Apply Now →
          </a>
        </div>
      </div>
      <div style="background:#f8fafc;padding:16px;text-align:center;font-size:11px;color:#cbd5e1;">
        © ${new Date().getFullYear()} Logistics OS
      </div>
    </div>
  </div>`;

  await transporter.sendMail({
    from: process.env.MAIL_FROM || 'noreply@logistihub.com',
    to: email, subject, html
  });
}

module.exports = { sendRegistrationEmail, sendInviteEmail, sendWelcomeEmail, sendForgotCredentialsEmail, sendPasswordResetEmail, sendRegistrationOtpEmail, sendStaffWelcomeEmail, sendApplicationReceivedEmail, sendApplicationApprovedEmail, sendApplicationRejectedEmail };
