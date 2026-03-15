import mongoose from 'mongoose';
import MoneyFlow from '../Data/MoneyFlowDetails.js';
import SystemAccount from '../Data/SystemAccountDetails.js';
import { categoryToAccountMap, businessCategories, expenseCategories } from '../utils/financialMapping.js';
import { syncFinancialEvent } from '../utils/financialSync.js';

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/instarenty', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const migrate = async () => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    console.log('🔄 Starting migration...');

    // 1. Find historical MoneyFlow entries without synced metadata
    const historicalFlows = await MoneyFlow.find({
      metadata: { $not: { synced: true } }  // Old entries not synced
    }).session(session);

    console.log(`Found ${historicalFlows.length} historical entries to migrate.`);

    let migrated = 0;
    for (const flow of historicalFlows) {
      try {
        // Skip if deposit or withdrawal (liquidity, not business)
        if (flow.category === 'deposit' || flow.category === 'withdrawal') {
          // Mark as synced but no account update
          flow.metadata.synced = true;
          await flow.save({ session });
          continue;
        }

        // Use syncFinancialEvent to backfill (log already exists, so update account only)
        await syncFinancialEvent({
          type: flow.type,
          category: flow.category,
          amount: flow.amount,
          userId: flow.userId,
          description: flow.description,
          metadata: { originalId: flow._id, migration: true }
        }, session);

        // Mark as synced
        flow.metadata.synced = true;
        await flow.save({ session });

        migrated++;
      } catch (err) {
        console.error(`Error migrating flow ${flow._id}:`, err);
      }
    }

    // 2. Initialize any missing System Accounts
    const accountTypes = [
      'operational', 'working', 'revenue', 'expenses',
      'revenue_post_holding', 'revenue_activation_holding', 'revenue_renewal_holding', 'revenue_referral_holding',
      'revenue_feature', 'revenue_booking',
      'revenue_worker_allocated', 'revenue_worker_pending', 'revenue_customercare_allocated', 'revenue_referrer_allocated',
      'revenue_net', 'expenses_staff_salaries'
    ];

    for (const type of accountTypes) {
      const existing = await SystemAccount.findOne({ type }).session(session);
      if (!existing) {
        await SystemAccount.create([{
          type,
          balance: 0,
          description: 'Migration initialized',
          updatedBy: null  // No user for migration
        }], { session });
        console.log(`Initialized account: ${type}`);
      }
    }

    // 3. Aggregate and adjust totals for business categories (if needed)
    const businessIncomeAgg = await MoneyFlow.aggregate([
      { $match: { type: 'income', category: { $in: businessCategories }, metadata: { synced: { $exists: false } } } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } }
    ]).session(session);

    for (const agg of businessIncomeAgg) {
      const target = categoryToAccountMap[agg._id] || 'revenue';
      await SystemAccount.findOneAndUpdate(
        { type: target },
        { $inc: { balance: agg.total } },
        { session }
      );
      console.log(`Adjusted ${target} by +${agg.total} from migration`);
    }

    const expenseAgg = await MoneyFlow.aggregate([
      { $match: { type: 'expense', category: { $in: expenseCategories }, metadata: { synced: { $exists: false } } } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } }
    ]).session(session);

    for (const agg of expenseAgg) {
      const target = categoryToAccountMap[agg._id] || 'expenses';
      await SystemAccount.findOneAndUpdate(
        { type: target },
        { $inc: { balance: -agg.total } },
        { session }
      );
      console.log(`Adjusted ${target} by -${agg.total} from migration`);
    }

    await session.commitTransaction();
    console.log(`✅ Migration complete. Synced ${migrated} entries.`);
    process.exit(0);
  } catch (error) {
    await session.abortTransaction();
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    session.endSession();
  }
};

// Run migration
migrate();