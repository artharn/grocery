const userRepository = require("../repositories/user.repository");
const passwordService = require("./password.service");
const tokenService = require("./token.service");
const permissionService = require("./permission.service");
const { UnauthorizedError } = require("../errors/AppError");

const login = async (username, password) => {
  const user = await userRepository.findByUsername(username);

  if (!user || !user.is_active) {
    throw new UnauthorizedError("Invalid username or password");
  }

  const passwordMatches = await passwordService.verifyPassword(
    password,
    user.password_hash
  );

  if (!passwordMatches) {
    throw new UnauthorizedError("Invalid username or password");
  }

  const payload = { sub: user.id, username: user.username, roleId: user.role_id };
  const permissions = await permissionService.listPermissionCodes(user.role_id);

  return {
    accessToken: tokenService.generateAccessToken(payload),
    refreshToken: tokenService.generateRefreshToken(payload),
    user: { id: user.id, username: user.username, roleId: user.role_id, permissions },
  };
};

module.exports = { login };
