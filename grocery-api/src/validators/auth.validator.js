const { ValidationError } = require("../errors/AppError");

const validateLogin = (req, res, next) => {
  const { username, password } = req.body || {};

  if (typeof username !== "string" || username.trim() === "") {
    return next(new ValidationError("username is required"));
  }

  if (typeof password !== "string" || password === "") {
    return next(new ValidationError("password is required"));
  }

  next();
};

module.exports = { validateLogin };
