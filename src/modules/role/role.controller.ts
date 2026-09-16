import { NextFunction, Request, Response } from "express";
import { AppError } from "../../common/errors/AppError.js";
import { roleService } from "./role.service.js";

class RoleController {
  async listRolesHandler(req: Request, res: Response, next: NextFunction) {
    try {
      const authUser = req.user;
      if (!authUser) {
        throw new AppError(401, "You are not authenticated user");
      }

      const result = await roleService.listRoles();

      res.status(200).json({
        result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const roleHandler = new RoleController();
