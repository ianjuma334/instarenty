import express from 'express';
import mongoose from 'mongoose';
import mongoSanitize from 'express-mongo-sanitize';
import expressRateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import { graphqlUploadExpress } from 'graphql-upload';
import multer from 'multer';
import path from 'path';
import ip from 'ip'; // ✅ added
import mpesaRoutes from '../mpesa/mpesaRoutes.js';
import bodyParser from 'body-parser';
import { getMpesaAccessToken } from './mpesa.js';
import { v2 as cloudinary } from 'cloudinary';
import { expressErrorHandler } from '../middleware/errorHandler.js';
import config from '../config/index.js';
// ⚡ Performance optimizations
import compression from 'compression';
import { performanceMonitor } from '../utils/performanceMonitor.js';

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

const setupExpress = () => {
  const app = express();

  // ✅ Dynamic BASE_URL (you can still use this later if you want)
  const serverIP = ip.address();
  const port = config.server.port;
  const BASE_URL = config.server.baseUrl;

  // 📦 Setup multer with file size and type validation for parallel uploads
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: config.upload.maxFileSize, // 10MB limit from config
      files: config.upload.maxFiles,
    },
    fileFilter: (req, file, cb) => {
      // Validate file types
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'), false);
      }
    }
  });

  // 🛠 Middleware to parse JSON bodies
  app.use(express.json({ limit: '1mb' })); // ⚡ Reduced from default 100mb
  app.use(bodyParser.json({ limit: '1mb' }));

  // ⚡ Response compression for faster responses
  app.use(compression({
    level: 6, // ⚡ Balanced compression level
    threshold: 1024, // ⚡ Only compress responses > 1KB
    filter: (req, res) => {
      // Don't compress responses with this request header
      if (req.headers['x-no-compression']) {
        return false;
      }
      // Use compression filter function
      return compression.filter(req, res);
    }
  }));

  // ⚡ Performance monitoring middleware
  app.use(performanceMonitor.middleware());

  // 🚀 Handle file uploads at /upload (optimized for parallel uploads)
  app.post('/upload', upload.single('file'), async (req, res) => {
    // Handle multer errors
    if (req.file && req.file instanceof Error) {
      return res.status(400).json({
        error: 'File upload error',
        message: req.file.message
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'Please select a file to upload'
      });
    }

    // Validate file size (additional check)
    if (req.file.size > config.upload.maxFileSize) {
      return res.status(400).json({
        error: 'File too large',
        message: `File size must be less than ${Math.round(config.upload.maxFileSize / 1024 / 1024)}MB`
      });
    }

    try {
      // Set upload timeout (15 seconds for faster uploads)
      const uploadTimeout = 15000;
      let responseSent = false;
      
      const timeout = setTimeout(() => {
        if (!responseSent) {
          responseSent = true;
          return res.status(408).json({
            error: 'Upload timeout',
            message: 'Upload took too long, please try again'
          });
        }
      }, uploadTimeout);

      // ⚡ Upload to Cloudinary with ULTRA-FAST settings for parallel uploads
      const result = await cloudinary.uploader.upload(
        `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
        {
          folder: 'uploads',
          resource_type: 'image',
          // ⚡ Ultra-fast upload settings
          quality: 'auto', // Automatic quality optimization
          format: 'jpg', // Convert to JPG for better compression
          width: 1200, // Max width
          height: 1200, // Max height
          crop: 'limit', // Don't enlarge if smaller
          // ⚡ Faster processing - reduced breakpoints for speed
          responsive_breakpoints: {
            create_derived: true,
            bytes_step: 50000, // Larger steps for faster processing
            min_width: 300,
            max_width: 800,
            max_images: 3 // Reduced from 5 for faster uploads
          },
          // ⚡ Additional speed optimizations
          secure: true,
          discard_original_filename: true,
        }
      );

      clearTimeout(timeout);

      // Return optimized Cloudinary URLs with metadata
      const response = {
        path: result.secure_url,
        public_id: result.public_id,
        format: result.format,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
        original_name: req.file.originalname,
        uploaded_at: new Date().toISOString(),
        // Responsive image URLs for client-side optimization
        responsive_urls: result.responsive_breakpoints?.[0]?.breakpoints?.map(bp => ({
          width: bp.width,
          url: bp.secure_url
        })) || []
      };

      if (!responseSent) {
        responseSent = true;
        return res.status(200).json(response);
      }
    } catch (error) {
      console.error('Cloudinary upload error:', {
        error: error.message,
        file: req.file?.originalname,
        size: req.file?.size,
        type: req.file?.mimetype
      });

      // Handle specific Cloudinary errors
      if (error.message?.includes('File size too large')) {
        return res.status(400).json({
          error: 'File too large',
          message: 'Please choose a smaller image file'
        });
      }

      if (error.message?.includes('Invalid image file')) {
        return res.status(400).json({
          error: 'Invalid image',
          message: 'Please upload a valid image file'
        });
      }

      return res.status(500).json({
        error: 'Upload failed',
        message: 'Failed to upload image, please try again'
      });
    }
  });

  // 🚀 GraphQL Upload middleware
  app.use(graphqlUploadExpress());

  // 🛡 Security middlewares
  app.use(mongoSanitize());

  // CORS configuration
  const corsOptions = {
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);

      // Allow M-Pesa servers
      const mpesaDomains = [
        'safaricom.co.ke',
        'api.safaricom.co.ke',
        'sandbox.safaricom.co.ke'
      ];

      const isMpesaServer = mpesaDomains.some(domain => origin.includes(domain));
      const isAllowedOrigin = config.cors.origins.includes(origin);

      if (isAllowedOrigin || isMpesaServer) {
        console.log("✅ CORS allowed for:", origin, isMpesaServer ? "(M-Pesa server)" : "(configured origin)");
        callback(null, true);
      } else {
        console.log("❌ CORS blocked for:", origin);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  };

  app.use(cors(corsOptions));

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'same-origin' },
      referrerPolicy: { policy: 'no-referrer' },
    })
  );

  // ⚡ HIGH-PERFORMANCE rate limiting middleware
  const limiter = expressRateLimit({
    windowMs: 15 * 60 * 1000, // ⚡ 15 minutes (increased from 1 minute)
    max: 1000, // ⚡ Increased from 100 for better throughput
    message: {
      error: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    // ⚡ Skip rate limiting for GET requests (read operations)
    skip: (req) => req.method === 'GET',
    // ⚡ Skip rate limiting for health checks
    skip: (req) => req.path === '/health',
  });
  app.use(limiter);

  // Stricter rate limiting for auth endpoints
  const authLimiter = expressRateLimit({
    windowMs: 15 * 60 * 1000, // ⚡ 15 minutes
    max: 10, // ⚡ Increased from 5 for better UX
    message: {
      error: 'Too many authentication attempts, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // ⚡ ULTRA HIGH-THROUGHPUT rate limiting for upload endpoints (optimized for TRUE parallel uploads)
  const uploadLimiter = expressRateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 200, // ⚡ Dramatically increased for true parallel uploads (can handle 10+ concurrent users)
    message: {
      error: 'Too many upload requests, please wait a moment before uploading more images.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    // ⚡ Only apply to upload endpoint
    skip: (req) => req.path !== '/upload'
  });

  // Apply optimized rate limiting to specific endpoints
  app.use('/auth', authLimiter); // Auth endpoints only
  app.use('/upload', uploadLimiter); // Upload endpoints only

  // Health check endpoint
  app.get('/health', async (req, res) => {
    try {
      // Check database connection
      await mongoose.connection.db.admin().ping();

      // Check Redis connection if available
      let redisStatus = 'disabled';
      if (redis) {
        await redis.ping();
        redisStatus = 'connected';
      }

      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: 'connected',
        redis: redisStatus,
        environment: config.server.nodeEnv,
        version: process.env.npm_package_version || '1.0.0'
      });
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      });
    }
  });

  // ⚡ Performance metrics endpoint
  app.get('/metrics', async (req, res) => {
    try {
      const timeRange = parseInt(req.query.timeRange) || 300000; // 5 minutes default
      const metrics = performanceMonitor.getPerformanceSummary(timeRange);

      res.status(200).json({
        success: true,
        timestamp: new Date().toISOString(),
        timeRange: `${timeRange / 1000}s`,
        ...metrics
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch performance metrics',
        message: error.message
      });
    }
  });

  // 📞 Mpesa routes (with callback bypass for rate limiting)
  // Bypass rate limiting for M-Pesa callbacks to prevent blocking legitimate webhook calls
  app.use('/mpesa/callback', (req, res, next) => {
    req.skipRateLimit = true;
    console.log("🔄 M-Pesa callback bypass activated for IP:", req.ip);
    next();
  });

  app.use('/mpesa', mpesaRoutes);

  // Note: Static serving of /uploads removed as images are now stored on Cloudinary

  // Error handling middleware (must be last)
  app.use(expressErrorHandler);

  return app;
};

export default setupExpress;
