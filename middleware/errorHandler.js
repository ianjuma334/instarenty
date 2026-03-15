import { GraphQLError } from 'graphql';
import { logError, logWarn } from '../utils/logger.js';

// Custom error classes
export class ValidationError extends GraphQLError {
  constructor(message, field = null) {
    super(message, {
      extensions: {
        code: 'VALIDATION_ERROR',
        field
      }
    });
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends GraphQLError {
  constructor(message = 'Authentication required') {
    super(message, {
      extensions: {
        code: 'UNAUTHENTICATED'
      }
    });
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends GraphQLError {
  constructor(message = 'Insufficient permissions') {
    super(message, {
      extensions: {
        code: 'FORBIDDEN'
      }
    });
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends GraphQLError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, {
      extensions: {
        code: 'NOT_FOUND'
      }
    });
    this.name = 'NotFoundError';
  }
}

// Express error handling middleware
export const expressErrorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  logError('Express Error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = { message, statusCode: 404 };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = { message, statusCode: 400 };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = { message, statusCode: 400 };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = { message, statusCode: 401 };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = { message, statusCode: 401 };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// GraphQL error formatting
export const formatGraphQLError = (error) => {
  const { originalError } = error;

  // Handle custom errors
  if (originalError instanceof ValidationError ||
      originalError instanceof AuthenticationError ||
      originalError instanceof AuthorizationError ||
      originalError instanceof NotFoundError) {
    return error;
  }

  // Handle mongoose errors
  if (originalError && originalError.name === 'ValidationError') {
    const message = Object.values(originalError.errors).map(val => val.message).join(', ');
    return new ValidationError(message);
  }

  if (originalError && originalError.name === 'CastError') {
    return new NotFoundError();
  }

  if (originalError && originalError.code === 11000) {
    return new ValidationError('Duplicate field value entered');
  }

  // Default error - preserve original error message for business logic errors
  logError('GraphQL Error', {
    error: error.message,
    stack: error.stack,
    path: error.path,
    extensions: error.extensions
  });

  // If it's a business logic error (not a system error), preserve the original message
  if (originalError && typeof originalError.message === 'string' &&
      !originalError.message.includes('Internal server error') &&
      !originalError.message.includes('Something went wrong')) {
    return new GraphQLError(originalError.message, {
      extensions: {
        code: 'INTERNAL_SERVER_ERROR'
      }
    });
  }

  return new GraphQLError('Internal server error', {
    extensions: {
      code: 'INTERNAL_SERVER_ERROR'
    }
  });
};

// Async handler wrapper to catch async errors
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);