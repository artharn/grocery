const stockRepository = require("../repositories/stock.repository");
const productService = require("./product.service");
const { NotFoundError, ConflictError } = require("../errors/AppError");

const SIGNED_QUANTITY_BY_TYPE = {
  IN: (quantity) => quantity,
  OUT: (quantity) => -quantity,
  ADJUST: (quantity) => quantity,
};

const getStockBalance = async (productId) => {
  await productService.getProduct(productId);
  const balance = await stockRepository.getBalance(productId);

  return { productId, balance };
};

const listStockTransactions = async (productId) => {
  await productService.getProduct(productId);
  return stockRepository.listByProduct(productId);
};

const createStockTransaction = async ({ productId, type, quantity, note, createdBy }) => {
  const signedQuantity = SIGNED_QUANTITY_BY_TYPE[type](quantity);

  const result = await stockRepository.recordTransaction({
    productId,
    type,
    quantity: signedQuantity,
    note: note ?? null,
    createdBy,
  });

  if (result.error === "NOT_FOUND") {
    throw new NotFoundError("Product not found");
  }

  if (result.error === "PRODUCT_INACTIVE") {
    throw new ConflictError("Cannot record a stock transaction against an inactive product");
  }

  if (result.error === "NEGATIVE_BALANCE") {
    throw new ConflictError(
      `Insufficient stock: current balance is ${result.currentBalance}, this would bring it below 0`
    );
  }

  return result;
};

module.exports = { getStockBalance, listStockTransactions, createStockTransaction };
