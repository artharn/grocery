const asyncHandler = require("../utils/asyncHandler");
const productService = require("../services/product.service");

const UPDATABLE_FIELDS = ["name", "price", "barcode", "cost", "image_url"];

const pickUpdatableFields = (body) =>
  UPDATABLE_FIELDS.reduce((fields, key) => {
    if (body[key] !== undefined) fields[key] = body[key];
    return fields;
  }, {});

const list = asyncHandler(async (req, res) => {
  const includeInactive = req.query.includeInactive === "true";
  const products = await productService.listProducts({ includeInactive });

  res.json({ success: true, data: { products } });
});

const getOne = asyncHandler(async (req, res) => {
  const product = await productService.getProduct(req.params.id);

  res.json({ success: true, data: { product } });
});

const create = asyncHandler(async (req, res) => {
  const { name, price, barcode, cost, image_url: imageUrl } = req.body;
  const product = await productService.createProduct({
    name,
    price,
    barcode,
    cost,
    image_url: imageUrl,
  });

  res.status(201).json({ success: true, data: { product } });
});

const update = asyncHandler(async (req, res) => {
  const product = await productService.updateProduct(
    req.params.id,
    pickUpdatableFields(req.body)
  );

  res.json({ success: true, data: { product } });
});

const remove = asyncHandler(async (req, res) => {
  const product = await productService.deleteProduct(req.params.id);

  res.json({ success: true, data: { product } });
});

module.exports = { list, getOne, create, update, remove };
