import { Permission, Prisma } from "../../../generated/prisma/client.js";

// Infer exact Prisma payload shape returned by the repository
export type PermissionWithRolesPayload = Prisma.PermissionGetPayload<{
  include: {
    rolePermissions: {
      include: {
        role: {
          select: {
            id: true;
            name: true;
          };
        };
      };
    };
  };
}>;

export interface RoleDto {
  id: string; // or number, based on your schema
  name: string;
}

// Permission + roles[] structure
export type PermissionWithRolesDto = Permission & {
  roles: RoleDto[];
};

export class PermissionMapper {
  static toDto(permission: PermissionWithRolesPayload): PermissionWithRolesDto {
    const { rolePermissions, ...basePermission } = permission;

    return {
      ...basePermission,
      roles: rolePermissions.map((rp) => ({
        id: rp.role.id,
        name: rp.role.name,
      })),
    };
  }

  static toDtoList(
    permissions: PermissionWithRolesPayload[],
  ): PermissionWithRolesDto[] {
    return permissions.map(PermissionMapper.toDto);
  }
}
