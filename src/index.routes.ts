import { Request, Response, Router } from "express";
import authRoute from "./modules/auth/auth.routes.js";
import userRoute from "./modules/user/user.routes.js";
import roleRoute from "./modules/role/role.routes.js";
import permissionRoute from "./modules/permission/permission.routes.js";

const router = Router();

router.get("/", (req: Request, res: Response) => {
  res.json({
    message: "Welcome!",
    protocol: req.protocol,
    secure: req.secure,
  });
});

router.use("/auth", authRoute);
router.use("/users", userRoute);
router.use("/roles", roleRoute);
router.use("/permission", permissionRoute);

export default router;
