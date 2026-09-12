import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth.js";
import { requireRole } from "../../middlewares/requireRole.js";
import { validateBody } from "../../middlewares/validate.js";
import { requirePermission } from "../../middlewares/requirePermission.js";

const roleRoute = Router();

// roleRoute.get("/", requireAuth, requireRole("ADMIN"));
// roleRoute.post("/", requireAuth, requireRole("ADMIN"), validateBody);
// roleRoute.put("/:id", requireAuth, requireRole("ADMIN"));
// roleRoute.delete("/:id", requireAuth, requireRole("ADMIN"));

// roleRoute.post(
//   "/:roleId/users/:userId",
//   requireAuth,
//   requirePermission("role:assign"),
// );
// roleRoute.delete(
//   "/:roleId/users/:userId",
//   requireAuth,
//   requirePermission("role:assign"),
// );

export default roleRoute;
