const { Router } = require("express");
const controller = require("../controllers/dashboard.controller");
const authenticate = require("../middlewares/auth");
const authorize = require("../middlewares/permission");

const router = Router();

router.get("/dashboard/metrics", authenticate, authorize("DASHBOARD_VIEW"), controller.getMetrics);

module.exports = router;
