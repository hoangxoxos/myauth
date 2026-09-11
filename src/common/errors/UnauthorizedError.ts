import { AppError } from "./AppError.js";

export class UnauthorizedError extends AppError {
  constructor(statusCode: number, message: string = "Unauthorized") {
    super(statusCode, message);
  }
}
