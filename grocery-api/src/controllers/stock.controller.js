const asyncHandler = require("../utils/asyncHandler");
const stockService = require("../services/stock.service");

const getBalance = asyncHandler(async (req, res) => {
  const balance = await stockService.getStockBalance(req.params.productId);

  res.json({ success: true, data: balance });
});

const listTransactions = asyncHandler(async (req, res) => {
  const transactions = await stockService.listStockTransactions(req.params.productId);

  res.json({ success: true, data: { transactions } });
});

const createTransaction = asyncHandler(async (req, res) => {
  const { type, quantity, note } = req.body;

  const result = await stockService.createStockTransaction({
    productId: req.params.productId,
    type,
    quantity,
    note,
    createdBy: req.user.id,
  });

  res.status(201).json({
    success: true,
    data: { transaction: result.transaction, balance: result.balance },
  });
});

module.exports = { getBalance, listTransactions, createTransaction };
