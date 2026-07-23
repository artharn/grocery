const { ValidationError } = require("../errors/AppError");

const validateCreateSale = (req, res, next) => {
  const { items } = req.body || {};

  if (!Array.isArray(items) || items.length === 0) {
    return next(new ValidationError("items must be a non-empty array"));
  }

  for (const item of items) {
    if (!item || !Number.isInteger(item.productId) || item.productId <= 0) {
      return next(new ValidationError("each item requires a positive integer productId"));
    }

    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      return next(new ValidationError("each item requires a positive integer quantity"));
    }
  }

  next();
};

const validateSaleId = (req, res, next) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return next(new ValidationError("id must be a positive integer"));
  }

  req.params.id = id;
  next();
};

module.exports = { validateCreateSale, validateSaleId };
