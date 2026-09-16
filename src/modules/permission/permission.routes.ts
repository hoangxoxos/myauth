import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth.js";
import { requirePermission } from "../../middlewares/requirePermission.js";
import { requireRole } from "../../middlewares/requireRole.js";
import { permissionHandler } from "./permission.controller.js";

const permissionRoute = Router();

permissionRoute.use(requireAuth, requireRole("ADMIN"));

permissionRoute.get(
  "/",
  requirePermission("permission:manage"),
  permissionHandler.listPermissionsHandler,
);
permissionRoute.post(
  "/",
  requirePermission("permission:manage"),
  permissionHandler.createPermissionHandler,
);

permissionRoute.post(
  "/roles/:roleId/:permissionId",
  requirePermission("permission:manage"),
  permissionHandler.attachPermissionHandler,
);

permissionRoute.delete(
  "/roles/:roleId/:permissionId",
  requirePermission("permission:manage"),
  permissionHandler.detachPermissionHandler,
);

export default permissionRoute;
