import { Request, Response } from "express";

export function notFound(req: Request, res: Response) {
  res.status(404).json({
    errors: {
      body: `[No route matching ${req.method} ${req.originalUrl}]`,
    },
  });
}
