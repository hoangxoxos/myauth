import { AppError } from "../../common/errors/AppError.js";
import { escapeHtml } from "../../common/utils/html.js";
import { getServerUrl } from "../../common/utils/app-url.js";
import { sendEmail } from "../../common/utils/email.js";
import { checkPassword, hashPassword } from "../../common/utils/hash.js";
import { generateRandomToken, hashToken } from "../../common/utils/token.js";
import { prisma } from "../../config/prisma.js";
import { authRepository } from "../auth/auth.repository.js";
import { roleRepo } from "../role/role.repository.js";
import { UserMapper } from "./user.mapper.js";
import { userRepo } from "./user.repository.js";
import { UpdateProfileInput, UpdateUserEmailInput } from "./user.schema.js";

import { OTP } from "otplib";

const otp = new OTP();

class UserService {
  async getMe(userId: string) {
    const user = await userRepo.findById(userId);

    if (!user) {
      throw new AppError(404, "User not found");
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatarUrl,
      isEmailVerified: user.isEmailVerified,
      twoFactorEnabled: user.twoFactorEnabled,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async updateProfile(userId: string, data: UpdateProfileInput) {
    const existingUser = await userRepo.findById(userId);

    if (!existingUser) {
      throw new AppError(404, "User not found");
    }

    const updatedUser = await userRepo.update(existingUser.id, {
      name: data.name,
      avatarUrl: data.avatarUrl,
    });

    return {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      avatarUrl: updatedUser.avatarUrl,
      isEmailVerified: updatedUser.isEmailVerified,
      twoFactorEnabled: updatedUser.twoFactorEnabled,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    };
  }

  async updateUserEmail(userId: string, updatedInput: UpdateUserEmailInput) {
    const existingUser = await userRepo.findById(userId);

    if (!existingUser) {
      throw new AppError(404, "User not found");
    }

    if (existingUser.password) {
      if (!updatedInput.password) {
        throw new AppError(400, "Current password is required");
      }
      const okPassword = await checkPassword(
        updatedInput.password,
        existingUser.password,
      );
      if (!okPassword) {
        throw new AppError(400, "Invalid password");
      }
    }

    const newEmailNormalized = updatedInput.newEmail.toLowerCase().trim();

    const existingEmail = await userRepo.findByEmail(newEmailNormalized);
    if (existingEmail && existingEmail.id !== existingUser.id) {
      throw new AppError(409, "User with email already exists.");
    }
    if (newEmailNormalized === existingUser.email) {
      throw new AppError(400, "New email must be different from current email");
    }

    if (existingUser.twoFactorEnabled) {
      if (!updatedInput.twoFactorCode) {
        throw new AppError(400, "Missing 2FA code");
      }

      if (!existingUser.twoFactorSecret) {
        throw new AppError(400, "Two factor misconfigured for this account");
      }

      const result = await otp.verify({
        secret: existingUser.twoFactorSecret,
        token: updatedInput.twoFactorCode,
      });

      if (!result.valid) {
        throw new AppError(400, "Invalid 2FA code");
      }
    }
    const emailVerificationToken = generateRandomToken();
    const emailVerificationExpiresAt = new Date(
      Date.now() + 24 * 60 * 60 * 1000,
    );

    const { updatedUser, emailVerification } = await prisma.$transaction(
      async (trx) => {
        const updated = await userRepo.update(
          existingUser.id,
          {
            email: newEmailNormalized,
          },
          trx,
        );

        await userRepo.unmarkEmailVerified(existingUser.id, trx);
        await authRepository.deleteEmailVerificationByUserId(
          existingUser.id,
          trx,
        );

        const hashedEmailVerificationToken = hashToken(emailVerificationToken);

        const verification = await authRepository.createEmailVerificationToken(
          {
            tokenHash: hashedEmailVerificationToken,
            userId: existingUser.id,
            expiresAt: emailVerificationExpiresAt,
          },
          trx,
        );

        return {
          updatedUser: updated,
          emailVerification: verification,
        };
      },
    );

    const encodedToken = encodeURIComponent(emailVerificationToken);
    const verifyUrl = `${getServerUrl()}/auth/email/verify?token=${encodedToken}`;

    await sendEmail(
      updatedUser.email,
      "Verify your email",
      `
        <h2>Verify your email</h2>

        <p>Hello ${escapeHtml(updatedUser.name ?? "there")},</p>

        <p>
          Please click the button below to verify your email.
        </p>

        <p>
          <a
            href="${verifyUrl}"
            style="
              display:inline-block;
              padding:10px 16px;
              background:#007bff;
              color:white;
              text-decoration:none;
              border-radius:5px;
            "
          >
            Verify Email
          </a>
        </p>

        <p>
          This link expires in 24 hours.
        </p>
      `,
    );

    return {
      updatedUser,
      emailVerification,
    };
  }

  async delete(userId: string, password?: string, twoFactorCode?: string) {
    const user = await userRepo.findById(userId);
    if (!user) {
      throw new AppError(404, "User not found");
    }

    if (user.password) {
      if (!password) {
        throw new AppError(
          400,
          "You must entered your password to delete your account",
        );
      }
      const isValidPassword = await checkPassword(password, user.password);

      if (!isValidPassword) {
        throw new AppError(400, "Invalid password");
      }
    }

    if (user.twoFactorEnabled) {
      if (!twoFactorCode) {
        throw new AppError(400, "Two factor code is missing");
      }

      if (!user.twoFactorSecret) {
        throw new AppError(400, "Two factor misconfigured for this account");
      }

      const result = await otp.verify({
        secret: user.twoFactorSecret,
        token: twoFactorCode,
      });

      if (!result.valid) {
        throw new AppError(400, "Invalid 2FA code");
      }
    }

    const deletedUser = await prisma.$transaction(async (trx) => {
      return userRepo.delete(user.id, trx);
    });

    return deletedUser;
  }

  async listAllSessions(userId: string, page = 1, pageSize = 20) {
    const safePage = Math.max(1, page);
    const safePageSize = Math.min(Math.max(1, pageSize), 100);

    const user = await userRepo.findById(userId);

    if (!user) {
      throw new AppError(404, "User not found");
    }

    // const refreshTokens = await authRepository.findRefreshTokenByUserId(userId);
    const { refreshTokens, total } =
      await authRepository.findRefreshTokenByUserId(userId, {
        skip: (safePage - 1) * safePageSize,
        take: safePageSize,
      });

    return {
      userId,
      sessions: refreshTokens.map(UserMapper.toPublicSessionDto),
      pagination: {
        page: safePage,
        pageSize: safePageSize,
        total,
        totalPages: Math.ceil(total / safePageSize),
      },
    };
  }

  async deleteSession(userId: string, sessionId: string) {
    const user = await userRepo.findById(userId);
    if (!user) {
      throw new AppError(404, "User not found");
    }

    const refreshToken = await authRepository.findRefreshTokenById(sessionId);
    if (!refreshToken || refreshToken.userId !== userId) {
      throw new AppError(404, "No sessions found");
    }

    await authRepository.revokeRefreshToken(refreshToken.id);
    // await prisma.$transaction(async (trx) => {
    //   await authRepository.revokeRefreshToken(refreshToken.id);
    // });

    return refreshToken;
  }

  async listUsers(page = 1, pageSize = 20) {
    const safePage = Math.max(1, page);
    const safePageSize = Math.min(Math.max(1, pageSize), 100);

    const { users, total } = await userRepo.findAll({
      skip: (safePage - 1) * safePageSize,
      take: safePageSize,
    });

    return {
      users: users.map(UserMapper.toPublicUserDto),
      pagination: {
        page: safePage,
        pageSize: safePageSize,
        total,
        totalPages: Math.ceil(total / safePageSize),
      },
    };
  }

  async getUser(id: string) {
    const user = await userRepo.findById(id);

    if (!user) {
      throw new AppError(404, "User not found");
    }
    const roles = await roleRepo.findUserRole(user.id);
    const userRoles = roles.map((r) => r.role.name);

    const userWithRoles = {
      ...user,
      roles: userRoles,
    };
    return UserMapper.toPublicUserDto(userWithRoles);
  }

  async updateUser(
    userId: string,
    updateDto: {
      name?: string;
      email?: string;
      password?: string;
      avatarUrl?: string;
      isEmailVerified?: boolean;
    },
  ) {
    const user = await userRepo.findById(userId);

    if (!user) {
      throw new AppError(404, "User not found");
    }

    const data: {
      name?: string;
      email?: string;
      password?: string;
      avatarUrl?: string;
    } = {};

    if (updateDto.name !== undefined) {
      data.name = updateDto.name;
    }

    if (updateDto.email !== undefined) {
      const normalizedEmail = updateDto.email.toLowerCase().trim();

      if (normalizedEmail !== user.email) {
        const existingUser = await userRepo.findByEmail(normalizedEmail);

        if (existingUser && existingUser.id !== user.id) {
          throw new AppError(409, "Email already exists");
        }

        data.email = normalizedEmail;
      }
    }

    if (updateDto.avatarUrl !== undefined) {
      data.avatarUrl = updateDto.avatarUrl;
    }

    if (updateDto.password !== undefined) {
      data.password = await hashPassword(updateDto.password);
    }

    const updatedUser = await prisma.$transaction(async (trx) => {
      if (updateDto.isEmailVerified !== undefined) {
        if (updateDto.isEmailVerified) {
          await userRepo.markEmailVerified(user.id, trx);
        } else {
          await userRepo.unmarkEmailVerified(user.id, trx);
        }
      }

      return userRepo.update(userId, data, trx);
    });

    return UserMapper.toPublicUserDto(updatedUser);
  }
  async deleteUser(userId: string) {
    const user = await userRepo.findById(userId);

    if (!user) {
      throw new AppError(404, "User not found");
    }

    await userRepo.delete(userId);
  }
}

export const userService = new UserService();
