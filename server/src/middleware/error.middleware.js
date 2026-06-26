import { ApiError } from "../utils/apiError.js";

export const notFound = (req, res, next) => {
  next(
    new ApiError(
      404,
      `Route Not Found : ${req.originalUrl}`
    )
  );
};

export const errorHandler = ( err, req, res, next ) => {
  let statusCode = err.statusCode || 500;

  let message = err.message || "Internal Server Error";

  if (err.name === "ValidationError") {
    statusCode = 400;
  }

  if (err.code === 11000) {
    statusCode = 409;
    message = "Duplicate record found.";
  }

  res.status(statusCode).json({
    success: false,
    message,

    errors: err.errors || [],

    stack:
      process.env.NODE_ENV === "development"
        ? err.stack
        : undefined,
  });
};