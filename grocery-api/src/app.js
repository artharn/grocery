const express = require("express");
const cors = require("cors");
const config = require("./config/env");
const healthRoutes = require("./routes/health.routes");
const authRoutes = require("./routes/auth.routes");
const productRoutes = require("./routes/product.routes");
const stockRoutes = require("./routes/stock.routes");
const saleRoutes = require("./routes/sale.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const reportRoutes = require("./routes/report.routes");
const errorHandler = require("./middlewares/error");

const app = express();

app.use(cors({ origin: config.corsOrigins }));
app.use(express.json());

app.use(healthRoutes);
app.use(authRoutes);
app.use(productRoutes);
app.use(stockRoutes);
app.use(saleRoutes);
app.use(dashboardRoutes);
app.use(reportRoutes);

app.use(errorHandler);

module.exports = app;
