const errorHandler = (error, req, res, next) => {
  console.error('Error:', error);

  // Mongoose validation error
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(err => ({
      field: err.path,
      message: err.message
    }));
    
    return res.status(400).json({
      error: 'Validation failed',
      details: errors,
      code: 'VALIDATION_ERROR'
    });
  }

  // Mongoose duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return res.status(409).json({
      error: `${field} already exists`,
      field: field,
      code: 'DUPLICATE_ENTRY'
    });
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token',
      code: 'INVALID_TOKEN'
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expired',
      code: 'TOKEN_EXPIRED'
    });
  }

  // Multer file upload errors
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: 'File too large',
      maxSize: '5MB',
      code: 'FILE_TOO_LARGE'
    });
  }

  // Default error
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal server error';

  res.status(statusCode).json({
    error: message,
    code: error.code || 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
};

module.exports = errorHandler;