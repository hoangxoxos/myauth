import { NextFunction, Request, Response } from "express";
import { AppError } from "../../common/errors/AppError.js";
import { userRepo } from "./user.repository.js";
import { userService } from "./user.service.js";
import { ValidatedRequest } from "../../common/types/request.js";
import {
  UpdateProfileInput,
  updateProfileSchema,
  UpdateUserEmailInput,
} from "./user.schema.js";

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

  async updateProfileHandler(
    req: ValidatedRequest<UpdateProfileInput>,
    res: Response,
    next: NextFunction,
  ) {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({
        message: "Not an authenticated user",
      });
    }

    try {
      const { name, avatarUrl } = req.body;
      const result = await userService.updateProfile(authUser.sub, {
        name,
        avatarUrl,
      });

      res.status(200).json({
        message: "User Updated",
        result,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateUserEmailHandler(
    req: ValidatedRequest<UpdateUserEmailInput>,
    res: Response,
    next: NextFunction,
  ) {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({
        message: "Not an authenticated user",
      });
    }

    try {
      const { newEmail, twoFactorCode } = req.body;

      const result = await userService.updateUserEmail(authUser.sub, {
        newEmail,
        twoFactorCode,
      });

      res.status(200).json({
        success: true,
        message:
          "Updated user email. Please verify your email by the link we sent to your new email",
        user: {
          id: result.updatedUser.id,
          email: result.updatedUser.email,
          name: result.updatedUser.name,
          avatarUrl: result.updatedUser.avatarUrl,
          isEmailVerified: result.updatedUser.isEmailVerified,
          createdAt: result.updatedUser.createdAt,
          updatedAt: result.updatedUser.updatedAt,
        },
        emailVerificationExpiresAt: result.emailVerification.expiresAt,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const userHandler = new UserController();
