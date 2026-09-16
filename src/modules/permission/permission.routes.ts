import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth.js";
import { requirePermission } from "../../middlewares/requirePermission.js";
import { requireRole } from "../../middlewares/requireRole.js";

const permissionRoute = Router();

// permissionRoute.use(requireRole("ADMIN"));

// permissionRoute.get("/", requireAuth, requirePermission("permission:manage"), listPermissionsHandler);
// permissionRoute.post("/", requireAuth, requirePermission("permission:manage"), createPermissionHandler);
// permissionRoute.post("/roles/:roleId/:permissionId", requireAuth, attachPermissionHandler);
// permissionRoute.delete("/roles/:roleId/:permissionId", requireAuth, detachPermissionHandler);

export default permissionRoute;
