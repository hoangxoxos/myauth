import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../../config/env.js";
import type { AccessTokenPayload } from "../../modules/auth/auth.types.js";
import crypto from "crypto";

export function signAccessToken(payload: AccessTokenPayload): string {
  const options: SignOptions = {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions["expiresIn"],
  };

  return jwt.sign(payload, env.JWT_ACCESS_SECRET, options);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function signTwoFactorPendingToken(userId: string) {
  return jwt.sign(
    { sub: userId, purpose: "2fa_pending" },
    env.JWT_ACCESS_SECRET,
    { expiresIn: "5m" },
  );
}

export function verifyTwoFactorPendingToken(token: string) {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);

  if (typeof payload === "string" || payload.purpose !== "2fa_pending") {
    throw new Error("Invalid 2FA pending token");
  }

  return payload;
}
