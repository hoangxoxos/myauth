import { prisma } from "../../config/prisma.js";

class AuthRepository {
  async createRefreshToken(data: {
    tokenHash: string;
    userId: string;
    userAgent?: string;
    ipAddress?: string;
    expiresAt: Date;
  }) {
    return prisma.refreshToken.create({
      data: {
        token: data.tokenHash,
        userId: data.userId,
        userAgent: data.userAgent,
        ipAddress: data.ipAddress,
        expiresAt: data.expiresAt,
      },
    });
  }

  async findRefreshTokenByHash(tokenHash: string) {
    return prisma.refreshToken.findUnique({ where: { token: tokenHash } });
  }

  async revokeRefreshToken(id: string) {
    return prisma.refreshToken.update({
      where: { id },
      data: { isRevoked: true },
    });
  }

  async revokeAllRefreshtokenForUser(userId: string) {
    return prisma.refreshToken.updateMany({
      where: { id: userId },
      data: {
        isRevoked: true,
      },
    });
  }

  // email verification
  async createEmailVerificationToken(data: {
    tokenHash: string;
    userId: string;
    expiresAt: Date;
  }) {
    return prisma.emailVerificationToken.create({
      data: {
        token: data.tokenHash,
        userId: data.userId,
        expiresAt: data.expiresAt,
      },
    });
  }

  async findEmailVerificationToken(tokenHash: string) {
    return prisma.emailVerificationToken.findUnique({
      where: { token: tokenHash },
    });
  }

  // password reset
  async createPasswordResetToken(data: {
    tokenHash: string;
    userId: string;
    expiresAt: Date;
  }) {
    return prisma.passwordResetToken.create({
      data: {
        token: data.tokenHash,
        userId: data.userId,
        expiresAt: data.expiresAt,
      },
    });
  }

  async findPasswordResetToken(tokenHash: string) {
    return prisma.passwordResetToken.findUnique({
      where: { token: tokenHash },
    });
  }

  async markPasswordResetTokenUsed(id: string) {
    return prisma.passwordResetToken.update({
      where: { id },
      data: { used: true },
    });
  }

  // OAuth
  async findOAuthAccount(provider: string, providerUserId: string) {
    return prisma.oAuthAccount.findUnique({
      where: { provider_providerUserId: { provider, providerUserId } },
    });
  }

  async createOAuthAccount(data: {
    provider: string;
    providerUserId: string;
    userId: string;
  }) {
    return prisma.oAuthAccount.create({
      data,
    });
  }
}

export const authRepository = new AuthRepository();

// // src/modules/auth/auth.service.ts
// export class AuthService {
//   constructor(
//     private userRepo: UserRepository,
//     private authRepo: AuthRepository
//   ) {}

//   async login(email: string, password: string) {
//     const user = await this.userRepo.findByEmail(email); // uses UserRepository
//     // ...check password...
//     const refreshToken = await this.authRepo.createRefreshToken({ ... }); // uses AuthRepository
//     // ...
//   }
// }
