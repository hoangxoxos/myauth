import { Prisma } from "../../../generated/prisma/client.js";
import { DbClient, prisma } from "../../config/prisma.js";

export class UserRepository {
  private getClient(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? prisma;
  }

  async findAll(
    params: { skip?: number; take?: number },
    tx?: Prisma.TransactionClient,
  ) {
    const { skip = 0, take = 20 } = params;

    const [rawUsers, total] = await Promise.all([
      this.getClient(tx).user.findMany({
        include: {
          userRoles: {
            include: {
              role: {
                select: {
                  name: true,
                },
              },
            },
          },
        },

        orderBy: { createdAt: "asc" },
        skip,
        take,
      }),
      this.getClient(tx).user.count(),
    ]);

    const users = rawUsers.map(({ userRoles, ...user }) => ({
      ...user,
      roles: userRoles.map((ur) => ur.role.name),
    }));

    return { users, total };
  }

  async findById(id: string, tx?: Prisma.TransactionClient) {
    return this.getClient(tx).user.findUnique({ where: { id } });
  }

  async findByEmail(email: string, tx?: Prisma.TransactionClient) {
    return this.getClient(tx).user.findUnique({ where: { email } });
  }

  async create(
    data: {
      email: string;
      password?: string;
      name?: string;
      avatarUrl?: string;
      isEmailVerified?: boolean;
    },
    tx?: Prisma.TransactionClient,
  ) {
    return this.getClient(tx).user.create({ data });
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      avatarUrl: string;
      email: string;
      password: string;
    }>,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getClient(tx).user.update({ where: { id }, data });
  }

  async delete(id: string, tx?: Prisma.TransactionClient) {
    return this.getClient(tx).user.delete({ where: { id } });
  }

  async list(
    params: { skip?: number; take?: number },
    tx?: Prisma.TransactionClient,
  ) {
    return this.getClient(tx).user.findMany({
      skip: params.skip,
      take: params.take,
    });
  }

  async markEmailVerified(id: string, tx?: Prisma.TransactionClient) {
    return this.getClient(tx).user.update({
      where: { id },
      data: {
        isEmailVerified: true,
      },
    });
  }

  async unmarkEmailVerified(id: string, tx?: Prisma.TransactionClient) {
    return this.getClient(tx).user.update({
      where: { id },
      data: { isEmailVerified: false },
    });
  }
}

export const userRepo = new UserRepository();
