import mongoose from 'mongoose';
import { loadFees } from '../services/feesService.js';
import config from './index.js';

const initializeSystemAccounts = async () => {
  try {
    const SystemAccount = await import('../Data/SystemAccountDetails.js');

    const systemAccounts = [
      { type: 'operational', balance: 0, description: 'Tracks money owed for payouts (referrers, workers)' },
      { type: 'working', balance: 0, description: 'Actual funds available for withdrawals' },
      { type: 'revenue', balance: 0, description: 'Total revenue from all sources' },
      { type: 'expenses', balance: 0, description: 'Track costs and external expenses manually' },
      // Revenue holding accounts
      { type: 'revenue_post_holding', balance: 0, description: 'Holding account for post creation fees' },
      { type: 'revenue_activation_holding', balance: 0, description: 'Holding account for landlord activation fees' },
      { type: 'revenue_renewal_holding', balance: 0, description: 'Holding account for post renewal fees' },
      // Direct revenue accounts
      { type: 'revenue_feature', balance: 0, description: 'Revenue from feature post fees (no allocations)' },
      { type: 'revenue_booking', balance: 0, description: 'Revenue from booking fees (no allocations)' },
      // Allocated revenue accounts
      { type: 'revenue_worker_allocated', balance: 0, description: 'Allocated revenue paid to workers' },
      { type: 'revenue_customercare_allocated', balance: 0, description: 'Allocated revenue paid to customer care' },
      { type: 'revenue_referrer_allocated', balance: 0, description: 'Allocated revenue paid to referrers' },
      // Net revenue account
      { type: 'revenue_net', balance: 0, description: 'Final net revenue after all allocations' },
      // Legacy accounts (for backward compatibility)
      { type: 'revenue_activation', balance: 0, description: 'Legacy: Revenue from landlord activation fees' },
      { type: 'revenue_post', balance: 0, description: 'Legacy: Revenue from post creation fees' }
    ];

    for (const accountData of systemAccounts) {
      const existingAccount = await SystemAccount.default.findOne({ type: accountData.type });
      if (!existingAccount) {
        await SystemAccount.default.create({
          ...accountData,
          updatedBy: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011') // Default admin ID
        });
        console.log(`✅ Created system account: ${accountData.type}`);
      }
    }

    console.log("✅ System accounts initialized");
  } catch (error) {
    console.error("❌ Error initializing system accounts:", error);
  }
};

const connectDB = async () => {
  try {
    // ⚡ High-performance MongoDB connection settings
    await mongoose.connect(config.database.mongoUri, {
      // ⚡ Optimized connection pooling for high throughput
      maxPoolSize: 20, // Increased from 10 for better concurrency
      minPoolSize: 5, // Increased from 2 for faster initial queries
      maxIdleTimeMS: 60000, // Increased from 30000 for connection reuse
      serverSelectionTimeoutMS: 10000, // Increased from 5000 for better reliability
      socketTimeoutMS: 90000, // Increased from 45000 for long-running queries
      // ⚡ Performance optimizations
      retryWrites: true, // Retry failed writes automatically
      retryReads: true, // Retry failed reads automatically
      // ⚡ Monitoring and health checks
      heartbeatFrequencyMS: 10000, // Check connection health every 10 seconds
      // ⚡ Connection timeout settings
      connectTimeoutMS: 30000, // 30 second connection timeout
      waitQueueTimeoutMS: 20000, // 20 second wait queue timeout
    });

    // ⚡ Set mongoose to unbuffered mode for immediate execution
    mongoose.set('bufferCommands', false);

    // ⚡ Create database indexes for optimal query performance (after connection is ready)
    mongoose.connection.once('open', () => {
      console.log('🔗 Database connection opened, creating indexes...');
      createIndexes();
    });

    await loadFees();
    await initializeSystemAccounts();
    console.log("🚀 MongoDB Connected with HIGH-PERFORMANCE settings, indexes created, fees loaded, and system accounts initialized");
  } catch (error) {
    console.error("❌ MongoDB Connection Failed:", error.message);
    // Exit process on database connection failure
    process.exit(1);
  }
};

// ⚡ Database indexes for super fast queries
const createIndexes = async () => {
  try {
    const db = mongoose.connection.db;

    // Posts collection - Most frequently queried
    await db.collection('posts').createIndexes([
      // Location-based queries (2dsphere for geospatial)
      { location: '2dsphere' },
      { 'location.coordinates': '2dsphere' },

      // Common query patterns
      { createdAt: -1 }, // Sort by newest first
      { userId: 1 }, // Filter by user
      { featured: 1 }, // Featured posts
      { status: 1 }, // Active/inactive posts
      { type: 1 }, // Property type
      { county: 1 }, // Location filtering
      { subCounty: 1 }, // Location filtering

      // Compound indexes for common queries
      { userId: 1, createdAt: -1 }, // User's posts sorted by date
      { featured: 1, createdAt: -1 }, // Featured posts sorted by date
      { status: 1, type: 1, createdAt: -1 }, // Filter by status and type
      { county: 1, subCounty: 1, type: 1 }, // Location-based property search
    ]);

    // Users collection - Authentication and user queries
    await db.collection('users').createIndexes([
      { email: 1 }, // Unique email lookups
      { phone: 1 }, // Phone number lookups
      { createdAt: -1 }, // User registration sorting
      { isVerified: 1 }, // Verified users filter
      { userType: 1 }, // User type filtering
      { fname: 1, lname: 1 }, // Name-based searches

      // Compound indexes
      { email: 1, isVerified: 1 }, // Verified email lookups
      { userType: 1, isVerified: 1, createdAt: -1 }, // User type filtering
    ]);

    // Transactions collection - Financial queries
    await db.collection('transactions').createIndexes([
      { createdAt: -1 }, // Transaction history
      { userId: 1 }, // User's transactions
      { type: 1 }, // Transaction type filtering
      { status: 1 }, // Transaction status
      { amount: -1 }, // Amount sorting

      // Compound indexes
      { userId: 1, type: 1, createdAt: -1 }, // User's transactions by type
      { status: 1, createdAt: -1 }, // Status-based transaction history
    ]);

    // System accounts collection
    await db.collection('systemaccounts').createIndexes([
      { type: 1 }, // Account type lookups
      { balance: -1 }, // Balance sorting
      { updatedAt: -1 }, // Recent updates
    ]);

    console.log("✅ High-performance database indexes created successfully");
  } catch (error) {
    console.error("❌ Failed to create database indexes:", error.message);
    // Don't exit on index creation failure, but log it
  }
};

export default connectDB;
