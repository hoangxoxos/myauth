import { Prisma } from "../../../generated/prisma/client.js";
import { DbClient, prisma } from "../../config/prisma.js";

class AuthRepository {
  private getClient(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? prisma;
  }

  async createRefreshToken(
    data: {
      tokenHash: string;
      userId: string;
      userAgent?: string;
      ipAddress?: string;
      expiresAt: Date;
    },
    tx?: Prisma.TransactionClient,
  ) {
    return this.getClient(tx).refreshToken.create({
      data: {
        token: data.tokenHash,
        userId: data.userId,
        userAgent: data.userAgent,
        ipAddress: data.ipAddress,
        expiresAt: data.expiresAt,
      },
    });
  }

  async findRefreshTokenByHash(
    tokenHash: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getClient(tx).refreshToken.findUnique({
      where: { token: tokenHash },
    });
  }

  async revokeRefreshToken(id: string, tx?: Prisma.TransactionClient) {
    return this.getClient(tx).refreshToken.update({
      where: { id },
      data: { isRevoked: true },
    });
  }

  async revokeAllRefreshtokenForUser(
    userId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getClient(tx).refreshToken.updateMany({
      where: { id: userId },
      data: {
        isRevoked: true,
      },
    });
  }

  // email verification
  async createEmailVerificationToken(
    data: {
      tokenHash: string;
      userId: string;
      expiresAt: Date;
    },
    tx?: Prisma.TransactionClient,
  ) {
    return this.getClient(tx).emailVerificationToken.create({
      data: {
        token: data.tokenHash,
        userId: data.userId,
        expiresAt: data.expiresAt,
      },
    });
  }

  async findEmailVerificationToken(
    tokenHash: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getClient(tx).emailVerificationToken.findUnique({
      where: { token: tokenHash },
    });
  }

  // password reset
  async createPasswordResetToken(
    data: {
      tokenHash: string;
      userId: string;
      expiresAt: Date;
    },
    tx?: Prisma.TransactionClient,
  ) {
    return this.getClient(tx).passwordResetToken.create({
      data: {
        token: data.tokenHash,
        userId: data.userId,
        expiresAt: data.expiresAt,
      },
    });
  }

  async findPasswordResetToken(
    tokenHash: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getClient(tx).passwordResetToken.findUnique({
      where: { token: tokenHash },
    });
  }

  async markPasswordResetTokenUsed(id: string, tx?: Prisma.TransactionClient) {
    return this.getClient(tx).passwordResetToken.update({
      where: { id },
      data: { used: true },
    });
  }

  // OAuth
  async findOAuthAccount(
    provider: string,
    providerUserId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getClient(tx).oAuthAccount.findUnique({
      where: { provider_providerUserId: { provider, providerUserId } },
    });
  }

  async createOAuthAccount(
    data: {
      provider: string;
      providerUserId: string;
      userId: string;
    },
    tx?: Prisma.TransactionClient,
  ) {
    return this.getClient(tx).oAuthAccount.create({
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
