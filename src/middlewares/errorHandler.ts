import { Request, Response, NextFunction } from "express";
import { AppError } from "../common/errors/AppError.js";
import { ZodError } from "zod";

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: "Invalid request data",
      errors: err.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });

    return;
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  return res
    .status(500)
    .json({ success: false, message: "Internal Server Error" });
}
