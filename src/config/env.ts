import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string(),
  PORT: z.coerce.number().default(3000),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.log("Invalid env variables");
  console.error(parsed.error.flatten());
  process.exit(1);
}

export const env = parsed.data;
