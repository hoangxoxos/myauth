import { NextFunction, Request, Response } from "express";
import { AppError } from "../common/errors/AppError.js";

export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authUser = req.user;

    if (!authUser) {
      return next(new AppError(401, "You are not authenticated user"));
    }

    const userRoles = authUser?.roles;
    const hasRole = allowedRoles.some((role) => userRoles.includes(role));
    if (!hasRole) {
      return next(new AppError(403, "Forbidden"));
    }

    next();
  };
}
