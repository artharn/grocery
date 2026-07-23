const dashboardRepository = require("../repositories/dashboard.repository");

const getDashboardMetrics = async () => {
  const [todaySales, totalActiveProducts, outOfStockProducts, topProducts] = await Promise.all([
    dashboardRepository.getTodaySales(),
    dashboardRepository.getTotalActiveProducts(),
    dashboardRepository.getOutOfStockProducts(),
    dashboardRepository.getTopProducts(5),
  ]);

  return {
    todaySales: {
      count: todaySales.count,
      totalAmount: Number(todaySales.total_amount),
    },
    totalActiveProducts,
    outOfStockProducts,
    topProducts: topProducts.map((p) => ({
      productId: p.product_id,
      name: p.name,
      totalQuantitySold: p.total_quantity_sold,
    })),
  };
};

module.exports = { getDashboardMetrics };
