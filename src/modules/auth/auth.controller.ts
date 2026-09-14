import { Request, Response, NextFunction } from "express";
import { ValidatedRequest } from "../../common/types/request.js";
import {
  ChangePasswordInput,
  Disable2FAInput,
  Enable2FAInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from "./auth.schema.js";
import { userRepo } from "../user/user.repository.js";
import { authService } from "./auth.service.js";
import { env } from "../../config/env.js";
import {
  generateOAuthState,
  getGoogleClient,
  oauthCookieConfig,
} from "../../common/utils/oauth-google.js";
import { AppError } from "../../common/errors/AppError.js";

class AuthController {
  async register(
    req: ValidatedRequest<RegisterInput>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const { email, password, name } = req.body;

      const result = await authService.register(email, password, name);

      res.status(201).json({
        success: true,
        message:
          "Registration successfully. Please verify your email before logging in",
        user: result,
      });
    } catch (error) {
      next(error);
    }
  }
  async login(
    req: ValidatedRequest<LoginInput>,
    res: Response,
    next: NextFunction,
  ) {
    const { email, password, twoFactorCode } = req.body;
    const userAgent = req.headers["user-agent"] || "Unknown";
    let ip = req.ip;

    if (ip === "::1") ip = "127.0.0.1";
    if (ip?.startsWith("::ffff:")) ip = ip.replace("::ffff:", "");

    try {
      const result = await authService.login(
        email,
        password,
        twoFactorCode,
        userAgent,
        ip,
      );

      const isProd = env.NODE_ENV === "production";
      res.cookie("refreshToken", result.refreshToken.rawToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000,
      });

      res.status(200).json({
        result,
      });
    } catch (error) {
      next(error);
    }
  }

  async sendVerifyEmail(req: Request, res: Response, next: NextFunction) {
    const email = req.body.email as string | undefined;

    if (!email) {
      return res.status(400).json({
        message:
          "Invalid request data. Email cannot be empty and must be string",
      });
    }

    try {
      const result = await authService.sendEmailVerification(email);

      res.status(200).json({
        result,
      });
    } catch (error) {
      next(error);
    }
  }

  async verifyEmail(req: Request, res: Response, next: NextFunction) {
    const token = req.query.token as string | undefined;
    if (!token) {
      return res.status(400).json({
        message: "Verification token is missing",
      });
    }

    try {
      const result = await authService.verifyEmail(token);

      res.status(200).json({
        message: "Your email is now verified",
        result,
      });
    } catch (error) {
      next(error);
    }
  }

  async setup2FA(req: Request, res: Response, next: NextFunction) {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({
        message: "Not an authenticated user",
      });
    }

    try {
      const result = await authService.setup2FA(authUser.sub);

      res.status(200).json({
        message: "2FA Setup is done",
        otpAuthUrl: result.otpAuthUrl,
        user: {
          id: result.setup2FAResult.id,
          email: result.setup2FAResult.email,
          twoFactorEnabled: result.setup2FAResult.twoFactorEnabled,
          twoFactorSecret: result.setup2FAResult.twoFactorSecret,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async enable2FA(
    req: ValidatedRequest<Enable2FAInput>,
    res: Response,
    next: NextFunction,
  ) {
    const authUser = req.user;
    const { code } = req.body;

    if (!authUser) {
      return res.status(401).json({
        message: "Not an authenticated user",
      });
    }

    if (!code) {
      return res.status(400).json({
        message: "Two factor code is missing",
      });
    }

    try {
      const result = await authService.enable2FA(authUser.sub, code);

      res.status(200).json({
        success: true,
        message: "User two factor enabled",
        result,
      });
    } catch (error) {
      next(error);
    }
  }

  async disable2FA(
    req: ValidatedRequest<Disable2FAInput>,
    res: Response,
    next: NextFunction,
  ) {
    const authUser = req.user;
    const { password, code } = req.body;

    if (!authUser) {
      return res.status(401).json({
        message: "Not an authenticated user",
      });
    }

    try {
      const result = await authService.disable2FA(authUser.sub, password, code);

      res.status(200).json({
        success: true,
        message: "User two factor disabled",
        result,
      });
    } catch (error) {
      next(error);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.cookies.refreshToken as string | undefined;
      const userAgent = req.headers["user-agent"] || "Unknown";
      let ip = req.ip;

      if (ip === "::1") ip = "127.0.0.1";
      if (ip?.startsWith("::ffff:")) ip = ip.replace("::ffff:", "");

      if (!token) {
        return res.status(401).json({
          message: "Refresh token is missing",
        });
      }

      const result = await authService.refresh(token, userAgent, ip);
      const isProd = env.NODE_ENV === "production";

      res.cookie("refreshToken", result.refreshToken.token, {
        httpOnly: true,
        secure: isProd,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(200).json({
        success: true,
        message: "Token refreshed",
        result,
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    const authUser = req.user;
    if (!authUser) {
      return res.status(401).json({
        message: "Not an authenticated user",
      });
    }

    const refreshToken = req.cookies.refreshToken as string | undefined;
    if (!refreshToken) {
      return res.status(401).json({
        message: "Refresh token is missing",
      });
    }

    try {
      const result = await authService.logout(refreshToken);

      const isProd = env.NODE_ENV === "production";
      res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: isProd,
        sameSite: "strict",
      });

      res.status(200).json({
        success: true,
        message: "Logged out",
      });
    } catch (error) {
      next(error);
    }
  }

  async logoutAll(req: Request, res: Response, next: NextFunction) {
    const authUser = req.user;
    if (!authUser) {
      return res.status(401).json({
        message: "Not an authenticated user",
      });
    }

    const refreshToken = req.cookies.refreshToken as string | undefined;
    if (!refreshToken) {
      return res.status(401).json({
        message: "Refresh token is missing",
      });
    }

    try {
      const result = await authService.logoutAll(authUser.sub);

      const isProd = env.NODE_ENV === "production";
      res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: isProd,
        sameSite: "strict",
      });

      res.status(200).json({
        message: "Logged out in all device",
      });
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(
    req: ValidatedRequest<ForgotPasswordInput>,
    res: Response,
    next: NextFunction,
  ) {
    const { email } = req.body;

    try {
      const result = await authService.forgotPassword(email);

      res.status(200).json({
        result,
      });
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(
    req: ValidatedRequest<ResetPasswordInput>,
    res: Response,
    next: NextFunction,
  ) {
    const { token, newPassword } = req.body;

    try {
      const result = await authService.resetPassword(token, newPassword);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async changePassword(
    req: ValidatedRequest<ChangePasswordInput>,
    res: Response,
    next: NextFunction,
  ) {
    const authUser = req.user;
    if (!authUser) {
      return res.status(401).json({
        message: "Not an authenticated user",
      });
    }

    const { currentPassword, newPassword, twoFactorCode } = req.body;

    try {
      const result = await authService.changePassword(
        authUser.sub,
        currentPassword,
        newPassword,
        twoFactorCode,
      );

      res.status(200).json({
        success: true,
        message:
          "Changed password successfully. Please login again to continue",
        user: {
          id: result.updatedUser.id,
          email: result.updatedUser.email,
          name: result.updatedUser.name,
          twoFactorEnabled: result.updatedUser.twoFactorEnabled,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async googleRedirect(_req: Request, res: Response, next: NextFunction) {
    try {
      const state = generateOAuthState();

      const isProd = env.NODE_ENV === "production";
      res.cookie(oauthCookieConfig.stateCookieName, state, {
        httpOnly: true,
        secure: isProd,
        sameSite: "lax",
        maxAge: oauthCookieConfig.stateMaxAgeMs,
      });

      const client = getGoogleClient();
      const url = client.generateAuthUrl({
        access_type: "offline",
        scope: ["openid", "email", "profile"],
        state,
        prompt: "consent",
      });

      res.redirect(url);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Google redirects back here with ?code=...&state=...
   */

  async googleCallback(req: Request, res: Response, next: NextFunction) {
    try {
      const client = getGoogleClient();
      const { code, state } = req.query as { code?: string; state?: string };
      const savedState = req.cookies?.[oauthCookieConfig.stateCookieName];

      res.clearCookie(oauthCookieConfig.stateCookieName);

      if (!code || !state || !savedState || state !== savedState) {
        throw new AppError(400, "Invalid OAuth state or missing code");
      }

      // exchange the code for tokens (access_token, id_token, refresh_token)
      const { tokens } = await client.getToken(code);

      if (!tokens.id_token) {
        throw new AppError(400, "Google did not return an id_token");
      }

      // Verifies id_token signature, issuer, audience, and expiry — all in one call
      const ticket = await client.verifyIdToken({
        idToken: tokens.id_token,
        audience: env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.sub || !payload.email) {
        throw new AppError(400, "Invalid Google token payload");
      }

      const googleUser = {
        id: payload.sub,
        email: payload.email,
        verified_email: payload.email_verified ?? false,
        name: payload.name,
        picture: payload.picture,
      };

      const result = await authService.loginWithGoogle(
        googleUser,
        req.headers["user-agent"],
        req.ip,
      );

      const isProd = env.NODE_ENV === "production";
      res.cookie("refreshToken", result.refreshToken.rawToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      // Send the user back to the frontend, logged in.
      // Access token goes in the URL here only as one option — you may prefer
      // a short-lived one-time code exchanged by the frontend instead, to
      // avoid access tokens showing up in browser history/server logs.
      const redirectUrl = new URL("/oauth/success", env.FRONTEND_URL);
      redirectUrl.searchParams.set("accessToken", result.accessToken);
      res.redirect(redirectUrl.toString());
    } catch (error) {
      next(error);
    }
  }
}

export const authHandler = new AuthController();
