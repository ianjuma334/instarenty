import mongoose from 'mongoose';
import MoneyFlow from '../Data/MoneyFlowDetails.js';
import SystemAccount from '../Data/SystemAccountDetails.js';
import { categoryToAccountMap } from './financialMapping.js';

export async function syncFinancialEvent(input, session = null) {
  const sessionToUse = session || await mongoose.startSession();
  try {
    if (!session) {
      sessionToUse.startTransaction();
    }

    const { 
      type, 
      category, 
      amount, 
      userId, 
      description, 
      isInternal = false, 
      fromAccount, 
      toAccount,
      metadata = {}
    } = input;

    // Validate input
    if (!type || !category || amount <= 0 || !description) {
      throw new Error('Invalid input for financial sync');
    }

    // Log MoneyFlow
    const moneyFlow = new MoneyFlow({ 
      type, 
      category, 
      amount, 
      description, 
      userId, 
      fromAccount, 
      toAccount,
      isInternal,
      metadata: { ...metadata, synced: true }
    });
    await moneyFlow.save({ session: sessionToUse });

    // Update System Accounts
    if (!isInternal) {
      // User/business event
      const targetAccount = categoryToAccountMap[category] || (type === 'income' ? 'revenue' : 'expenses');
      const adjustment = type === 'income' ? amount : -amount;
      
      const updateObj = { 
        $inc: { balance: adjustment },
        history: { 
          $push: { 
            amount: adjustment, 
            type: category, 
            moneyFlowId: moneyFlow._id, 
            timestamp: new Date() 
          } 
        },
        lastUpdated: new Date()
      };

      await SystemAccount.findOneAndUpdate(
        { type: targetAccount }, 
        updateObj, 
        { session: sessionToUse, upsert: true, setDefaultsOnInsert: true }
      );

      // Prevent negative balances for expenses
      if (adjustment < 0) {
        const account = await SystemAccount.findOne({ type: targetAccount }, { session: sessionToUse });
        if (account.balance < 0) {
          throw new Error(`Insufficient balance in ${targetAccount}: ${account.balance}`);
        }
      }
    } else {
      // Internal transfer
      if (!fromAccount || !toAccount) {
        throw new Error('fromAccount and toAccount required for internal transfers');
      }

      // Deduct from source
      await SystemAccount.findOneAndUpdate(
        { type: fromAccount },
        { 
          $inc: { balance: -amount },
          history: { 
            $push: { 
              amount: -amount, 
              type: 'transfer_out', 
              moneyFlowId: moneyFlow._id, 
              timestamp: new Date() 
            } 
          },
          lastUpdated: new Date()
        },
        { session: sessionToUse }
      );

      // Add to destination
      await SystemAccount.findOneAndUpdate(
        { type: toAccount },
        { 
          $inc: { balance: amount },
          history: { 
            $push: { 
              amount: amount, 
              type: 'transfer_in', 
              moneyFlowId: moneyFlow._id, 
              timestamp: new Date() 
            } 
          },
          lastUpdated: new Date()
        },
        { session: sessionToUse, upsert: true, setDefaultsOnInsert: true }
      );

      // Prevent negative on source
      const sourceAccount = await SystemAccount.findOne({ type: fromAccount }, { session: sessionToUse });
      if (sourceAccount.balance < 0) {
        throw new Error(`Insufficient balance in ${fromAccount}: ${sourceAccount.balance}`);
      }
    }

    if (!session) {
      await sessionToUse.commitTransaction();
    }

    return { success: true, moneyFlowId: moneyFlow._id };
  } catch (error) {
    if (!session && sessionToUse.inTransaction()) {
      await sessionToUse.abortTransaction();
    }
    console.error('Financial sync error:', error);
    throw error;
  } finally {
    if (!session) {
      sessionToUse.endSession();
    }
  }
}

// Export for use in resolvers
export default { syncFinancialEvent };