const pool = require("../../db/database");

const getTodaySales = async () => {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS count, COALESCE(SUM(total_amount), 0)::numeric AS total_amount
     FROM sales
     WHERE (created_at AT TIME ZONE 'UTC')::date = (NOW() AT TIME ZONE 'UTC')::date`
  );

  return result.rows[0];
};

const getTotalActiveProducts = async () => {
  const result = await pool.query(
    "SELECT COUNT(*)::int AS count FROM products WHERE is_active = TRUE"
  );

  return result.rows[0].count;
};

const getOutOfStockProducts = async () => {
  const result = await pool.query(
    `SELECT p.id, p.name
     FROM products p
     WHERE p.is_active = TRUE
       AND COALESCE(
         (SELECT SUM(st.quantity) FROM stock_transactions st WHERE st.product_id = p.id),
         0
       ) <= 0
     ORDER BY p.id ASC`
  );

  return result.rows;
};

const getTopProducts = async (limit = 5) => {
  const result = await pool.query(
    `SELECT si.product_id, p.name, SUM(si.quantity)::int AS total_quantity_sold
     FROM sale_items si
     JOIN products p ON p.id = si.product_id
     GROUP BY si.product_id, p.name
     ORDER BY total_quantity_sold DESC
     LIMIT $1`,
    [limit]
  );

  return result.rows;
};

module.exports = { getTodaySales, getTotalActiveProducts, getOutOfStockProducts, getTopProducts };
