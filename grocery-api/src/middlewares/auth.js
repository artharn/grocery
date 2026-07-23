const tokenService = require("../services/token.service");
const { UnauthorizedError } = require("../errors/AppError");

const authenticate = (req, res, next) => {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return next(new UnauthorizedError("Missing or malformed Authorization header"));
  }

  try {
    const payload = tokenService.verifyAccessToken(token);
    req.user = { id: payload.sub, username: payload.username, roleId: payload.roleId };
    next();
  } catch (error) {
    next(new UnauthorizedError("Invalid or expired token"));
  }
};

module.exports = authenticate;
