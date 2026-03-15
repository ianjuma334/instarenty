import mongoose from 'mongoose';
import { syncFinancialEvent } from '../utils/financialSync.js';
import MoneyFlow from '../Data/MoneyFlowDetails.js';
import SystemAccount from '../Data/SystemAccountDetails.js';
import { categoryToAccountMap } from '../utils/financialMapping.js';

describe('Financial Sync Integration Tests', () => {
  beforeAll(async () => {
    await mongoose.connect('mongodb://localhost:27017/test_db', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  afterEach(async () => {
    await MoneyFlow.deleteMany({});
    await SystemAccount.deleteMany({});
  });

  test('should sync income event to account', async () => {
    const result = await syncFinancialEvent({
      type: 'income',
      category: 'registration_fee',
      amount: 100,
      description: 'Test income',
      userId: new mongoose.Types.ObjectId(),
    });

    expect(result.success).toBe(true);

    const flow = await MoneyFlow.findById(result.moneyFlowId);
    expect(flow).toBeDefined();
    expect(flow.type).toBe('income');
    expect(flow.category).toBe('registration_fee');
    expect(flow.amount).toBe(100);
    expect(flow.metadata.synced).toBe(true);

    const account = await SystemAccount.findOne({ type: categoryToAccountMap.registration_fee });
    expect(account.balance).toBe(100);
    expect(account.history.length).toBe(1);
    expect(account.history[0].amount).toBe(100);
    expect(account.history[0].moneyFlowId.toString()).toBe(flow._id.toString());
  });

  test('should sync expense event to account', async () => {
    // First create balance
    await SystemAccount.create({ type: 'revenue_net', balance: 200 });

    const result = await syncFinancialEvent({
      type: 'expense',
      category: 'referrer_payment',
      amount: 50,
      description: 'Test expense',
      userId: new mongoose.Types.ObjectId(),
    });

    expect(result.success).toBe(true);

    const flow = await MoneyFlow.findById(result.moneyFlowId);
    expect(flow.type).toBe('expense');
    expect(flow.category).toBe('referrer_payment');
    expect(flow.amount).toBe(50);

    const account = await SystemAccount.findOne({ type: categoryToAccountMap.referrer_payment });
    expect(account.balance).toBe(-50);  // Expense decreases
    expect(account.history.length).toBe(1);
    expect(account.history[0].amount).toBe(-50);
  });

  test('should handle internal transfer', async () => {
    // Setup balances
    await SystemAccount.create({ type: 'revenue_activation_holding', balance: 100 });
    await SystemAccount.create({ type: 'revenue_net', balance: 0 });

    const result = await syncFinancialEvent({
      isInternal: true,
      category: 'internal_transfer',
      amount: 70,
      description: 'Test transfer',
      fromAccount: 'revenue_activation_holding',
      toAccount: 'revenue_net',
    });

    expect(result.success).toBe(true);

    const flow = await MoneyFlow.findById(result.moneyFlowId);
    expect(flow.isInternal).toBe(true);
    expect(flow.fromAccount).toBe('revenue_activation_holding');
    expect(flow.toAccount).toBe('revenue_net');

    const fromAccount = await SystemAccount.findOne({ type: 'revenue_activation_holding' });
    expect(fromAccount.balance).toBe(30);  // 100 - 70

    const toAccount = await SystemAccount.findOne({ type: 'revenue_net' });
    expect(toAccount.balance).toBe(70);

    // History
    expect(fromAccount.history.length).toBe(1);
    expect(fromAccount.history[0].type).toBe('transfer_out');
    expect(toAccount.history[0].type).toBe('transfer_in');
  });

  test('should throw error for negative balance on expense', async () => {
    await expect(syncFinancialEvent({
      type: 'expense',
      category: 'referrer_payment',
      amount: 100,
      description: 'Test negative',
      userId: new mongoose.Types.ObjectId(),
    })).rejects.toThrow('Insufficient balance');
  });

  test('should throw error for invalid internal transfer', async () => {
    await expect(syncFinancialEvent({
      isInternal: true,
      category: 'internal_transfer',
      amount: 50,
      description: 'Missing accounts',
    })).rejects.toThrow('fromAccount and toAccount required');
  });

  test('should validate category mapping', async () => {
    await expect(syncFinancialEvent({
      type: 'income',
      category: 'invalid_category',
      amount: 100,
      description: 'Test invalid',
      userId: new mongoose.Types.ObjectId(),
    })).rejects.toThrow();  // Should fail validation in pre-save
  });
});