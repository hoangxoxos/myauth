import { NextFunction, Request, Response } from "express";
import { AppError } from "../common/errors/AppError.js";
import { authRepository } from "../modules/auth/auth.repository.js";

export function requirePermission(permission: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authUser = req.user;

    if (!authUser) {
      return next(new AppError(401, "You are not authenticated user"));
    }

    try {
      const permissions = await authRepository.getUserPermissions(authUser.sub);

      if (!permissions.includes(permission)) {
        return next(new AppError(403, "Forbidden"));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

// router.delete(
//     "/users/:id",
//     requireAuth,
//     requirePermission("user:delete"),
//     deleteUser
// );
