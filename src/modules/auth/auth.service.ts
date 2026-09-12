import { AppError } from "../../common/errors/AppError.js";
import { getServerUrl } from "../../common/utils/app-url.js";
import { sendEmail } from "../../common/utils/email.js";
import { checkPassword, hashPassword } from "../../common/utils/hash.js";
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
import { OTP } from "otplib";

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

        <p>Hello ${user.name ?? "there"},</p>

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
      // Date.now() + 24 * 60 * 60 * 1000,
      Date.now() + 300000,
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

        <p>Hello ${user.name ?? "there"},</p>

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

    const userPermissions = undefined;

    // Access and refresh token
    const accessToken = await signAccessToken({
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
}

export const authService = new AuthService();
