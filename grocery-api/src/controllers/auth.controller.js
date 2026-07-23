const asyncHandler = require("../utils/asyncHandler");
const authService = require("../services/auth.service");

const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  const result = await authService.login(username, password);

  res.json({ success: true, data: result });
});

// Returns the identity carried by the access token — the minimal endpoint
// needed to prove `authenticate` middleware verifies tokens end-to-end.
const me = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { user: req.user } });
});

module.exports = { login, me };
