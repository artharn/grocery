const pool = require("../../db/database");

const findByUsername = async (username) => {
  const result = await pool.query(
    "SELECT id, username, password_hash, role_id, is_active FROM users WHERE username = $1",
    [username]
  );

  return result.rows[0] || null;
};

module.exports = { findByUsername };
