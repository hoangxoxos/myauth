import { OAuth2Client } from "google-auth-library";
import { env } from "../../config/env.js";
import crypto from "crypto";

export function getGoogleClient() {
  const clientId = env.GOOGLE_CLIENT_ID;
  const clientSecret = env.GOOGLE_CLIENT_SECRET;
  const redirectUri = env.GOOGLE_REDIRECT_URI;

  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_ID is missing");
  }

  if (!clientSecret) {
    throw new Error("GOOGLE_CLIENT_SECRET is missing");
  }

  if (!redirectUri) {
    throw new Error("GOOGLE_REDIRECT_URI is missing");
  }

  return new OAuth2Client({
    clientId,
    clientSecret,
    redirectUri,
  });
}

export const oauthCookieConfig = {
  stateCookieName: "oauth_state",
  stateMaxAgeMs: 5 * 60 * 1000, // 5 minutes — this flow should be quick
};

export function generateOAuthState(): string {
  return crypto.randomBytes(16).toString("hex");
}
