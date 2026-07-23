const { Router } = require("express");
const { login, me } = require("../controllers/auth.controller");
const { validateLogin } = require("../validators/auth.validator");
const authenticate = require("../middlewares/auth");

const router = Router();

router.post("/auth/login", validateLogin, login);
router.get("/auth/me", authenticate, me);

module.exports = router;
