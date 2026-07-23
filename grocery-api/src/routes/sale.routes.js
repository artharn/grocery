const { Router } = require("express");
const controller = require("../controllers/sale.controller");
const { validateCreateSale, validateSaleId } = require("../validators/sale.validator");
const authenticate = require("../middlewares/auth");
const authorize = require("../middlewares/permission");

const router = Router();

router.get("/sales", authenticate, controller.list);
router.get("/sales/:id", authenticate, validateSaleId, controller.getOne);
router.post("/sales", authenticate, authorize("SALE_CREATE"), validateCreateSale, controller.create);

module.exports = router;
