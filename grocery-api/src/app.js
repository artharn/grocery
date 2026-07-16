require("dotenv").config();

const express = require("express");
const pool = require("../db/database");

const app = express();

app.use(express.json());

app.get("/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");

    res.json({
      status: "OK",
      database: "CONNECTED With apply env",
      time: result.rows[0].now,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      status: "ERROR",
      database: "DISCONNECTED",
      message: error.message,
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`API Running on port ${PORT}`);
});
