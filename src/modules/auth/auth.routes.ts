import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth.js";
import { validateBody } from "../../middlewares/validate.js";
import { loginSchema, registerSchema } from "./auth.schema.js";
import { authHandler } from "./auth.controller.js";

const authRoute = Router();

authRoute.post("/register", validateBody(registerSchema), authHandler.register);
authRoute.post("/login", validateBody(loginSchema), authHandler.login);
// authRoute.post("/login/2fa", validateBody);

authRoute.post("/email/send-verification", authHandler.sendVerifyEmail);
authRoute.get("/email/verify", authHandler.verifyEmail);

// authRoute.post("/refresh");
// authRoute.post("/logout");
// authRoute.post("/logout-all");

// authRoute.get("/google");
// authRoute.get("/google/callback");

// authRoute.post("/password/forgot", validateBody);
// authRoute.post("/password/reset/:token", validateBody);
// authRoute.put("/password/change", requireAuth, validateBody);

// authRoute.post("/2fa/setup", requireAuth);
// authRoute.post("/2fa/enable", requireAuth);
// authRoute.post("/2fa/disable", requireAuth);

export default authRoute;
