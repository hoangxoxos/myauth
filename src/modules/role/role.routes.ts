import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth.js";
import { requireRole } from "../../middlewares/requireRole.js";
import { validateBody } from "../../middlewares/validate.js";
import { requirePermission } from "../../middlewares/requirePermission.js";
import { roleHandler } from "./role.controller.js";

const roleRoute = Router();

roleRoute.get(
  "/",
  requireAuth,
  requireRole("ADMIN"),
  roleHandler.listRolesHandler,
);
// roleRoute.post("/", requireAuth, requireRole("ADMIN"), validateBody(createRoleSchema), createRoleHandler);
// roleRoute.put("/:id", requireAuth, requireRole("ADMIN"), updateRoleHandler);
// roleRoute.delete("/:id", requireAuth, requireRole("ADMIN"), deleteRoleHandler);

// roleRoute.post(
//   "/:roleId/users/:userId",
//   requireAuth,
//   requirePermission("role:assign"), assignRoleToUserHandler
// );
// roleRoute.delete(
//   "/:roleId/users/:userId",
//   requireAuth,
//   requirePermission("role:assign"), removeRoleFromUserHandler
// );

export default roleRoute;
