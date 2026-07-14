const { Pool } = require("pg");

const pool = new Pool({
  host: "postgres",
  port: 5432,
  database: "grocery",
  user: "admin",
  password: "admin123",
});

module.exports = pool;