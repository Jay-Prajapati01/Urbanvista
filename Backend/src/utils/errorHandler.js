class AppError extends Error {
  constructor(message, status = 500, code = "INTERNAL_ERROR", details = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

function handleError(err, req, res, _next) {
  const isOperational = err instanceof AppError;
  const status = isOperational ? err.status : 500;
  const body = {
    message: isOperational ? err.message : "Internal server error",
    code: isOperational ? err.code : "INTERNAL_ERROR",
  };
  if (process.env.NODE_ENV !== "production") {
    body.stack = err.stack;
    if (err.details) body.details = err.details;
  }
  console.error("Handled error:", err);
  res.status(status).json(body);
}

module.exports = { AppError, handleError };
