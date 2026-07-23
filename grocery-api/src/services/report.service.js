const reportRepository = require("../repositories/report.repository");

const getSalesReport = async (startDate, endDate) => {
  const [totals, dailyBreakdown] = await Promise.all([
    reportRepository.getSalesTotals(startDate, endDate),
    reportRepository.getDailyBreakdown(startDate, endDate),
  ]);

  return {
    startDate,
    endDate,
    totalSales: totals.total_sales,
    totalRevenue: Number(totals.total_revenue),
    dailyBreakdown: dailyBreakdown.map((row) => ({
      date: row.date,
      count: row.count,
      revenue: Number(row.revenue),
    })),
  };
};

const getProductsReport = async (startDate, endDate) => {
  const rows = await reportRepository.getProductPerformance(startDate, endDate);

  return {
    startDate,
    endDate,
    products: rows.map((row) => ({
      productId: row.product_id,
      name: row.name,
      quantitySold: row.quantity_sold,
      revenue: Number(row.revenue),
    })),
  };
};

module.exports = { getSalesReport, getProductsReport };
