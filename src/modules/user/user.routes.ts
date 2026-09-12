import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth.js";
import { validateBody } from "../../middlewares/validate.js";
import { requireRole } from "../../middlewares/requireRole.js";
import { requirePermission } from "../../middlewares/requirePermission.js";

const userRoute = Router();

// userRoute.get("/me", requireAuth);
// userRoute.put("/me", requireAuth, validateBody);
// userRoute.delete("/me", requireAuth);
// userRoute.get("/me/sessions", requireAuth); //list refresh token
// userRoute.delete("/me/sessions/:sessionId", requireAuth);

// userRoute.get(
//   "/",
//   requireAuth,
//   requireRole("ADMIN"),
//   requirePermission("user:read"),
// );
// userRoute.get(
//   "/:id",
//   requireAuth,
//   requireRole("ADMIN"),
//   requirePermission("user:read"),
// );
// userRoute.put(
//   "/:id",
//   requireAuth,
//   requireRole("ADMIN"),
//   requirePermission("user:update"),
// );
// userRoute.delete(
//   "/:id",
//   requireAuth,
//   requireRole("ADMIN"),
//   requirePermission("user:delete"),
// );

export default userRoute;
