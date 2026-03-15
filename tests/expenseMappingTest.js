/**
 * Test to verify that expenses are now deducted from business_operation instead of unified revenue
 */

import { categoryToAccountMap } from '../utils/financialMapping.js';

// Test that all expense categories now map to business_operation
const expenseCategories = [
  'staff_salary',
  'customer_care_payment', 
  'refund',
  'software',
  'Office Supplies',
  'Utilities',
  'Marketing',
  'Equipment',
  'Travel',
  'Legal',
  'Insurance',
  'Maintenance',
  'Other'
];

console.log('🧪 Testing expense account mapping changes...\n');

// Test each expense category
expenseCategories.forEach(category => {
  const mappedAccount = categoryToAccountMap[category];
  const isCorrect = mappedAccount === 'business_operation';
  
  console.log(`${isCorrect ? '✅' : '❌'} ${category}: ${mappedAccount}`);
});

console.log('\n📋 Expected behavior:');
console.log('- All expenses should be deducted from "business_operation"');
console.log('- Unified revenue should only be affected by:');
console.log('  * Revenue inflows (booking fees, feature fees, etc.)');
console.log('  * Split operations (1/3 to personal, 2/3 to business)');
console.log('- Business operation should handle all operational expenses');

console.log('\n💰 New flow:');
console.log('1. Revenue flows INTO unified revenue');
console.log('2. Split operation moves funds FROM unified TO operations');
console.log('3. All expenses are paid FROM business operation');
console.log('4. Personal operation remains untouched (for personal use)');