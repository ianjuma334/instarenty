import { registerUserSchema, loginUserSchema } from '../middleware/validation.js';

describe('Validation Schemas', () => {
  describe('registerUserSchema', () => {
    it('should validate valid registration data', () => {
      const validData = {
        fname: 'John',
        lname: 'Doe',
        username: 'johndoe',
        email: 'john@example.com',
        password: 'Password123',
        phone: '0712345678',
        gender: 'male',
        role: 'tenant',
        county: 'Nairobi',
        subcounty: 'Westlands',
        ward: 'Westlands',
      };

      const { error } = registerUserSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should reject invalid email format', () => {
      const invalidData = {
        fname: 'John',
        lname: 'Doe',
        username: 'johndoe',
        email: 'invalid-email',
        password: 'Password123',
        phone: '0712345678',
        gender: 'male',
        role: 'tenant',
        county: 'Nairobi',
        subcounty: 'Westlands',
        ward: 'Westlands',
      };

      const { error } = registerUserSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error.details[0].path[0]).toBe('email');
    });

    it('should reject weak password', () => {
      const invalidData = {
        fname: 'John',
        lname: 'Doe',
        username: 'johndoe',
        email: 'john@example.com',
        password: 'weak',
        phone: '0712345678',
        gender: 'male',
        role: 'tenant',
        county: 'Nairobi',
        subcounty: 'Westlands',
        ward: 'Westlands',
      };

      const { error } = registerUserSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error.details[0].path[0]).toBe('password');
    });
  });

  describe('loginUserSchema', () => {
    it('should validate valid login data', () => {
      const validData = {
        email: 'john@example.com',
        password: 'password123',
      };

      const { error } = loginUserSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should reject empty email', () => {
      const invalidData = {
        email: '',
        password: 'password123',
      };

      const { error } = loginUserSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error.details[0].path[0]).toBe('email');
    });
  });
});