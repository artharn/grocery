const asyncHandler = require("../utils/asyncHandler");
const reportService = require("../services/report.service");

const salesReport = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const report = await reportService.getSalesReport(startDate, endDate);

  res.json({ success: true, data: report });
});

const productsReport = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const report = await reportService.getProductsReport(startDate, endDate);

  res.json({ success: true, data: report });
});

module.exports = { salesReport, productsReport };
