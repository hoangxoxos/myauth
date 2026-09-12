import { NextFunction, Request, Response } from "express";
import { AppError } from "../common/errors/AppError.js";
import { verifyAccessToken } from "../common/utils/token.js";
import jwt from "jsonwebtoken";

const { JsonWebTokenError, TokenExpiredError } = jwt;

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
    if (error instanceof TokenExpiredError) {
      return next(new AppError(401, "Access token has expired"));
    }

    if (error instanceof JsonWebTokenError) {
      return next(new AppError(401, "Invalid access token"));
    }

    next(error);
  }
}
