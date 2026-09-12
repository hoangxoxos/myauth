import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string(),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z
    .enum(["production", "development", "test"])
    .default("development"),
  JWT_ACCESS_SECRET: z.string(),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  REFRESH_SECRET: z.string(),
  REFRESH_EXPIRES_IN: z.string().default("7d"),
  SMTP_HOST: z.string(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string(),
  SMTP_PASS: z.string(),
  EMAIL_FROM: z.string().default("xoxosos <no-reply@xoxosos.com>"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.log("Invalid env variables");
  console.error(parsed.error.flatten());
  process.exit(1);
}

export const env = parsed.data;
