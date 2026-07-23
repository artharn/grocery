const pool = require("../../db/database");

const pingDatabase = async () => {
  const result = await pool.query("SELECT NOW()");
  return result.rows[0].now;
};

module.exports = { pingDatabase };
