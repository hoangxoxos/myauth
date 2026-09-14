import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth.js";
import { validateBody } from "../../middlewares/validate.js";
import { loginSchema, registerSchema } from "./auth.schema.js";
import { authHandler } from "./auth.controller.js";

const authRoute = Router();

authRoute.post("/register", validateBody(registerSchema), authHandler.register);
authRoute.post("/login", validateBody(loginSchema), authHandler.login);

authRoute.post("/email/send-verification", authHandler.sendVerifyEmail);
authRoute.get("/email/verify", authHandler.verifyEmail);

authRoute.post("/refresh", authHandler.refresh);
authRoute.post("/logout", requireAuth, authHandler.logout);
authRoute.post("/logout-all", requireAuth, authHandler.logoutAll);

// authRoute.get("/google");
// authRoute.get("/google/callback");

// authRoute.post("/password/forgot", validateBody);
// authRoute.post("/password/reset/:token", validateBody);
// authRoute.put("/password/change", requireAuth, validateBody);

authRoute.post("/2fa/setup", requireAuth, authHandler.setup2FA);
authRoute.post("/2fa/enable", requireAuth, authHandler.enable2FA);
authRoute.post("/2fa/disable", requireAuth, authHandler.disable2FA);

export default authRoute;
