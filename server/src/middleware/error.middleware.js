import { ApiError } from "../utils/apiError.js";

export const notFound = (req, res, next) => {
  next(new ApiError(404, `Route Not Found : ${req.originalUrl}`));
};

export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  let errors = [];

  if (err.name === "ValidationError") {
    statusCode = 400;
    message = "Validation failed";

    errors = Object.values(err.errors || {}).map((item) => ({
      field: item.path,
      message: item.message,
    }));
  }

  if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  if (err.code === 11000) {
    statusCode = 409;

    const duplicateField = Object.keys(err.keyValue || {})[0];

    message = duplicateField
      ? `${duplicateField} already exists.`
      : "Duplicate record found.";

    errors = Object.entries(err.keyValue || {}).map(([field, value]) => ({
      field,
      message: `${field} already exists.`,
      value,
    }));
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
};