const productRepository = require("../repositories/product.repository");
const { NotFoundError, ValidationError } = require("../errors/AppError");

const UNIQUE_VIOLATION = "23505";

const withBarcodeConflictHandling = async (fn) => {
  try {
    return await fn();
  } catch (error) {
    if (error.code === UNIQUE_VIOLATION) {
      throw new ValidationError("barcode is already in use");
    }
    throw error;
  }
};

const listProducts = async ({ includeInactive = false } = {}) =>
  productRepository.findAll({ includeInactive });

const getProduct = async (id) => {
  const product = await productRepository.findById(id);

  if (!product) {
    throw new NotFoundError("Product not found");
  }

  return product;
};

const createProduct = async (data) =>
  withBarcodeConflictHandling(() => productRepository.create(data));

const updateProduct = async (id, fields) => {
  await getProduct(id);

  const updated = await withBarcodeConflictHandling(() =>
    productRepository.update(id, fields)
  );

  return updated;
};

const deleteProduct = async (id) => {
  await getProduct(id);

  return productRepository.softDelete(id);
};

module.exports = { listProducts, getProduct, createProduct, updateProduct, deleteProduct };
