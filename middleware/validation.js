import Joi from 'joi';
import { ValidationError } from './errorHandler.js';

// User registration validation schema
export const registerUserSchema = Joi.object({
  fname: Joi.string().min(2).max(50).required().messages({
    'string.empty': 'First name is required',
    'string.min': 'First name must be at least 2 characters',
    'string.max': 'First name cannot exceed 50 characters'
  }),
  lname: Joi.string().min(2).max(50).required().messages({
    'string.empty': 'Last name is required',
    'string.min': 'Last name must be at least 2 characters',
    'string.max': 'Last name cannot exceed 50 characters'
  }),
  username: Joi.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/).required().messages({
    'string.empty': 'Username is required',
    'string.min': 'Username must be at least 3 characters',
    'string.max': 'Username cannot exceed 30 characters',
    'string.pattern.base': 'Username can only contain letters, numbers, and underscores'
  }),
  email: Joi.string().min(1).required().messages({
    'string.empty': 'Email is required',
    'string.min': 'Email cannot be empty'
  }),
  password: Joi.string().min(8).max(128).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required().messages({
    'string.empty': 'Password is required',
    'string.min': 'Password must be at least 8 characters',
    'string.max': 'Password cannot exceed 128 characters',
    'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
  }),
  phone: Joi.string().pattern(/^(\+254|0)[17]\d{8}$/).required().messages({
    'string.empty': 'Phone number is required',
    'string.pattern.base': 'Please provide a valid Kenyan phone number'
  }),
  gender: Joi.string().valid('male', 'female', 'other').required().messages({
    'any.only': 'Gender must be male, female, or other'
  }),
  role: Joi.string().valid('landlord', 'tenant').required().messages({
    'any.only': 'Role must be either landlord or tenant'
  }),
  county: Joi.string().min(2).max(50).required().messages({
    'string.empty': 'County is required'
  }),
  subcounty: Joi.string().min(2).max(50).required().messages({
    'string.empty': 'Subcounty is required'
  }),
  ward: Joi.string().min(2).max(50).required().messages({
    'string.empty': 'Ward is required'
  }),
  referredBy: Joi.string().optional()
});

// Login validation schema
export const loginUserSchema = Joi.object({
  email: Joi.string().min(1).required().messages({
    'string.empty': 'Email is required',
    'string.min': 'Email cannot be empty'
  }),
  password: Joi.string().required().messages({
    'string.empty': 'Password is required'
  })
});

// Update user validation schema
export const updateUserSchema = Joi.object({
  id: Joi.string().required().messages({
    'string.empty': 'User ID is required'
  }),
  fname: Joi.string().min(2).max(50).optional(),
  lname: Joi.string().min(2).max(50).optional(),
  username: Joi.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/).optional(),
  email: Joi.string().min(1).optional(),
  phone: Joi.string().pattern(/^(\+254|0)[17]\d{8}$/).optional(),
  gender: Joi.string().valid('male', 'female', 'other').optional(),
  county: Joi.string().min(2).max(50).optional(),
  subcounty: Joi.string().min(2).max(50).optional(),
  ward: Joi.string().min(2).max(50).optional()
});

// Validation middleware for GraphQL
export const validateGraphQLInput = (schema) => {
  return (next) => async (root, args, context, info) => {
    const { error } = schema.validate(args, { abortEarly: false });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      throw new ValidationError(`Validation failed: ${errors.map(e => `${e.field}: ${e.message}`).join(', ')}`);
    }

    return next(root, args, context, info);
  };
};

// Express middleware for validation
export const validateExpressInput = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    next();
  };
};