const asyncHandler = require("../utils/asyncHandler");
const dashboardService = require("../services/dashboard.service");

const getMetrics = asyncHandler(async (req, res) => {
  const metrics = await dashboardService.getDashboardMetrics();

  res.json({ success: true, data: metrics });
});

module.exports = { getMetrics };
