const asyncHandler = require("../utils/asyncHandler");
const authService = require("../services/auth.service");
const permissionService = require("../services/permission.service");

const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  const result = await authService.login(username, password);

  res.json({ success: true, data: result });
});

// Returns the identity carried by the access token, plus the role's
// current permission codes — the frontend's only way to know what to show
// without hardcoding role->permission mappings that could drift from
// role_permissions (the real source of truth).
const me = asyncHandler(async (req, res) => {
  const permissions = await permissionService.listPermissionCodes(req.user.roleId);

  res.json({ success: true, data: { user: { ...req.user, permissions } } });
});

module.exports = { login, me };
