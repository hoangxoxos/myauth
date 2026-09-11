import { AppError } from "./AppError.js";

export class NotFoundError extends AppError {
  constructor(statusCode: number, message: string = "Not found") {
    super(statusCode, message);
  }
}
