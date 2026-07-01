import nodemailer from "nodemailer";
import { env } from "../config/env.js";

const isSmtpConfigured = Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);

const transporter = isSmtpConfigured
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      // secure:true means SSL on connect (port 465).
      // For port 587 (STARTTLS), secure must be false — TLS is
      // negotiated via STARTTLS after the connection is established.
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
      // Explicitly allow STARTTLS on port 587 and reject unauthorised
      // certificates in production to prevent MITM attacks.
      tls: {
        rejectUnauthorized: env.NODE_ENV === "production",
      },
    })
  : null;

// Accept a `required` flag. When the email is critical (e.g. account
// unlock) and SMTP is not configured, throw so the caller knows
// delivery failed instead of silently skipping.
export const sendEmail = async ({ to, subject, html, text, required = false }) => {
  if (!isSmtpConfigured) {
    if (required) {
      throw new Error(
        `SMTP is not configured. Cannot send required email to ${to} — subject: "${subject}". ` +
        "Set SMTP_HOST, SMTP_USER, and SMTP_PASS in your .env file."
      );
    }
    console.warn("[email] SMTP not configured. Email skipped.");
    console.warn({ to, subject, text });
    return { skipped: true };
  }

  return transporter.sendMail({
    from: env.SMTP_FROM,
    to,
    subject,
    html,
    text,
  });
};

export const sendResetPasswordEmail = async ({ to, name, resetUrl }) => {
  return sendEmail({
    to,
    subject: `${env.APP_NAME} - Reset your password`,
    text: `Hello ${name}, reset your password using this link: ${resetUrl}`,
    html: `<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#333">
  <h2 style="color:#1a1a1a">Password Reset</h2>
  <p>Hello ${name},</p>
  <p>Click the button below to reset your password. This link expires in <strong>15 minutes</strong>.</p>
  <p style="margin:24px 0">
    <a href="${resetUrl}"
       style="background:#4F46E5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">
      Reset Password
    </a>
  </p>
  <p style="color:#666;font-size:13px">If the button doesn't work, copy this link:<br>${resetUrl}</p>
  <p style="color:#666;font-size:13px">If you did not request this, you can safely ignore this email.</p>
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
  <p style="color:#999;font-size:12px">${env.APP_NAME}</p>
</body>
</html>`,
    required: false,
  });
};

export const sendVerificationEmail = async ({ to, name, verifyUrl }) => {
  return sendEmail({
    to,
    subject: `${env.APP_NAME} - Verify your email`,
    text: `Hello ${name}, verify your email using this link: ${verifyUrl}`,
    html: `<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#333">
  <h2 style="color:#1a1a1a">Verify Your Email</h2>
  <p>Hello ${name},</p>
  <p>Please verify your email address to activate your account.</p>
  <p style="margin:24px 0">
    <a href="${verifyUrl}"
       style="background:#4F46E5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">
      Verify Email
    </a>
  </p>
  <p style="color:#666;font-size:13px">If the button doesn't work, copy this link:<br>${verifyUrl}</p>
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
  <p style="color:#999;font-size:12px">${env.APP_NAME}</p>
</body>
</html>`,
    required: false,
  });
};

// Unlock email is required=true — if SMTP is not configured an error
// is thrown so the login controller can fall back to the admin endpoint.
export const sendUnlockEmail = async ({ to, name, unlockUrl }) => {
  return sendEmail({
    to,
    subject: `${env.APP_NAME} - Unlock your account`,
    text: `Hello ${name}, unlock your account using this link: ${unlockUrl}`,
    html: `<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#333">
  <h2 style="color:#1a1a1a">Account Locked</h2>
  <p>Hello ${name},</p>
  <p>Your account was locked after multiple failed login attempts.</p>
  <p>Click the button below to unlock your account. This link expires in <strong>30 minutes</strong>.</p>
  <p style="margin:24px 0">
    <a href="${unlockUrl}"
       style="background:#DC2626;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">
      Unlock Account
    </a>
  </p>
  <p style="color:#666;font-size:13px">If the button doesn't work, copy this link:<br>${unlockUrl}</p>
  <p style="color:#666;font-size:13px">If this wasn't you, contact your administrator immediately.</p>
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
  <p style="color:#999;font-size:12px">${env.APP_NAME}</p>
</body>
</html>`,
    required: true,
  });
};

export const sendWelcomeEmployeeEmail = async ({
  to,
  name,
  employeeCode,
  temporaryPassword,
  loginUrl,
}) => {
  return sendEmail({
    to,
    subject: `${env.APP_NAME} - Welcome to the HR Portal`,
    text: `Hello ${name}, your employee account has been created. Employee Code: ${employeeCode}. Login: ${loginUrl}. Temporary Password: ${temporaryPassword}`,
    html: `<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#333">
  <h2 style="color:#1a1a1a">Welcome to ${env.APP_NAME}</h2>
  <p>Hello ${name},</p>
  <p>Your employee account has been created successfully.</p>

  <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:20px 0">
    <p><strong>Employee Code:</strong> ${employeeCode}</p>
    <p><strong>Login URL:</strong> <a href="${loginUrl}">${loginUrl}</a></p>
    <p><strong>Temporary Password:</strong> ${temporaryPassword}</p>
  </div>

  <p>Please login and change your password immediately.</p>

  <p style="margin:24px 0">
    <a href="${loginUrl}"
       style="background:#16A34A;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">
      Login Now
    </a>
  </p>

  <p style="color:#666;font-size:13px">
    If you did not expect this email, please contact your HR team.
  </p>

  <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
  <p style="color:#999;font-size:12px">${env.APP_NAME}</p>
</body>
</html>`,
    required: false,
  });
};