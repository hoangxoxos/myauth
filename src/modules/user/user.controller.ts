import { NextFunction, Request, Response } from "express";
import { AppError } from "../../common/errors/AppError.js";
import { userRepo } from "./user.repository.js";
import { userService } from "./user.service.js";

class UserController {
  async getMe(req: Request, res: Response, next: NextFunction) {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({
        message: "Not an authenticated user",
      });
    }

    try {
      const result = await userService.getMe(authUser.sub);

      res.status(200).json({
        success: true,
        result,
        roles: authUser.roles,
        permissions: authUser.permissions || "",
      });
    } catch (error) {
      next(error);
    }
  }
}

export const userHandler = new UserController();
