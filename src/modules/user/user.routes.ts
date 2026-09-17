import { Request, Response, Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth.js";
import { validateBody } from "../../middlewares/validate.js";
import { requireRole } from "../../middlewares/requireRole.js";
import { requirePermission } from "../../middlewares/requirePermission.js";
import { userHandler } from "./user.controller.js";
import {
  adminUpdateUserProfileSchema,
  deleteUserSchema,
  updateProfileSchema,
  updateUserEmailSchema,
} from "./user.schema.js";
import { prisma } from "../../config/prisma.js";

const userRoute = Router();

userRoute.get("/me", requireAuth, userHandler.getMe);
userRoute.put(
  "/me",
  requireAuth,
  validateBody(updateProfileSchema),
  userHandler.updateProfileHandler,
);
userRoute.put(
  "/me/email",
  requireAuth,
  validateBody(updateUserEmailSchema),
  userHandler.updateUserEmailHandler,
);
userRoute.delete(
  "/me",
  requireAuth,
  validateBody(deleteUserSchema),
  userHandler.deleteHandler,
);
userRoute.get("/me/sessions", requireAuth, userHandler.listAllSessionsHandler); //list refresh token
userRoute.delete(
  "/me/sessions/:sessionId",
  requireAuth,
  userHandler.deleteSessionHandler,
);

// for development: clean all sessions
userRoute.delete(
  "/sessions",
  requireAuth,
  async (req: Request, res: Response) => {
    const id = req.user?.sub;
    await prisma.refreshToken.deleteMany({ where: { userId: id } });

    res.status(200).json({
      message: "Ok",
    });
  },
);

userRoute.get(
  "/",
  requireAuth,
  requireRole("ADMIN"),
  requirePermission("user:read"),
  userHandler.listUsersHandler,
);

userRoute.get(
  "/:id",
  requireAuth,
  requireRole("ADMIN"),
  requirePermission("user:read"),
  userHandler.getUserHandler,
);

userRoute.put(
  "/:id",
  requireAuth,
  requireRole("ADMIN"),
  requirePermission("user:update"),
  validateBody(adminUpdateUserProfileSchema),
  userHandler.updateUserHandler,
);

userRoute.delete(
  "/:id",
  requireAuth,
  requireRole("ADMIN"),
  requirePermission("user:delete"),
  userHandler.deleteUserHandler,
);

export default userRoute;
