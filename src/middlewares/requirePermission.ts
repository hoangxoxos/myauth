import { NextFunction, Request, Response } from "express";
import { AppError } from "../common/errors/AppError.js";

export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authUser = req.user;

    if (!authUser) {
      return next(new AppError(401, "You are not authenticated user"));
    }

    if (!authUser.permissions) {
      return next(new AppError(401, "User does not have any permissions yet"));
    }

    if (!authUser.permissions.includes(permission)) {
      return next(new AppError(403, "Forbidden"));
    }

    next();
  };
}

// router.delete(
//     "/users/:id",
//     requireAuth,
//     requirePermission("user:delete"),
//     deleteUser
// );
