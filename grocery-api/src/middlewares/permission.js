const asyncHandler = require("../utils/asyncHandler");
const permissionService = require("../services/permission.service");
const { UnauthorizedError, ForbiddenError } = require("../errors/AppError");

// Must run after the `authenticate` middleware — relies on req.user.roleId.
const authorize = (permissionCode) =>
  asyncHandler(async (req, res, next) => {
    if (!req.user) {
      throw new UnauthorizedError();
    }

    const allowed = await permissionService.hasPermission(req.user.roleId, permissionCode);

    if (!allowed) {
      throw new ForbiddenError("Insufficient permissions");
    }

    next();
  });

module.exports = authorize;
