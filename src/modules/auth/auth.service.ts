import { AppError } from "../../common/errors/AppError.js";
import { escapeHtml } from "../../common/utils/html.js";
import { getServerUrl } from "../../common/utils/app-url.js";
import { sendEmail } from "../../common/utils/email.js";
import { checkPassword, hashPassword } from "../../common/utils/hash.js";
import { getGoogleClient } from "../../common/utils/oauth-google.js";
import {
  generateRandomToken,
  generateRefreshToken,
  hashToken,
  signAccessToken,
} from "../../common/utils/token.js";
import { env } from "../../config/env.js";
import { prisma } from "../../config/prisma.js";
import { roleRepo } from "../role/role.repository.js";
import { userRepo } from "../user/user.repository.js";
import { authRepository } from "./auth.repository.js";
import { generate, OTP } from "otplib";
import { GoogleUserInfo } from "./auth.types.js";

const otp = new OTP();

const REFRESH_TOKEN_TTL_DAYS = 30;

class AuthService {
  async register(email: string, password: string, name: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedName = name.trim();

    const existingUser = await userRepo.findByEmail(normalizedEmail);
    if (existingUser) {
      throw new AppError(
        409,
        "Email is already in use. Please try with a different email",
      );
    }

    const passwordHash = await hashPassword(password);
    const emailVerificationToken = generateRandomToken();
    const emailVerificationTokenHashed = hashToken(emailVerificationToken);
    const emailVerificationExpiresAt = new Date(
      Date.now() + 24 * 60 * 60 * 1000,
    );

    const { user, defaultRole, userRole, emailVerification } =
      await prisma.$transaction(async (trx) => {
        const defaultRole = await roleRepo.findRoleByName("USER", trx);

        if (!defaultRole) {
          throw new AppError(500, "Default role 'USER' is not configured");
        }
        const newUser = await userRepo.create(
          {
            email: normalizedEmail,
            password: passwordHash,
            name: normalizedName,
          },
          trx,
        );

        const newUserRole = await roleRepo.createUserRole(
          newUser.id,
          defaultRole.id,
          trx,
        );

        const newVerification =
          await authRepository.createEmailVerificationToken(
            {
              tokenHash: emailVerificationTokenHashed,
              userId: newUser.id,
              expiresAt: emailVerificationExpiresAt,
            },
            trx,
          );

        return {
          user: newUser,
          defaultRole,
          userRole: newUserRole,
          emailVerification: newVerification,
        };
      });

    const encodedToken = encodeURIComponent(emailVerificationToken);
    const verifyUrl = `${getServerUrl()}/auth/email/verify?token=${encodedToken}`;

    await sendEmail(
      user.email,
      "Verify your email",
      `
        <h2>Verify your email</h2>

        <p>Hello ${escapeHtml(user.name ?? "there")},</p>

        <p>
          Thank you for registering.
          Please click the button below to verify your email address.
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
          Or copy this link into your browser:
        </p>

        <p>
          ${verifyUrl}
        </p>

        <p>
          This link expires in 24 hours.
        </p>
      `,
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: {
          name: defaultRole.name,
          description: defaultRole.description,
          assignedAt: userRole.assignedAt,
        },
        isEmailVerified: user.isEmailVerified,
        twoFactorEnabled: user.twoFactorEnabled,
        createdAt: user.createdAt,
        avatarUrl: user.avatarUrl,
      },
      emailVerificationExpiresAt: emailVerification.expiresAt,
    };
  }

  async sendEmailVerification(email: string) {
    const normalizedEmail = email.toLowerCase().trim();

    const user = await userRepo.findByEmail(normalizedEmail);
    if (!user) {
      throw new AppError(
        200,
        "If the email exists and is not verified, a verification email has been sent.",
      );
    }

    if (user.isEmailVerified) {
      throw new AppError(200, "Email is already verified");
    }

    // save token hash
    const emailVerificationExpiresAt = new Date(
      Date.now() + 24 * 60 * 60 * 1000,
      // Date.now() + 300000,
    );

    const { emailVerificationToken, emailVerification } =
      await prisma.$transaction(async (trx) => {
        await authRepository.deleteEmailVerificationByUserId(user.id, trx);

        const rawToken = generateRandomToken();
        const tokenHash = hashToken(rawToken);

        const verification = await authRepository.createEmailVerificationToken(
          {
            tokenHash: tokenHash,
            userId: user.id,
            expiresAt: emailVerificationExpiresAt,
          },
          trx,
        );

        return {
          emailVerificationToken: rawToken,
          emailVerification: verification,
        };
      });

    const encodedToken = encodeURIComponent(emailVerificationToken);
    const verifyUrl = `${getServerUrl()}/auth/email/verify?token=${encodedToken}`;

    await sendEmail(
      user.email,
      "Verify your email",
      `
        <h2>Verify your email</h2>

        <p>Hello ${escapeHtml(user.name ?? "there")},</p>

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
      message: "Verification email sent successfully",
      emailVerificationExpiresAt,
    };
  }

  async verifyEmail(token: string) {
    const tokenHash = hashToken(token);

    const emailVerification =
      await authRepository.findEmailVerificationToken(tokenHash);

    if (!emailVerification) {
      throw new AppError(404, "Invalid email verification token");
    }

    if (emailVerification.expiresAt < new Date()) {
      throw new AppError(400, "Email verification token has expired");
    }

    const result = await prisma.$transaction(async (trx) => {
      const user = await userRepo.markEmailVerified(
        emailVerification.userId,
        trx,
      );

      await authRepository.deleteEmailVerificationById(
        emailVerification.id,
        trx,
      );

      return user;
    });

    return {
      name: result.name,
      email: result.email,
      isEmailVerified: result.isEmailVerified,
      twoFactorEnabled: result.twoFactorEnabled,
    };
  }

  async login(
    email: string,
    password: string,
    twoFactorCode?: string,
    userAgent?: string,
    ipAddress?: string,
  ) {
    const normalizedEmail = email.toLowerCase().trim();

    const user = await userRepo.findByEmail(normalizedEmail);
    if (!user) {
      await checkPassword(password, "1235891625812kj5b1kbtwekbtkewtewt");
      throw new AppError(400, "Invalid email or password");
    }

    if (!user.password) {
      throw new AppError(
        400,
        "This account uses social login. Please sign in with Google.",
      );
    }

    const okPassword = await checkPassword(password, user.password);
    if (!okPassword) {
      throw new AppError(400, "Invalid email or password");
    }

    if (!user.isEmailVerified) {
      throw new AppError(403, "Please verify your email before logging in");
    }

    if (user.twoFactorEnabled) {
      if (!twoFactorCode) {
        throw new AppError(400, "Two factor code is missing");
      }

      if (!user.twoFactorSecret) {
        throw new AppError(400, "Two factor misconfigured for this account");
      }
      // verify 2fa code
      const result = await otp.verify({
        secret: user.twoFactorSecret,
        token: twoFactorCode,
      });
      if (!result.valid) {
        throw new AppError(400, "Invalid 2FA code");
      }
    }

    const userRoles = await roleRepo.findUserRole(user.id);
    const userRolesName = userRoles.map((r) => {
      return r.role.name;
    });
    const userPermissions = await authRepository.getUserPermissions(user.id);
    console.log(userPermissions);

    // Access and refresh token
    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      roles: userRolesName,
      permissions: userPermissions,
    });

    const rawRefreshToken = generateRefreshToken();
    const hashedRefreshToken = hashToken(rawRefreshToken);
    const refreshTokenExpiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    );

    const refreshToken = await authRepository.createRefreshToken({
      tokenHash: hashedRefreshToken,
      userId: user.id,
      userAgent,
      ipAddress,
      expiresAt: refreshTokenExpiresAt,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isEmailVerified: user.isEmailVerified,
        twoFactorEnabled: user.twoFactorEnabled,
        avatarUrl: user.avatarUrl,
      },
      accessToken: {
        token: accessToken,
      },
      // return this to controller to set to the cookie
      refreshToken: {
        rawToken: rawRefreshToken,
        isRevoked: refreshToken.isRevoked,
        userAgent: refreshToken.userAgent,
        ipAddress: refreshToken.ipAddress,
        createdAt: refreshToken.createdAt,
        expiresAt: refreshToken.expiresAt,
      },
    };
  }

  async setup2FA(userId: string) {
    const user = await userRepo.findById(userId);

    if (!user) {
      throw new AppError(404, "User not found");
    }

    const twoFASecret = otp.generateSecret();
    const issuer = "My Auth App";
    const otpAuthUrl = otp.generateURI({
      secret: twoFASecret,
      issuer,
      label: user.email,
    });

    const setup2FAResult = await authRepository.setup2FA({
      userId: user.id,
      secret: twoFASecret,
    });

    return {
      setup2FAResult,
      otpAuthUrl,
      secret: twoFASecret,
    };
  }

  async enable2FA(userId: string, code: string) {
    const user = await userRepo.findById(userId);

    if (!user) {
      throw new AppError(404, "User not found");
    }

    if (!user.twoFactorSecret) {
      throw new AppError(400, "User don't have 2FA setup yet");
    }

    if (user.twoFactorEnabled) {
      throw new AppError(400, "User already enable 2FA");
    }

    // Prove the user's authenticator app actually works with this secret
    // before turning 2FA on. Without this check, a typo'd secret locks
    // the user out on next login.
    const result = await otp.verify({
      secret: user.twoFactorSecret,
      token: code,
    });

    if (!result.valid) {
      throw new AppError(400, "Invalid 2FA code");
    }

    const updated = await authRepository.enable2FA({ userId: user.id });

    return {
      id: updated.id,
      email: updated.email,
      isEmailVerified: updated.isEmailVerified,
      twoFactorEnable: updated.twoFactorEnabled,
    };
  }

  async disable2FA(userId: string, password: string, code: string) {
    const user = await userRepo.findById(userId);

    if (!user) {
      throw new AppError(404, "User not found");
    }

    if (!user.twoFactorSecret) {
      throw new AppError(400, "User don't have 2FA setup yet");
    }

    if (!user.twoFactorEnabled) {
      throw new AppError(400, "User 2FA have not enabled yet");
    }

    // Re-auth: require current password. Without this, a stolen access
    // token alone is enough to strip away the user's second security layer.
    if (!user.password) {
      throw new AppError(
        400,
        "This account uses social login and has no password set",
      );
    }

    const okPassword = await checkPassword(password, user.password);
    if (!okPassword) {
      throw new AppError(400, "Invalid password");
    }

    // Also require a valid current 2FA code, not just the password.
    // This confirms the person disabling 2FA still holds the authenticator
    // device, not just a copy-pasted/leaked password.
    const result = await otp.verify({
      secret: user.twoFactorSecret,
      token: code,
    });

    if (!result.valid) {
      throw new AppError(400, "Invalid 2FA code");
    }

    const updated = await authRepository.disable2FA({ userId: user.id });

    return {
      id: updated.id,
      email: updated.email,
      isEmailVerified: updated.isEmailVerified,
      twoFactorEnable: updated.twoFactorEnabled,
    };
  }

  async refresh(token: string, userAgent?: string, ipAddress?: string) {
    const tokenHash = hashToken(token);
    const refreshToken = await authRepository.findRefreshTokenByHash(tokenHash);

    if (!refreshToken) {
      throw new AppError(401, "Invalid refresh token");
    }

    if (refreshToken.expiresAt < new Date()) {
      throw new AppError(401, "Refresh token has expired");
    }

    // catch reuse already-rotated token
    if (refreshToken.isRevoked) {
      // old token used -> possible theft, revoke all sessions for this user
      await authRepository.revokeAllRefreshTokenForUser(refreshToken.userId);
      throw new AppError(401, "Invalid refresh token");
    }

    const user = await userRepo.findById(refreshToken.userId);
    if (!user) {
      throw new AppError(401, "User not found");
    }

    const userRoles = await roleRepo.findUserRole(user.id);
    const userRolesName = userRoles.map((r) => {
      return r.role.name;
    });
    const userPermissions = await authRepository.getUserPermissions(user.id);

    const accessToken = await signAccessToken({
      sub: user.id,
      email: user.email,
      roles: userRolesName,
      permissions: userPermissions,
    });

    const newRawRefreshToken = generateRandomToken();
    const newHashedRefreshToken = hashToken(newRawRefreshToken);
    const newRefreshTokenExpiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    );
    const newRefreshToken = await prisma.$transaction(async (trx) => {
      const revoked = await authRepository.revokeRefreshTokenIfActive(
        refreshToken.id,
        trx,
      );

      if (revoked.count === 0) {
        return null;
      }

      return authRepository.createRefreshToken(
        {
          tokenHash: newHashedRefreshToken,
          userId: user.id,
          userAgent,
          ipAddress,
          expiresAt: newRefreshTokenExpiresAt,
        },
        trx,
      );
    });

    if (!newRefreshToken) {
      await authRepository.revokeAllRefreshTokenForUser(refreshToken.userId);
      throw new AppError(401, "Invalid refresh token");
    }

    return {
      accessToken,
      refreshToken: {
        token: newRawRefreshToken,
        expiresAt: newRefreshToken.expiresAt,
        userAgent: newRefreshToken.userAgent,
        ipAddress: newRefreshToken.ipAddress,
      },
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isEmailVerified: user.isEmailVerified,
        twoFactorEnabled: user.twoFactorEnabled,
      },
    };
  }

  async logout(token: string, userId: string) {
    const tokenHash = hashToken(token);
    const refreshToken = await authRepository.findRefreshTokenByHash(tokenHash);

    if (!refreshToken) {
      throw new AppError(401, "Invalid refresh token");
    }

    if (refreshToken.userId !== userId) {
      throw new AppError(403, "Refresh token does not belong to this user");
    }

    if (refreshToken.isRevoked) {
      return { success: true };
    }

    if (refreshToken.expiresAt < new Date()) {
      return { success: true };
    }

    await authRepository.revokeRefreshToken(refreshToken.id);
    return { success: true };
  }

  async logoutAll(userId: string) {
    const user = await userRepo.findById(userId);
    if (!user) {
      throw new AppError(404, "User not found");
    }

    return await authRepository.revokeAllRefreshTokenForUser(userId);
  }

  async forgotPassword(email: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await userRepo.findByEmail(normalizedEmail);

    const genericMessage =
      "If an account with this email exists, we will send you a reset link";

    if (!user) {
      return { message: genericMessage };
    }

    // todo: let oauth user choose to create password or throw AppError

    const rawToken = generateRandomToken();
    const tokenHash = hashToken(rawToken);
    const passwordResetExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.$transaction(async (trx) => {
      await authRepository.deletePasswordResetTokensByUserId(user.id, trx);
      await authRepository.createPasswordResetToken(
        {
          tokenHash,
          userId: user.id,
          expiresAt: passwordResetExpiresAt,
        },
        trx,
      );
    });

    const encodedToken = encodeURIComponent(rawToken);
    const resetUrl = `${getServerUrl()}/auth/password/reset?token=${encodedToken}`;

    await sendEmail(
      user.email,
      "Reset your password",
      `
      <h2>Reset your password</h2>

      <p>Hello ${escapeHtml(user.name ?? "there")},</p>

      <p>This is your reset password link.</p>

      <p>${escapeHtml(resetUrl)}</p>
      
        <p>
          This link expires in 24 hours.
        </p>
      `,
    );

    return {
      message: genericMessage,
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const tokenHash = hashToken(token);

    const passwordReset =
      await authRepository.findPasswordResetToken(tokenHash);

    if (!passwordReset) {
      throw new AppError(400, "Invalid or expired reset password token");
    }

    if (passwordReset.used || passwordReset.expiresAt < new Date()) {
      throw new AppError(400, "Invalid or expired reset password token");
    }

    const user = await userRepo.findById(passwordReset.userId);
    if (!user) {
      throw new AppError(400, "Invalid or expired reset password token");
    }

    const newPasswordHash = await hashPassword(newPassword);

    const result = await prisma.$transaction(async (trx) => {
      const consumed = await authRepository.consumePasswordResetToken(
        passwordReset.id,
        trx,
      );

      if (consumed.count === 0) {
        throw new AppError(400, "Invalid or expired reset password token");
      }

      await userRepo.update(user.id, { password: newPasswordHash }, trx);

      await authRepository.revokeAllRefreshTokenForUser(user.id, trx);

      return {
        message: "Password reset successfully. Please login to continue",
      };
    });

    return {
      result,
    };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    twoFactorCode?: string,
  ) {
    const user = await userRepo.findById(userId);
    if (!user) {
      throw new AppError(404, "User not found");
    }

    if (!user.password) {
      throw new AppError(
        400,
        "This account uses social login and has no password set",
      );
    }

    const isValidPassword = await checkPassword(currentPassword, user.password);

    if (!isValidPassword) {
      throw new AppError(400, "Invalid password");
    }

    // 2fa check
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

    const newPasswordHash = await hashPassword(newPassword);
    const transactionResult = await prisma.$transaction(async (trx) => {
      const updatedUser = await userRepo.update(
        user.id,
        { password: newPasswordHash },
        trx,
      );

      const revokeRefreshTokenResult =
        await authRepository.revokeAllRefreshTokenForUser(user.id, trx);

      return {
        updatedUser,
        revokeRefreshTokenResult,
      };
    });

    return transactionResult;
  }

  async getGoogleClientUrl() {
    const client = getGoogleClient();
    const url = client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: ["openid", "email", "profile"],
    });

    return url;
  }

  async googleCallback(code: string) {
    const client = getGoogleClient();

    const { tokens } = await client.getToken(code);

    if (!tokens.id_token) {
      throw new AppError(400, "No google id_token is present");
    }

    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = payload?.email;
    const emailVerified = payload?.email_verified;

    if (!email || !emailVerified) {
      throw new AppError(400, "Google email account is not verified");
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await userRepo.findByEmail(normalizedEmail);

    if (!user) {
      // register for the first time
    }
  }

  /**
   * Handles login/signup via Google.
   * Three cases:
   *  1. OAuthAccount already linked -> log that user in
   *  2. No link, but a User with this email exists -> link Google to it
   *  3. Neither exists -> create a new User + OAuthAccount
   */
  async loginWithGoogle(
    googleUser: GoogleUserInfo,
    userAgent?: string,
    ipAddress?: string,
  ) {
    if (!googleUser.verified_email) {
      throw new AppError(400, "Google account email is not verified");
    }

    const normalizedEmail = googleUser.email.toLowerCase().trim();
    const user = await prisma.$transaction(async (trx) => {
      // case 1: google account was already linked before
      const existingLink = await authRepository.findOAuthAccount(
        "google",
        googleUser.id,
        trx,
      );

      if (existingLink) {
        const linkedUser = await userRepo.findById(existingLink.userId, trx);
        if (!linkedUser) {
          throw new AppError(500, "Linked user no longer exists");
        }

        return linkedUser;
      }

      // case 2: no link yet - check if a user already exist with this email
      const existingUser = await userRepo.findByEmail(normalizedEmail, trx);

      if (existingUser) {
        await authRepository.createOAuthAccount(
          {
            provider: "google",
            providerUserId: googleUser.id,
            userId: existingUser.id,
          },
          trx,
        );

        return existingUser;
      }

      // case 3: brand new user, no password (OAuth only account)
      const newUser = await userRepo.create(
        {
          email: normalizedEmail,
          name: googleUser.name,
          avatarUrl: googleUser.picture,
          isEmailVerified: true,
        },
        trx,
      );

      const defaultRole = await roleRepo.findRoleByName("USER", trx);
      if (!defaultRole) {
        throw new AppError(500, "Default role 'USER' is not configured");
      }

      await roleRepo.createUserRole(newUser.id, defaultRole.id, trx);

      await authRepository.createOAuthAccount(
        {
          provider: "google",
          providerUserId: googleUser.id,
          userId: newUser.id,
        },
        trx,
      );

      return newUser;
    });

    // identical normal login - issue token
    const userRoles = await roleRepo.findUserRole(user.id);
    const userRolesName = userRoles.map((r) => r.role.name);
    const userPermissions = await authRepository.getUserPermissions(user.id);

    const accessToken = await signAccessToken({
      sub: user.id,
      email: user.email,
      roles: userRolesName,
      permissions: userPermissions,
    });

    const rawRefreshToken = generateRandomToken();
    const hashedRefreshToken = hashToken(rawRefreshToken);
    const refreshTokenExpiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    );

    const refreshToken = await authRepository.createRefreshToken({
      tokenHash: hashedRefreshToken,
      userId: user.id,
      userAgent,
      ipAddress,
      expiresAt: refreshTokenExpiresAt,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        isEmailVerified: user.isEmailVerified,
      },
      accessToken,
      refreshToken: {
        rawToken: rawRefreshToken,
        expiresAt: refreshToken.expiresAt,
      },
    };
  }
}

export const authService = new AuthService();
