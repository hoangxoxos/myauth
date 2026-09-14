import nodemailer from "nodemailer";
import { env } from "../../config/env.js";

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: Number(env.SMTP_PORT),
  secure: false,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

export async function sendEmail(to: string, subject: string, html: string) {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
    console.log("Email env are not available");
    return;
  }

  const from = env.EMAIL_FROM;

  await transporter.sendMail({
    from,
    to,
    subject,
    html,
  });
}
