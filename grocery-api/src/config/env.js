const path = require("path");

// Resolve .env against the repo root explicitly (it lives one level above
// grocery-api/, next to docker-compose.yml) instead of process.cwd(), so
// this loads consistently whether the process is started from the repo
// root, from inside grocery-api/, or via Docker's env_file injection.
require("dotenv").config({ path: path.join(__dirname, "../../../.env") });

const REQUIRED_VARS = [
  "DB_HOST",
  "DB_PORT",
  "DB_NAME",
  "DB_USER",
  "DB_PASSWORD",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
  "JWT_ACCESS_EXPIRES_IN",
  "JWT_REFRESH_EXPIRES_IN",
  "BCRYPT_ROUNDS",
];

for (const name of REQUIRED_VARS) {
  if (!process.env[name]) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

const config = Object.freeze({
  env: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT, 10) || 3000,
  db: Object.freeze({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10),
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  }),
  jwt: Object.freeze({
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
  }),
  bcrypt: Object.freeze({
    rounds: parseInt(process.env.BCRYPT_ROUNDS, 10),
  }),
  corsOrigins: Object.freeze(
    (process.env.CORS_ORIGINS || "http://localhost:5173,http://localhost:4173")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
  ),
});

module.exports = config;
