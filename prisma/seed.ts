/**
 * prisma/seed.ts
 *
 * Prisma 7 seed script.
 * Creates: 2 roles (ADMIN, USER), a set of permissions, and 2 users
 * (one admin, one normal user) linked to their role via UserRole.
 *
 * NOTE: Your current schema does NOT have a join table between
 * Role and Permission (no RolePermission model). So permissions
 * are created here, but they are not linked to any role yet.
 * If you want "role has these permissions", add a model like:
 *
 *   model RolePermission {
 *     roleId       String
 *     permissionId String
 *     role         Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
 *     permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)
 *     @@id([roleId, permissionId])
 *     @@map("role_permissions")
 *   }
 *
 * Run with: npx prisma db seed
 * (make sure "prisma.seed" is set in package.json, see note at bottom)
 */
import { prisma } from "../src/config/prisma.js";
import * as bcrypt from "bcrypt";

// ---------- Data (easy to read and change) ----------

const ROLE_NAMES = {
  ADMIN: "ADMIN",
  USER: "USER",
} as const;

// A small but realistic permission list, using "resource:action" style.
const PERMISSIONS: { name: string; description: string }[] = [
  { name: "user:create", description: "Create a user" },
  { name: "user:read", description: "View user info" },
  { name: "user:update", description: "Update user info" },
  { name: "user:delete", description: "Delete a user" },
  { name: "post:create", description: "Create a post" },
  { name: "post:read", description: "View a post" },
  { name: "post:update", description: "Update a post" },
  { name: "post:delete", description: "Delete a post" },
  { name: "role:assign", description: "Assign a role to a user" },
  { name: "permission:manage", description: "Create or edit permissions" },
];

// ---------- Small helper functions (single job each) ----------

async function upsertRole(name: string, description: string) {
  return prisma.role.upsert({
    where: { name },
    update: {},
    create: { name, description },
  });
}

async function upsertPermissions() {
  // Prisma 7 still supports createMany with skipDuplicates on most DBs (e.g. Postgres).
  await prisma.permission.createMany({
    data: PERMISSIONS,
    skipDuplicates: true,
  });
}

async function hashPassword(plain: string): Promise<string> {
  const SALT_ROUNDS = 10;
  return bcrypt.hash(plain, SALT_ROUNDS);
}

async function upsertUserWithRole(params: {
  email: string;
  name: string;
  plainPassword: string;
  roleId: string;
}) {
  const { email, name, plainPassword, roleId } = params;

  const hashedPassword = await hashPassword(plainPassword);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name,
      password: hashedPassword,
      isEmailVerified: true,
    },
  });

  // Link user <-> role (composite id [userId, roleId], so upsert needs both).
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: user.id,
        roleId,
      },
    },
    update: {},
    create: {
      userId: user.id,
      roleId,
    },
  });

  return user;
}

// ---------- Main ----------

async function main() {
  console.log("Seeding roles...");
  const adminRole = await upsertRole(
    ROLE_NAMES.ADMIN,
    "Full access to the system",
  );
  const userRole = await upsertRole(
    ROLE_NAMES.USER,
    "Normal user with limited access",
  );

  console.log("Seeding permissions...");
  await upsertPermissions();

  console.log("Seeding admin user...");
  const admin = await upsertUserWithRole({
    email: "admin@example.com",
    name: "Admin User",
    plainPassword: "Admin@123", // demo only, change in real use
    roleId: adminRole.id,
  });

  console.log("Seeding normal user...");
  const normalUser = await upsertUserWithRole({
    email: "user@example.com",
    name: "Normal User",
    plainPassword: "User@123", // demo only, change in real use
    roleId: userRole.id,
  });

  console.log("Done!");
  console.log({ admin: admin.email, normalUser: normalUser.email });
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

/**
 * package.json setup for `npx prisma db seed`:
 *
 * "prisma": {
 *   "seed": "ts-node prisma/seed.ts"
 * }
 *
 * If you use Prisma 7 with the new ESM-first setup, you may need:
 *   "prisma": {
 *     "seed": "node --loader ts-node/esm prisma/seed.ts"
 *   }
 * or run it with tsx: "seed": "tsx prisma/seed.ts"
 */
