const saleRepository = require("../repositories/sale.repository");
const generateSaleNo = require("../utils/generateSaleNo");
const { NotFoundError, ConflictError } = require("../errors/AppError");

const createSale = async ({ items, createdBy }) => {
  const result = await saleRepository.createSale({
    saleNo: generateSaleNo(),
    items,
    createdBy,
  });

  if (result.error === "PRODUCT_NOT_FOUND") {
    throw new NotFoundError(`Product ${result.productId} not found`);
  }

  if (result.error === "PRODUCT_INACTIVE") {
    throw new ConflictError(`Product ${result.productId} is inactive and cannot be sold`);
  }

  if (result.error === "INSUFFICIENT_STOCK") {
    throw new ConflictError(
      `Insufficient stock for product ${result.productId} (current balance ${result.currentBalance})`
    );
  }

  return result;
};

const listSales = async () => saleRepository.findAll();

const getSale = async (id) => {
  const sale = await saleRepository.findByIdWithItems(id);

  if (!sale) {
    throw new NotFoundError("Sale not found");
  }

  return sale;
};

module.exports = { createSale, listSales, getSale };
