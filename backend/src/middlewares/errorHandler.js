// Centralized error handling middleware for Express
const errorHandler = (err, req, res, next) => {
  console.error(`[Server Error] ${req.method} ${req.originalUrl}:`, err.message || err);

  // Duplicate key constraint (e.g., user email already registered in this tenant)
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      success: false,
      message: 'A record with this information already exists in your organization'
    });
  }

  // Foreign key reference failure
  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({
      success: false,
      message: 'Referenced entity does not exist or does not belong to your tenant'
    });
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    message
  });
};

module.exports = errorHandler;
