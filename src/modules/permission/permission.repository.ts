import { TransactionClient } from "../../../generated/prisma/internal/prismaNamespace.js";
import { DbClient, prisma } from "../../config/prisma.js";
import { PermissionMapper } from "./permission.mapper.js";

export class PermissionRepository {
  private getClient(tx?: TransactionClient): DbClient {
    return tx ?? prisma;
  }

  async findAll(tx?: TransactionClient) {
    const permissions = await this.getClient(tx).permission.findMany({
      orderBy: {
        name: "asc",
      },
      include: {
        rolePermissions: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return PermissionMapper.toDtoList(permissions);
  }

  async findById(id: string, tx?: TransactionClient) {
    return this.getClient(tx).permission.findUnique({ where: { id } });
  }

  async findByName(name: string, tx?: TransactionClient) {
    return this.getClient(tx).permission.findFirst({ where: { name } });
  }

  async create(
    data: { name: string; description?: string },
    tx?: TransactionClient,
  ) {
    return this.getClient(tx).permission.create({ data });
  }

  async createRolePermission(
    roleId: string,
    permissionId: string,
    tx?: TransactionClient,
  ) {
    return this.getClient(tx).rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId,
          permissionId,
        },
      },
      update: {},
      create: {
        roleId,
        permissionId,
      },
    });
  }

  async delete(roleId: string, permissionId: string, tx?: TransactionClient) {
    return this.getClient(tx).rolePermission.delete({
      where: {
        roleId_permissionId: { roleId, permissionId },
      },
    });
  }
}

export const permissionRepo = new PermissionRepository();
