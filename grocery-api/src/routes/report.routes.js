const { Router } = require("express");
const controller = require("../controllers/report.controller");
const { validateDateRange } = require("../validators/report.validator");
const authenticate = require("../middlewares/auth");
const authorize = require("../middlewares/permission");

const router = Router();

router.get(
  "/reports/sales",
  authenticate,
  authorize("REPORT_VIEW"),
  validateDateRange,
  controller.salesReport
);
router.get(
  "/reports/products",
  authenticate,
  authorize("REPORT_VIEW"),
  validateDateRange,
  controller.productsReport
);

module.exports = router;
