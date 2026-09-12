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

export const enable2FASchema = z.object({
  code: z.string(),
});

export const disable2FASchema = z.object({
  password: z.string(),
  code: z.string(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type Enable2FAInput = z.infer<typeof enable2FASchema>;
export type Disable2FAInput = z.infer<typeof disable2FASchema>;
