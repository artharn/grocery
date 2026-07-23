const pool = require("../../db/database");

const findAll = async ({ includeInactive = false } = {}) => {
  const where = includeInactive ? "" : "WHERE is_active = TRUE";
  const result = await pool.query(
    `SELECT id, barcode, name, price, cost, is_active, created_at, updated_at
     FROM products
     ${where}
     ORDER BY id ASC`
  );

  return result.rows;
};

const findById = async (id) => {
  const result = await pool.query(
    `SELECT id, barcode, name, price, cost, is_active, created_at, updated_at
     FROM products
     WHERE id = $1`,
    [id]
  );

  return result.rows[0] || null;
};

const create = async ({ name, price, barcode = null, cost = null }) => {
  const result = await pool.query(
    `INSERT INTO products (name, price, barcode, cost)
     VALUES ($1, $2, $3, $4)
     RETURNING id, barcode, name, price, cost, is_active, created_at, updated_at`,
    [name, price, barcode, cost]
  );

  return result.rows[0];
};

const update = async (id, fields) => {
  const columns = Object.keys(fields);
  const setClause = columns.map((col, i) => `${col} = $${i + 2}`).join(", ");

  const result = await pool.query(
    `UPDATE products
     SET ${setClause}, updated_at = NOW()
     WHERE id = $1
     RETURNING id, barcode, name, price, cost, is_active, created_at, updated_at`,
    [id, ...columns.map((col) => fields[col])]
  );

  return result.rows[0] || null;
};

const softDelete = async (id) => {
  const result = await pool.query(
    `UPDATE products
     SET is_active = FALSE, updated_at = NOW()
     WHERE id = $1
     RETURNING id, barcode, name, price, cost, is_active, created_at, updated_at`,
    [id]
  );

  return result.rows[0] || null;
};

module.exports = { findAll, findById, create, update, softDelete };
