import type { AccessTokenPayload } from "../../modules/auth/auth.types.ts";

declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

export {};
