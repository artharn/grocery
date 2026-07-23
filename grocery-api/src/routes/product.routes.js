const { Router } = require("express");
const controller = require("../controllers/product.controller");
const {
  validateProductId,
  validateCreateProduct,
  validateUpdateProduct,
} = require("../validators/product.validator");
const authenticate = require("../middlewares/auth");
const authorize = require("../middlewares/permission");

const router = Router();

router.get("/products", authenticate, controller.list);
router.get("/products/:id", authenticate, validateProductId, controller.getOne);
router.post(
  "/products",
  authenticate,
  authorize("PRODUCT_CREATE"),
  validateCreateProduct,
  controller.create
);
router.put(
  "/products/:id",
  authenticate,
  authorize("PRODUCT_UPDATE"),
  validateProductId,
  validateUpdateProduct,
  controller.update
);
router.delete(
  "/products/:id",
  authenticate,
  authorize("PRODUCT_DELETE"),
  validateProductId,
  controller.remove
);

module.exports = router;
