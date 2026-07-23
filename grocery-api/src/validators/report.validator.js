const { ValidationError } = require("../errors/AppError");

const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/;

const isValidIsoDate = (value) => {
  if (typeof value !== "string" || !DATE_FORMAT.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);

  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const validateDateRange = (req, res, next) => {
  const { startDate, endDate } = req.query;

  if (!isValidIsoDate(startDate)) {
    return next(new ValidationError("startDate is required (YYYY-MM-DD)"));
  }

  if (!isValidIsoDate(endDate)) {
    return next(new ValidationError("endDate is required (YYYY-MM-DD)"));
  }

  if (startDate > endDate) {
    return next(new ValidationError("startDate must not be after endDate"));
  }

  next();
};

module.exports = { validateDateRange };
