import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(3, "Name cannot be empty and must be greater than 3 characters")
    .optional(),
  avatarUrl: z.string().optional(),
});

export const updateUserEmailSchema = z.object({
  newEmail: z.email(),
  twoFactorCode: z.string().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateUserEmailInput = z.infer<typeof updateUserEmailSchema>;
