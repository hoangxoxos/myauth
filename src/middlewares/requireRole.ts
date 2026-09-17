import { NextFunction, Request, Response } from "express";
import { AppError } from "../common/errors/AppError.js";
import { roleRepo } from "../modules/role/role.repository.js";

export function requireRole(...allowedRoles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authUser = req.user;

    if (!authUser) {
      return next(new AppError(401, "You are not authenticated user"));
    }

    try {
      const userRoles = await roleRepo.findUserRole(authUser.sub);
      const roleNames = userRoles.map(({ role }) => role.name);

      if (!allowedRoles.some((role) => roleNames.includes(role))) {
        return next(new AppError(403, "Forbidden"));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
