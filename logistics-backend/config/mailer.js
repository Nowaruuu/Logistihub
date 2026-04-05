const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: parseInt(process.env.MAIL_PORT),
  secure: false,
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


async function sendWelcomeEmail(email, fullName, companyName, slug) {
  const adminUrl = process.env.BASE_URL + '/' + slug + '/admin';
  const subject = 'Your Logistics OS workspace is ready!';
  const html = `
  <div style="font-family:Arial,sans-serif;background:#f1f5f9;padding:40px 20px;">
    <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
      <div style="background:#0a1628;padding:32px;text-align:center;">
        <div style="color:#fff;font-size:22px;font-weight:800;">${companyName}</div>
        <div style="color:#94a3b8;font-size:12px;">Powered by Logistics OS</div>
      </div>
      <div style="padding:32px;">
        <h2 style="color:#0a1628;margin:0 0 12px;">Welcome, ${fullName}!</h2>
        <p style="color:#64748b;font-size:14px;line-height:1.6;">
          Your workspace for <strong>${companyName}</strong> has been successfully created.
          Click below to access your admin dashboard.
        </p>
        <div style="text-align:center;margin:28px 0;">
          <a href="${adminUrl}" style="background:#0a1628;color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">
            Go to My Dashboard
          </a>
        </div>
        <p style="font-size:12px;color:#94a3b8;text-align:center;word-break:break-all;">
          Or copy: <a href="${adminUrl}" style="color:#0a1628;">${adminUrl}</a>
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

module.exports = { sendRegistrationEmail, sendInviteEmail, sendWelcomeEmail };
