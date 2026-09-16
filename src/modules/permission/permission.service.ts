import { AppError } from "../../common/errors/AppError.js";
import { roleRepo } from "../role/role.repository.js";
import { permissionRepo } from "./permission.repository.js";

export class PermissionService {
  async listPermissions() {
    return permissionRepo.findAll();
  }

  async createPermission(name: string, description?: string) {
    const permission = await permissionRepo.findByName(name);
    if (permission) {
      throw new AppError(409, "Permission already exists.");
    }

    const newPermission = await permissionRepo.create({ name, description });

    return newPermission;
  }

  async attachPermission(roleId: string, permissionId: string) {
    const role = await roleRepo.findById(roleId);

    if (!role) {
      throw new AppError(404, "Role is not configured");
    }

    const permission = await permissionRepo.findById(permissionId);

    if (!permission) {
      throw new AppError(404, "Permission is not configured");
    }

    await permissionRepo.createRolePermission(roleId, permissionId);

    return {
      role,
      permission,
    };
  }

  async detachPermission(roleId: string, permissionId: string) {
    const role = await roleRepo.findById(roleId);

    if (!role) {
      throw new AppError(404, "Role is not configured");
    }

    const permission = await permissionRepo.findById(permissionId);

    if (!permission) {
      throw new AppError(404, "Permission is not configured");
    }

    await permissionRepo.delete(roleId, permissionId);

    return {
      role,
      permission,
    };
  }
}

export const permissionService = new PermissionService();
