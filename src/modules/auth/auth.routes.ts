import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth.js";
import { rateLimit } from "../../middlewares/rateLimit.js";
import { validateBody } from "../../middlewares/validate.js";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "./auth.schema.js";
import { authHandler } from "./auth.controller.js";

const authRoute = Router();

authRoute.post("/register", validateBody(registerSchema), authHandler.register);
authRoute.post(
  "/login",
  rateLimit(10, 15 * 60 * 1000),
  validateBody(loginSchema),
  authHandler.login,
);

authRoute.post(
  "/email/send-verification",
  rateLimit(5, 15 * 60 * 1000),
  authHandler.sendVerifyEmail,
);
authRoute.get("/email/verify", authHandler.verifyEmail);

authRoute.post("/refresh", rateLimit(30, 15 * 60 * 1000), authHandler.refresh);
authRoute.post("/logout", requireAuth, authHandler.logout);
authRoute.post("/logout-all", requireAuth, authHandler.logoutAll);

authRoute.get("/google", authHandler.googleRedirect);
authRoute.get("/google/callback", authHandler.googleCallback);

authRoute.post(
  "/password/forgot",
  rateLimit(5, 15 * 60 * 1000),
  validateBody(forgotPasswordSchema),
  authHandler.forgotPassword,
);
authRoute.get("/password/reset", authHandler.resetPasswordPage);
authRoute.post(
  "/password/reset",
  validateBody(resetPasswordSchema),
  authHandler.resetPassword,
);
authRoute.put(
  "/password/change",
  requireAuth,
  validateBody(changePasswordSchema),
  authHandler.changePassword,
);

authRoute.post(
  "/2fa/setup",
  requireAuth,
  rateLimit(5, 15 * 60 * 1000),
  authHandler.setup2FA,
);
authRoute.post(
  "/2fa/enable",
  requireAuth,
  rateLimit(10, 15 * 60 * 1000),
  authHandler.enable2FA,
);
authRoute.post(
  "/2fa/disable",
  requireAuth,
  rateLimit(10, 15 * 60 * 1000),
  authHandler.disable2FA,
);

export default authRoute;
