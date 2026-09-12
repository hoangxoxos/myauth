import nodemailer from "nodemailer";
import { env } from "../../config/env.js";

export async function sendEmail(to: string, subject: string, html: string) {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
    console.log("Email env are not available");
    return;
  }

  const host = env.SMTP_HOST;
  const port = Number(env.SMTP_PORT || "587");
  const user = env.SMTP_USER;
  const pass = env.SMTP_PASS;
  const from = env.EMAIL_FROM;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: false,
    auth: {
      user,
      pass,
    },
  });

  await transporter.sendMail({
    from,
    to,
    subject,
    html,
  });
}
