import { Request, Response, NextFunction } from "express";
import { ZodType } from "zod";

type ValidationTarget = "body" | "params" | "query";

export function validate<T extends ZodType>(
  schema: T,
  target: ValidationTarget,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.parse(req[target]);

      req[target] = result;
      next();
    } catch (error) {
      next(error);
    }
  };
}

export const validateBody = (schema: ZodType) => validate(schema, "body");
export const validateParams = (schema: ZodType) => validate(schema, "params");
export const validateQuery = (schema: ZodType) => validate(schema, "query");

// router.post(
//   "/organizations/:orgId/users",
//   authenticate,
//   validateParams(orgIdSchema),
//   requireOrgAccess,
//   validateBody(createUserSchema),
//   userController.create,
// );
