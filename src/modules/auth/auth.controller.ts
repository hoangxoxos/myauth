import { Request, Response, NextFunction } from "express";
import { ValidatedRequest } from "../../common/types/request.js";
import { LoginInput, RegisterInput } from "./auth.schema.js";
import { userRepo } from "../user/user.repository.js";
import { authService } from "./auth.service.js";
import { env } from "../../config/env.js";

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

  async enable2FA(req: Request, res: Response, next: NextFunction) {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({
        message: "Not an authenticated user",
      });
    }

    try {
      const result = await authService.enable2FA(authUser.sub);

      res.status(200).json({
        success: true,
        message: "User two factor enabled",
        result,
      });
    } catch (error) {
      next(error);
    }
  }

  async disable2FA(req: Request, res: Response, next: NextFunction) {
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({
        message: "Not an authenticated user",
      });
    }

    try {
      const result = await authService.disable2FA(authUser.sub);

      res.status(200).json({
        success: true,
        message: "User two factor disabled",
        result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authHandler = new AuthController();
