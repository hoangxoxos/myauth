import { NextFunction, Request, Response } from "express";
import { AppError } from "../../common/errors/AppError.js";
import { permissionService } from "./permission.service.js";

export class PermissionController {
  async listPermissionsHandler(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const authUser = req.user;
      if (!authUser) {
        throw new AppError(401, "You are not authenticated user");
      }

      const result = await permissionService.listPermissions();

      res.status(200).json({
        message: "All permissions and attached roleIds",
        result,
      });
    } catch (error) {
      next(error);
    }
  }

  async createPermissionHandler(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const authUser = req.user;
      if (!authUser) {
        throw new AppError(401, "You are not authenticated user");
      }

      const { name, description } = req.body;
      if (typeof name !== "string" || !name) {
        throw new AppError(
          400,
          "Permission name is required and cannot be empty",
        );
      }

      if (description) {
        if (typeof description !== "string") {
          throw new AppError(400, "Description must be a string");
        }
      }
      const result = await permissionService.createPermission(
        name,
        description,
      );

      res.status(201).json({
        success: true,
        message: "Permission created",
        result,
      });
    } catch (error) {
      next(error);
    }
  }

  async attachPermissionHandler(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const authUser = req.user;
      if (!authUser) {
        throw new AppError(401, "You are not authenticated user");
      }

      const roleId = req.params.roleId as string;
      const permissionId = req.params.permissionId as string;

      if (typeof roleId !== "string" || !roleId) {
        throw new AppError(400, "roleId is required");
      }

      if (typeof permissionId !== "string" || !permissionId) {
        throw new AppError(400, "permissionId is required");
      }

      const result = await permissionService.attachPermission(
        roleId,
        permissionId,
      );

      res.status(201).json({
        success: true,
        message: "Attach permission to role successful.",
        result,
      });
    } catch (error) {
      next(error);
    }
  }

  async detachPermissionHandler(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const authUser = req.user;
      if (!authUser) {
        throw new AppError(401, "You are not authenticated user");
      }

      const roleId = req.params.roleId as string;
      const permissionId = req.params.permissionId as string;

      if (typeof roleId !== "string" || !roleId) {
        throw new AppError(400, "roleId is required");
      }

      if (typeof permissionId !== "string" || !permissionId) {
        throw new AppError(400, "permissionId is required");
      }

      const result = await permissionService.detachPermission(
        roleId,
        permissionId,
      );

      res.status(200).json({
        success: true,
        message: "Detach permission to role successful.",
        result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const permissionHandler = new PermissionController();
