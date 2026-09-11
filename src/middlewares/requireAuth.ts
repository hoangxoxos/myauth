import { NextFunction, Request, Response } from "express";
import { AppError } from "../common/errors/AppError.js";
import { verifyAccessToken } from "../common/utils/token.js";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authorization = req.headers.authorization as string | undefined;
    if (!authorization) {
      return next(new AppError(401, "Authorization header is missing"));
    }

    const [type, token] = authorization.split(" ");
    if (type !== "Bearer" || !token) {
      return next(new AppError(401, "Invalid authorization header"));
    }

    const payload = verifyAccessToken(token);
    req.user = payload;

    next();
  } catch (error) {
    next(error);
  }
}
