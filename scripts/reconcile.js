import mongoose from 'mongoose';
import MoneyFlow from '../Data/MoneyFlowDetails.js';
import SystemAccount from '../Data/SystemAccountDetails.js';
import { categoryToAccountMap, businessCategories, expenseCategories } from '../utils/financialMapping.js';

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/instarenty', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const reconcile = async () => {
  try {
    console.log('🔄 Starting reconciliation...');

    // 1. Aggregate MoneyFlow business totals
    const businessIncomePipeline = [
      {
        $match: {
          type: 'income',
          category: { $in: businessCategories },
          isInternal: { $ne: true }  // Exclude internals for business calc
        }
      },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' }
        }
      }
    ];

    const expensePipeline = [
      {
        $match: {
          type: 'expense',
          category: { $in: expenseCategories }
        }
      },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' }
        }
      }
    ];

    const [mfIncome, mfExpenses] = await Promise.all([
      MoneyFlow.aggregate(businessIncomePipeline),
      MoneyFlow.aggregate(expensePipeline)
    ]);

    const mfIncomeByCategory = mfIncome.reduce((acc, item) => {
      acc[item._id] = item.total;
      return acc;
    }, {});
    const mfExpenseByCategory = mfExpenses.reduce((acc, item) => {
      acc[item._id] = item.total;
      return acc;
    }, {});

    const mfTotalRevenue = Object.values(mfIncomeByCategory).reduce((sum, val) => sum + val, 0);
    const mfTotalExpenses = Object.values(mfExpenseByCategory).reduce((sum, val) => sum + val, 0);
    const mfProfit = mfTotalRevenue - mfTotalExpenses;

    console.log('💰 MoneyFlow Aggregates:');
    console.log('Revenue by category:', mfIncomeByCategory);
    console.log('Total Revenue:', mfTotalRevenue);
    console.log('Expenses by category:', mfExpenseByCategory);
    console.log('Total Expenses:', mfTotalExpenses);
    console.log('Net Profit:', mfProfit);

    // 2. Aggregate System Accounts
    const revenueAccounts = await SystemAccount.find({
      type: {
        $in: [
          'revenue_post_holding', 'revenue_activation_holding', 'revenue_renewal_holding',
          'revenue_referral_holding', 'revenue_feature', 'revenue_booking', 'revenue_net'
        ]
      }
    });

    const expenseAccounts = await SystemAccount.find({
      type: {
        $in: [
          'expenses_staff_salaries', 'revenue_worker_allocated', 'revenue_customercare_allocated',
          'revenue_referrer_allocated', 'expenses'
        ]
      }
    });

    const systemRevenueByType = revenueAccounts.reduce((acc, accnt) => {
      acc[accnt.type] = accnt.balance;
      return acc;
    }, {});

    const systemExpenseByType = expenseAccounts.reduce((acc, accnt) => {
      acc[accnt.type] = accnt.balance;
      return acc;
    }, {});

    const systemTotalRevenue = revenueAccounts.reduce((sum, acc) => sum + acc.balance, 0);
    const systemTotalExpenses = expenseAccounts.reduce((sum, acc) => sum + acc.balance, 0);
    const systemProfit = systemTotalRevenue - systemTotalExpenses;

    console.log('\n🏦 System Account Balances:');
    console.log('Revenue by type:', systemRevenueByType);
    console.log('Total Revenue:', systemTotalRevenue);
    console.log('Expenses by type:', systemExpenseByType);
    console.log('Total Expenses:', systemTotalExpenses);
    console.log('Net Profit:', systemProfit);

    // 3. Compare and flag discrepancies
    const discrepancies = [];

    // Check revenue categories
    businessCategories.forEach(cat => {
      const mfAmount = mfIncomeByCategory[cat] || 0;
      const mappedAccount = categoryToAccountMap[cat];
      const systemAmount = systemRevenueByType[mappedAccount] || 0;
      const diff = Math.abs(mfAmount - systemAmount);
      if (diff > 0.01) {
        discrepancies.push({
          category: cat,
          moneyFlow: mfAmount,
          systemAccount: mappedAccount,
          systemAmount,
          discrepancy: diff,
          type: 'revenue'
        });
      }
    });

    // Check expense categories
    expenseCategories.forEach(cat => {
      const mfAmount = mfExpenseByCategory[cat] || 0;
      const mappedAccount = categoryToAccountMap[cat];
      const systemAmount = systemExpenseByType[mappedAccount] || 0;
      const diff = Math.abs(mfAmount - systemAmount);
      if (diff > 0.01) {
        discrepancies.push({
          category: cat,
          moneyFlow: mfAmount,
          systemAccount: mappedAccount,
          systemAmount,
          discrepancy: diff,
          type: 'expense'
        });
      }
    });

    // Overall profit discrepancy
    const profitDiff = Math.abs(mfProfit - systemProfit);
    if (profitDiff > 0.01) {
      discrepancies.push({
        category: 'overall_profit',
        moneyFlow: mfProfit,
        systemProfit,
        discrepancy: profitDiff,
        type: 'profit'
      });
    }

    console.log('\n⚠️  Discrepancies Found:');
    if (discrepancies.length === 0) {
      console.log('✅ No discrepancies found! Systems are aligned.');
    } else {
      discrepancies.forEach(disc => {
        console.log(`- ${disc.type.toUpperCase()}: ${disc.category} - MoneyFlow: ${disc.moneyFlow}, System: ${disc.systemAmount || disc.systemProfit}, Diff: ${disc.discrepancy}`);
      });
    }

    // 4. Optional: Auto-adjust small discrepancies (uncomment if needed)
    /*
    for (const disc of discrepancies) {
      if (disc.discrepancy < 1) {  // Small diffs
        const adjustment = disc.moneyFlow - (disc.systemAmount || disc.systemProfit);
        const targetAccount = categoryToAccountMap[disc.category] || (disc.type === 'profit' ? 'revenue_net' : 'expenses');
        await SystemAccount.findOneAndUpdate(
          { type: targetAccount },
          { $inc: { balance: adjustment } }
        );
        console.log(`🔧 Auto-adjusted ${targetAccount} by ${adjustment}`);
      }
    }
    */

    console.log('\n✅ Reconciliation complete.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Reconciliation failed:', error);
    process.exit(1);
  }
};

// Run reconciliation
reconcile();