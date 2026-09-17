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
  password: z.string().optional(),
  twoFactorCode: z.string().optional(),
});

export const deleteUserSchema = z.object({
  password: z.string().optional(),
  twoFactorCode: z.string().optional(),
});

export const adminUpdateUserProfileSchema = z.object({
  name: z.string().optional(),
  email: z.email().optional(),
  password: z.string().optional(),
  avatarUrl: z.string().optional(),
  isEmailVerified: z.boolean().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateUserEmailInput = z.infer<typeof updateUserEmailSchema>;
export type DeleteUserInput = z.infer<typeof deleteUserSchema>;
export type AdminUpdateUserProfileSchema = z.infer<
  typeof adminUpdateUserProfileSchema
>;
