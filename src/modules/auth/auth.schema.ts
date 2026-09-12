import { z } from "zod";

export const registerSchema = z.object({
  email: z.email("Email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(3),
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string(),
  twoFactorCode: z.string().optional(),
});
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
