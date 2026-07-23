const asyncHandler = require("../utils/asyncHandler");
const healthService = require("../services/health.service");

// /health is an infra probe, not a client-facing resource (be-standard.md §5),
// so it intentionally returns its own shape instead of the { success, data }
// envelope and reports DB failures as a 500 body rather than routing through
// the centralized error middleware.
const getHealth = asyncHandler(async (req, res) => {
  try {
    const health = await healthService.checkHealth();
    res.json(health);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      status: "ERROR",
      database: "DISCONNECTED",
      message: error.message,
    });
  }
});

module.exports = { getHealth };
