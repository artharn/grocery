const asyncHandler = require("../utils/asyncHandler");
const saleService = require("../services/sale.service");

const create = asyncHandler(async (req, res) => {
  const result = await saleService.createSale({
    items: req.body.items,
    createdBy: req.user.id,
  });

  res.status(201).json({ success: true, data: { sale: result.sale, items: result.items } });
});

const list = asyncHandler(async (req, res) => {
  const sales = await saleService.listSales();

  res.json({ success: true, data: { sales } });
});

const getOne = asyncHandler(async (req, res) => {
  const sale = await saleService.getSale(req.params.id);

  res.json({ success: true, data: { sale } });
});

module.exports = { create, list, getOne };
