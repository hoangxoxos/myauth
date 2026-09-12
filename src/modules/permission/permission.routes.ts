import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth.js";
import { requirePermission } from "../../middlewares/requirePermission.js";
import { requireRole } from "../../middlewares/requireRole.js";

const permissionRoute = Router();

// permissionRoute.use(requireRole("ADMIN"));

// permissionRoute.get("/", requireAuth, requirePermission("permission:manage"));
// permissionRoute.post("/", requireAuth, requirePermission("permission:manage"));
// permissionRoute.post("/roles/:roleId/:permissionId", requireAuth);
// permissionRoute.delete("/roles/:roleId/:permissionId", requireAuth);

export default permissionRoute;
