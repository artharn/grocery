const pool = require("../../db/database");

const getBalance = async (productId) => {
  const result = await pool.query(
    "SELECT COALESCE(SUM(quantity), 0)::int AS balance FROM stock_transactions WHERE product_id = $1",
    [productId]
  );

  return result.rows[0].balance;
};

const listByProduct = async (productId) => {
  const result = await pool.query(
    `SELECT id, product_id, type, quantity, note, created_by, created_at
     FROM stock_transactions
     WHERE product_id = $1
     ORDER BY created_at DESC, id DESC`,
    [productId]
  );

  return result.rows;
};

// Locks the product row within an existing transaction so concurrent
// writes for the same product serialize instead of racing past the
// balance check. Returns id/price/is_active — sales.repository reuses the
// same locked read for pricing, avoiding a second lock query per item.
const lockProductForUpdate = async (client, productId) => {
  const result = await client.query(
    "SELECT id, price, is_active FROM products WHERE id = $1 FOR UPDATE",
    [productId]
  );

  return result.rows[0] || null;
};

const getBalanceWithClient = async (client, productId) => {
  const result = await client.query(
    "SELECT COALESCE(SUM(quantity), 0)::int AS balance FROM stock_transactions WHERE product_id = $1",
    [productId]
  );

  return result.rows[0].balance;
};

const insertStockTransaction = async (client, { productId, type, quantity, note, createdBy }) => {
  const result = await client.query(
    `INSERT INTO stock_transactions (product_id, type, quantity, note, created_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, product_id, type, quantity, note, created_by, created_at`,
    [productId, type, quantity, note, createdBy]
  );

  return result.rows[0];
};

// Shared enforcement point for "stock can never go negative, never moved
// on an inactive product" — takes an already-locked `product` row (see
// lockProductForUpdate) so callers that already hold the lock (e.g. the
// sales module, which also needs the row for pricing) don't lock twice.
const applyStockMovement = async (client, product, { type, quantity, note, createdBy }) => {
  if (!product.is_active) {
    return { error: "PRODUCT_INACTIVE" };
  }

  const currentBalance = await getBalanceWithClient(client, product.id);
  const newBalance = currentBalance + quantity;

  if (newBalance < 0) {
    return { error: "NEGATIVE_BALANCE", currentBalance };
  }

  const transaction = await insertStockTransaction(client, {
    productId: product.id,
    type,
    quantity,
    note,
    createdBy,
  });

  return { transaction, balance: newBalance };
};

// Single-movement convenience used by the inventory endpoints: opens its
// own transaction, locks the product, applies the movement, commits.
const recordTransaction = async ({ productId, type, quantity, note, createdBy }) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const product = await lockProductForUpdate(client, productId);

    if (!product) {
      await client.query("ROLLBACK");
      return { error: "NOT_FOUND" };
    }

    const result = await applyStockMovement(client, product, {
      type,
      quantity,
      note,
      createdBy,
    });

    if (result.error) {
      await client.query("ROLLBACK");
    } else {
      await client.query("COMMIT");
    }

    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  getBalance,
  listByProduct,
  recordTransaction,
  lockProductForUpdate,
  applyStockMovement,
};
