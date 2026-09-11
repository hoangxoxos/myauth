import { Request } from "express";

export type ValidatedRequest<TBody = unknown> = Request<
  Record<string, string>,
  unknown,
  TBody
>;
