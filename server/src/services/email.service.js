import nodemailer from "nodemailer";
import { env } from "../config/env.js";

const isSmtpConfigured = Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);

const transporter = isSmtpConfigured
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    })
  : null;

export const sendEmail = async ({ to, subject, html, text }) => {
  if (!isSmtpConfigured) {
    console.log("SMTP not configured. Email skipped.");
    console.log({ to, subject, text });
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
    html: `
      <h2>Password Reset</h2>
      <p>Hello ${name},</p>
      <p>Click below to reset your password. This link expires soon.</p>
      <p><a href="${resetUrl}">Reset Password</a></p>
      <p>If you did not request this, ignore this email.</p>
    `,
  });
};

export const sendVerificationEmail = async ({ to, name, verifyUrl }) => {
  return sendEmail({
    to,
    subject: `${env.APP_NAME} - Verify your email`,
    text: `Hello ${name}, verify your email using this link: ${verifyUrl}`,
    html: `
      <h2>Email Verification</h2>
      <p>Hello ${name},</p>
      <p>Please verify your email address.</p>
      <p><a href="${verifyUrl}">Verify Email</a></p>
    `,
  });
};

export const sendUnlockEmail = async ({ to, name, unlockUrl }) => {
  return sendEmail({
    to,
    subject: `${env.APP_NAME} - Unlock your account`,
    text: `Hello ${name}, unlock your account using this link: ${unlockUrl}`,
    html: `
      <h2>Account Unlock</h2>
      <p>Hello ${name},</p>
      <p>Your account was locked due to failed login attempts.</p>
      <p><a href="${unlockUrl}">Unlock Account</a></p>
    `,
  });
};