import { Prisma } from "../../../generated/prisma/client.js";
import { DbClient, prisma } from "../../config/prisma.js";
import { roleRepo } from "../role/role.repository.js";

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

  async revokeRefreshTokenIfActive(
    id: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getClient(tx).refreshToken.updateMany({
      where: { id, isRevoked: false },
      data: { isRevoked: true },
    });
  }

  async revokeAllRefreshTokenForUser(
    userId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getClient(tx).refreshToken.updateMany({
      where: { userId },
      data: {
        isRevoked: true,
      },
    });
  }

  async deleteRefreshTokenByUserId(
    userId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getClient(tx).refreshToken.deleteMany({ where: { userId } });
  }

  async findRefreshTokenByUserId(
    userId: string,
    params: { skip?: number; take?: number },
    tx?: Prisma.TransactionClient,
  ) {
    const { skip = 0, take = 20 } = params;

    const [refreshTokens, total] = await Promise.all([
      this.getClient(tx).refreshToken.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
        skip,
        take,
      }),
      this.getClient(tx).refreshToken.count({ where: { userId } }),
    ]);

    return { refreshTokens, total };
  }

  async findRefreshTokenById(id: string, tx?: Prisma.TransactionClient) {
    return this.getClient(tx).refreshToken.findUnique({ where: { id } });
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

  async deleteEmailVerificationById(id: string, tx?: Prisma.TransactionClient) {
    return this.getClient(tx).emailVerificationToken.delete({ where: { id } });
  }

  async deleteEmailVerificationByUserId(
    userId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getClient(tx).emailVerificationToken.deleteMany({
      where: { userId },
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

  async consumePasswordResetToken(
    id: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getClient(tx).passwordResetToken.updateMany({
      where: {
        id,
        used: false,
        expiresAt: { gt: new Date() },
      },
      data: { used: true },
    });
  }

  async deletePasswordResetTokensByUserId(
    userId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getClient(tx).passwordResetToken.deleteMany({
      where: { userId },
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

  async findOAuthAccountByUserId(
    userId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getClient(tx).oAuthAccount.findFirst({ where: { userId } });
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

  async deleteOAuthAccount(id: string, tx?: Prisma.TransactionClient) {
    return this.getClient(tx).oAuthAccount.delete({ where: { id } });
  }

  async setup2FA(
    data: { userId: string; secret: string },
    tx?: Prisma.TransactionClient,
  ) {
    return this.getClient(tx).user.update({
      where: { id: data.userId },
      data: {
        twoFactorSecret: data.secret,
        twoFactorEnabled: false,
      },
    });
  }

  async enable2FA(data: { userId: string }, tx?: Prisma.TransactionClient) {
    return this.getClient(tx).user.update({
      where: { id: data.userId },
      data: {
        twoFactorEnabled: true,
      },
    });
  }

  async disable2FA(data: { userId: string }, tx?: Prisma.TransactionClient) {
    return this.getClient(tx).user.update({
      where: { id: data.userId },
      data: {
        twoFactorEnabled: false,
      },
    });
  }

  async getUserPermissions(userId: string) {
    const userRoles = await roleRepo.findUserRole(userId);
    const roleIds = userRoles.map((role) => role.role.id);

    if (roleIds.length === 0) {
      return [];
    }

    const permissions = await prisma.rolePermission.findMany({
      where: {
        roleId: {
          in: roleIds,
        },
      },
      select: {
        permission: {
          select: {
            name: true,
          },
        },
      },
    });

    return permissions.map((entry) => entry.permission.name);
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
