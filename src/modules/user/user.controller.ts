import { NextFunction, Request, Response } from "express";
import { AppError } from "../../common/errors/AppError.js";
import { userRepo } from "./user.repository.js";
import { userService } from "./user.service.js";
import { ValidatedRequest } from "../../common/types/request.js";
import {
  AdminUpdateUserProfileSchema,
  DeleteUserInput,
  UpdateProfileInput,
  updateProfileSchema,
  UpdateUserEmailInput,
} from "./user.schema.js";
import { env } from "../../config/env.js";

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
      const { newEmail, password, twoFactorCode } = req.body;

      const result = await userService.updateUserEmail(authUser.sub, {
        newEmail,
        password,
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

  async deleteHandler(
    req: ValidatedRequest<DeleteUserInput>,
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
      const { password, twoFactorCode } = req.body;

      const result = await userService.delete(
        authUser.sub,
        password,
        twoFactorCode,
      );

      const isProd = env.NODE_ENV === "production";
      res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: isProd,
        sameSite: "lax",
      });

      res.status(200).json({
        success: true,
        message: "User deleted",
      });
    } catch (error) {
      next(error);
    }
  }

  async listAllSessionsHandler(
    req: Request,
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
      const page = req.query.page ? Number(req.query.page) : 1;
      const pageSize = req.query.pageSize ? Number(req.query.pageSize) : 20;

      if (Number.isNaN(page) || Number.isNaN(pageSize)) {
        return res.status(400).json({
          success: false,
          message: "page and pageSize must be numbers",
        });
      }

      const result = await userService.listAllSessions(
        authUser.sub,
        page,
        pageSize,
      );

      res.status(200).json({
        success: true,
        message: "User all sessions",
        result,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteSessionHandler(req: Request, res: Response, next: NextFunction) {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({
        message: "Not an authenticated user",
      });
    }

    try {
      const sessionId = req.params.sessionId as string;

      const result = await userService.deleteSession(authUser.sub, sessionId);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async listUsersHandler(req: Request, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? Number(req.query.page) : 1;
      const pageSize = req.query.pageSize ? Number(req.query.pageSize) : 20;

      if (Number.isNaN(page) || Number.isNaN(pageSize)) {
        return res.status(400).json({
          success: false,
          message: "page and pageSize must be numbers",
        });
      }
      const result = await userService.listUsers(page, pageSize);

      res.status(200).json({
        success: true,
        result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getUserHandler(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Please provide an user id",
        });
      }

      const result = await userService.getUser(id);

      res.status(200).json({
        success: true,
        message: "User info",
        user: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateUserHandler(
    req: ValidatedRequest<AdminUpdateUserProfileSchema>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const id = req.params.id;

      if (typeof id !== "string" || !id) {
        return res.status(400).json({
          success: false,
          message: "Please provide an user id and must be a string",
        });
      }

      const { name, email, password, avatarUrl, isEmailVerified } = req.body;

      const result = await userService.updateUser(id, {
        name,
        email,
        password,
        avatarUrl,
        isEmailVerified,
      });

      return res.status(200).json({
        success: true,
        message: "User updated successfully",
        user: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteUserHandler(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;

      if (!id) {
        throw new AppError(400, "User id must be a string and cannot be empty");
      }

      const result = await userService.deleteUser(id);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

export const userHandler = new UserController();
