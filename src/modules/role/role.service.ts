import { roleRepo } from "./role.repository.js";

class RoleService {
  async listRoles() {
    return roleRepo.findAll();
  }
}

export const roleService = new RoleService();
