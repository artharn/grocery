const { Router } = require("express");
const controller = require("../controllers/stock.controller");
const {
  validateCreateStockTransaction,
  validateProductIdParam,
} = require("../validators/stock.validator");
const authenticate = require("../middlewares/auth");
const authorize = require("../middlewares/permission");

const router = Router();

router.get(
  "/products/:productId/stock",
  authenticate,
  validateProductIdParam,
  controller.getBalance
);
router.get(
  "/products/:productId/stock-transactions",
  authenticate,
  validateProductIdParam,
  controller.listTransactions
);
router.post(
  "/products/:productId/stock-transactions",
  authenticate,
  authorize("STOCK_ADJUST"),
  validateProductIdParam,
  validateCreateStockTransaction,
  controller.createTransaction
);

module.exports = router;
