const nodemailer = require('nodemailer');

// Setup a transporter. During dev, you can use ethereal.email or a real SMTP
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: process.env.SMTP_PORT || 587,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

async function sendInviteEmail(email, companyName, token) {
    const inviteLink = `${process.env.BASE_URL}/admin-onboarding?invite=${token}`;
    
    // In dev mode, if SMTP credentials are not fully set, we just log the link.
    if (!process.env.SMTP_USER) {
        console.log('====================================================');
        console.log(`[MAIL MOCK] Sending Invite to ${companyName} (${email})`);
        console.log(`Link: ${inviteLink}`);
        console.log('====================================================');
        return true;
    }

    const mailOptions = {
        from: '"Logistics OS Admin" <noreply@logistihub.ddns.net>',
        to: email,
        subject: `Invitation to set up ${companyName} on Logistics OS`,
        html: `
            <div style="font-family: sans-serif; padding: 20px;">
                <h2>Welcome to Logistics OS</h2>
                <p>Hello,</p>
                <p>You have been invited to set up the Logistics OS workspace for <strong>${companyName}</strong>.</p>
                <p>Click the button below to choose your plan and configure your workspace.</p>
                <a href="${inviteLink}" style="display:inline-block; padding: 10px 20px; background-color: #0f172a; color: #ffffff; text-decoration: none; border-radius: 5px; margin-top: 15px;">Set up workspace</a>
                <p style="margin-top:20px; font-size: 12px; color: #64748b;">If the button doesn't work, copy and paste this link: ${inviteLink}</p>
            </div>
        `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Message sent: %s', info.messageId);
    return info;
}

async function sendWelcomeEmail(email, name, companyName, slug) {
    const adminLink = `${process.env.BASE_URL}/${slug}/admin`;

    if (!process.env.SMTP_USER) {
        console.log('====================================================');
        console.log(`[MAIL MOCK] Sending Welcome to ${name} at ${companyName} (${email})`);
        console.log(`Admin Link: ${adminLink}`);
        console.log('====================================================');
        return true;
    }

    const mailOptions = {
        from: '"Logistics OS Admin" <noreply@logistihub.ddns.net>',
        to: email,
        subject: `Welcome to Logistics OS, ${name}!`,
        html: `
            <div style="font-family: sans-serif; padding: 20px;">
                <h2>Workspace is Ready!</h2>
                <p>Hello ${name},</p>
                <p>Your workspace for <strong>${companyName}</strong> has been successfully provisioned.</p>
                <p>You can access your isolated admin dashboard using the link below:</p>
                <a href="${adminLink}" style="display:inline-block; padding: 10px 20px; background-color: #0f172a; color: #ffffff; text-decoration: none; border-radius: 5px; margin-top: 15px;">Go to Dashboard</a>
            </div>
        `
    };

    return transporter.sendMail(mailOptions);
}

module.exports = {
    sendInviteEmail,
    sendWelcomeEmail
};