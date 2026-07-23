const { ValidationError } = require("../errors/AppError");

const isNonEmptyString = (value, maxLength) =>
  typeof value === "string" && value.trim() !== "" && value.length <= maxLength;

const isNonNegativeNumber = (value) => typeof value === "number" && value >= 0;

const validateProductId = (req, res, next) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return next(new ValidationError("id must be a positive integer"));
  }

  req.params.id = id;
  next();
};

const validateCreateProduct = (req, res, next) => {
  const { name, price, barcode, cost, image_url: imageUrl } = req.body || {};

  if (!isNonEmptyString(name, 255)) {
    return next(new ValidationError("name is required (string, max 255 chars)"));
  }

  if (!isNonNegativeNumber(price)) {
    return next(new ValidationError("price is required (number >= 0)"));
  }

  if (barcode !== undefined && !isNonEmptyString(barcode, 100)) {
    return next(new ValidationError("barcode must be a string (max 100 chars)"));
  }

  if (cost !== undefined && cost !== null && !isNonNegativeNumber(cost)) {
    return next(new ValidationError("cost must be a number >= 0"));
  }

  if (imageUrl !== undefined && imageUrl !== null && !isNonEmptyString(imageUrl, 2048)) {
    return next(new ValidationError("image_url must be a string (max 2048 chars)"));
  }

  next();
};

const validateUpdateProduct = (req, res, next) => {
  const { name, price, barcode, cost, image_url: imageUrl } = req.body || {};

  if (
    name === undefined &&
    price === undefined &&
    barcode === undefined &&
    cost === undefined &&
    imageUrl === undefined
  ) {
    return next(
      new ValidationError("at least one of name, price, barcode, cost, image_url is required")
    );
  }

  if (name !== undefined && !isNonEmptyString(name, 255)) {
    return next(new ValidationError("name must be a non-empty string (max 255 chars)"));
  }

  if (price !== undefined && !isNonNegativeNumber(price)) {
    return next(new ValidationError("price must be a number >= 0"));
  }

  if (barcode !== undefined && !isNonEmptyString(barcode, 100)) {
    return next(new ValidationError("barcode must be a string (max 100 chars)"));
  }

  if (cost !== undefined && cost !== null && !isNonNegativeNumber(cost)) {
    return next(new ValidationError("cost must be a number >= 0"));
  }

  if (imageUrl !== undefined && imageUrl !== null && !isNonEmptyString(imageUrl, 2048)) {
    return next(new ValidationError("image_url must be a string (max 2048 chars)"));
  }

  next();
};

module.exports = { validateProductId, validateCreateProduct, validateUpdateProduct };
