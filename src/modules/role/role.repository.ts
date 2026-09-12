import { Prisma } from "../../../generated/prisma/client.js";
import { DbClient, prisma } from "../../config/prisma.js";

class RoleRepository {
  private getClient(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? prisma;
  }

  async findUserRole(userId: string, tx?: Prisma.TransactionClient) {
    return this.getClient(tx).userRole.findMany({
      where: { userId },
      select: {
        role: true,
        assignedAt: true,
      },
    });
  }

  async findRoleByName(name: string, tx?: Prisma.TransactionClient) {
    return this.getClient(tx).role.findUnique({ where: { name } });
  }

  async createUserRole(
    userId: string,
    roleId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.getClient(tx).userRole.create({
      data: {
        userId,
        roleId,
      },
    });
  }
}

export const roleRepo = new RoleRepository();
