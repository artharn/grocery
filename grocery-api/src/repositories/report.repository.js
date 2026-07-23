const pool = require("../../db/database");

const getSalesTotals = async (startDate, endDate) => {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS total_sales, COALESCE(SUM(total_amount), 0)::numeric AS total_revenue
     FROM sales
     WHERE (created_at AT TIME ZONE 'UTC')::date BETWEEN $1 AND $2`,
    [startDate, endDate]
  );

  return result.rows[0];
};

const getDailyBreakdown = async (startDate, endDate) => {
  // Date formatted as text in SQL (TO_CHAR) rather than left as a `date`
  // value — node-postgres parses `date` columns using the host's local
  // timezone, and a later .toISOString() on that shifts the calendar day
  // whenever local time differs from UTC. Formatting server-side avoids
  // the round-trip entirely.
  const result = await pool.query(
    `SELECT TO_CHAR((created_at AT TIME ZONE 'UTC')::date, 'YYYY-MM-DD') AS date,
            COUNT(*)::int AS count,
            SUM(total_amount)::numeric AS revenue
     FROM sales
     WHERE (created_at AT TIME ZONE 'UTC')::date BETWEEN $1 AND $2
     GROUP BY (created_at AT TIME ZONE 'UTC')::date
     ORDER BY (created_at AT TIME ZONE 'UTC')::date ASC`,
    [startDate, endDate]
  );

  return result.rows;
};

const getProductPerformance = async (startDate, endDate) => {
  const result = await pool.query(
    `SELECT si.product_id,
            p.name,
            SUM(si.quantity)::int AS quantity_sold,
            SUM(si.subtotal)::numeric AS revenue
     FROM sale_items si
     JOIN sales s ON s.id = si.sale_id
     JOIN products p ON p.id = si.product_id
     WHERE (s.created_at AT TIME ZONE 'UTC')::date BETWEEN $1 AND $2
     GROUP BY si.product_id, p.name
     ORDER BY revenue DESC`,
    [startDate, endDate]
  );

  return result.rows;
};

module.exports = { getSalesTotals, getDailyBreakdown, getProductPerformance };
