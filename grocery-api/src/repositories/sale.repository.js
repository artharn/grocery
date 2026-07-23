const pool = require("../../db/database");
const stockRepository = require("./stock.repository");

const round2 = (value) => Math.round(value * 100) / 100;

// Atomic: locks every referenced product, resolves price server-side from
// that locked read, deducts stock via a SALE-type movement per item, then
// writes the sale + its line items — all in one transaction. Any failure
// (unknown product, inactive product, insufficient stock) rolls back the
// whole sale, not just the failing item.
const createSale = async ({ saleNo, items, createdBy }) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const resolvedItems = [];

    for (const item of items) {
      const product = await stockRepository.lockProductForUpdate(client, item.productId);

      if (!product) {
        await client.query("ROLLBACK");
        return { error: "PRODUCT_NOT_FOUND", productId: item.productId };
      }

      if (!product.is_active) {
        await client.query("ROLLBACK");
        return { error: "PRODUCT_INACTIVE", productId: item.productId };
      }

      const movement = await stockRepository.applyStockMovement(client, product, {
        type: "SALE",
        quantity: -item.quantity,
        note: null,
        createdBy,
      });

      if (movement.error === "NEGATIVE_BALANCE") {
        await client.query("ROLLBACK");
        return {
          error: "INSUFFICIENT_STOCK",
          productId: item.productId,
          currentBalance: movement.currentBalance,
        };
      }

      resolvedItems.push({
        productId: product.id,
        quantity: item.quantity,
        price: Number(product.price),
      });
    }

    const totalAmount = round2(
      resolvedItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
    );

    const saleResult = await client.query(
      `INSERT INTO sales (sale_no, total_amount, created_by)
       VALUES ($1, $2, $3)
       RETURNING id, sale_no, total_amount, created_by, created_at`,
      [saleNo, totalAmount, createdBy]
    );
    const sale = saleResult.rows[0];

    const insertedItems = [];

    for (const item of resolvedItems) {
      const subtotal = round2(item.price * item.quantity);

      const itemResult = await client.query(
        `INSERT INTO sale_items (sale_id, product_id, quantity, price, subtotal)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, sale_id, product_id, quantity, price, subtotal`,
        [sale.id, item.productId, item.quantity, item.price, subtotal]
      );

      insertedItems.push(itemResult.rows[0]);
    }

    await client.query("COMMIT");

    return { sale, items: insertedItems };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const findAll = async () => {
  const result = await pool.query(
    `SELECT id, sale_no, total_amount, created_by, created_at
     FROM sales
     ORDER BY created_at DESC, id DESC`
  );

  return result.rows;
};

const findByIdWithItems = async (id) => {
  const saleResult = await pool.query(
    `SELECT id, sale_no, total_amount, created_by, created_at FROM sales WHERE id = $1`,
    [id]
  );
  const sale = saleResult.rows[0];

  if (!sale) {
    return null;
  }

  const itemsResult = await pool.query(
    `SELECT id, sale_id, product_id, quantity, price, subtotal
     FROM sale_items
     WHERE sale_id = $1
     ORDER BY id ASC`,
    [id]
  );

  return { ...sale, items: itemsResult.rows };
};

module.exports = { createSale, findAll, findByIdWithItems };
