import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const config = {
  // Server configuration
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || '0.0.0.0',
    nodeEnv: process.env.NODE_ENV || 'development',
    baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`,
  },

  // Database configuration
  database: {
    mongoUri: process.env.MONGODB_URI,
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  // Authentication
  auth: {
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '4h',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 10,
  },

  // Cloudinary
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
    url: process.env.CLOUDINARY_URL,
  },

  // M-Pesa
  mpesa: {
    consumerKey: process.env.MPESA_CONSUMER_KEY,
    consumerSecret: process.env.MPESA_CONSUMER_SECRET,
    shortcode: process.env.MPESA_SHORTCODE,
    passkey: process.env.MPESA_PASSKEY,
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },

  // Rate limiting
  rateLimit: {
    windowMs: 60 * 1000, // 1 minute
    max: 100, // requests per window
    authMax: 5, // auth attempts per window
  },

  // CORS
  cors: {
    origins: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      process.env.BASE_URL,
      // Add production domains based on environment
      ...(process.env.NODE_ENV === 'production' ? [
        // Add your production domains here
        // 'https://yourdomain.com',
        // 'https://www.yourdomain.com'
      ] : [])
    ].filter(Boolean), // Remove undefined values
  },

  // File upload
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 10,
  },

  // Environment checks
  isDevelopment: () => config.server.nodeEnv === 'development',
  isProduction: () => config.server.nodeEnv === 'production',
  isTest: () => config.server.nodeEnv === 'test',
};

// Validate required environment variables
const requiredEnvVars = [
  'MONGODB_URI',
  'JWT_SECRET',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'MPESA_CONSUMER_KEY',
  'MPESA_CONSUMER_SECRET',
  'MPESA_SHORTCODE',
  'MPESA_PASSKEY',
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => console.error(`   - ${varName}`));
  console.error('Please check your .env file and ensure all required variables are set.');
  process.exit(1);
}

export default config;