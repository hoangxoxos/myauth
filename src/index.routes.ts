import { Request, Response, Router } from "express";

const router = Router();

router.get("/", (req: Request, res: Response) => {
  res.json({
    message: "Welcome!",
    protocol: req.protocol,
    secure: req.secure,
  });
});

export default router;
