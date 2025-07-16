/**
 * Simple tests for CSV import utilities
 */

import { 
  parseCSV, 
  parseJSON,
  detectCSVDelimiter, 
  normalizeDate, 
  normalizeAmount, 
  suggestFieldMappings,
  validateCSVStructure 
} from './importUtils';

// Test CSV content
const sampleCSV = `Date,Description,Amount,Account
2024-01-15,Coffee Shop Purchase,-4.50,Checking
2024-01-16,Salary Deposit,2500.00,Checking
2024-01-17,"Grocery Store, Main St",-45.67,Checking`;

const sampleCSVWithSemicolon = `Date;Description;Amount;Account
2024-01-15;Coffee Shop Purchase;-4.50;Checking
2024-01-16;Salary Deposit;2500.00;Checking`;

console.log('Testing CSV Import Utilities...\n');

// Test delimiter detection
console.log('1. Testing delimiter detection:');
console.log('Comma delimiter:', detectCSVDelimiter(sampleCSV));
console.log('Semicolon delimiter:', detectCSVDelimiter(sampleCSVWithSemicolon));

// Test CSV parsing
console.log('\n2. Testing CSV parsing:');
const parseResult = parseCSV(sampleCSV);
console.log('Headers:', parseResult.headers);
console.log('Row count:', parseResult.rowCount);
console.log('First row:', parseResult.data[0]);
console.log('Errors:', parseResult.errors);

// Test date normalization
console.log('\n3. Testing date normalization:');
const testDates = ['2024-01-15', '01/15/2024', '15-01-2024', '2024/01/15'];
testDates.forEach(date => {
  console.log(`${date} -> ${normalizeDate(date)}`);
});

// Test amount normalization
console.log('\n4. Testing amount normalization:');
const testAmounts = ['-4.50', '$2,500.00', '(45.67)', '1,234.56'];
testAmounts.forEach(amount => {
  console.log(`${amount} -> ${normalizeAmount(amount)}`);
});

// Test field mapping suggestions
console.log('\n5. Testing field mapping suggestions:');
const headers = ['Date', 'Description', 'Amount', 'Account'];
const suggestions = suggestFieldMappings(headers);
console.log('Suggested mappings:', suggestions);

// Test validation
console.log('\n6. Testing CSV validation:');
const validation = validateCSVStructure(parseResult);
console.log('Is valid:', validation.isValid);
console.log('Errors:', validation.errors);
console.log('Warnings:', validation.warnings);
console.log('Detected fields:', validation.detectedFields);

console.log('\n✅ All tests completed!');

// Test JSON parsing
console.log('\n8. Testing JSON parsing:');

// Test array of objects
const jsonArray = JSON.stringify([
  { description: 'Test 1', amount: '100.50', date: '2023-01-01' },
  { description: 'Test 2', amount: '200.75', date: '2023-01-02' }
]);

const arrayResult = parseJSON(jsonArray);
console.log('Array format - Errors:', arrayResult.errors.length);
console.log('Array format - Headers:', arrayResult.headers);
console.log('Array format - Row count:', arrayResult.rowCount);

// Test object with transactions
const jsonObject = JSON.stringify({
  transactions: [
    { description: 'Test 1', amount: '100.50', date: '2023-01-01' },
    { description: 'Test 2', amount: '200.75', date: '2023-01-02' }
  ]
});

const objectResult = parseJSON(jsonObject);
console.log('Object format - Errors:', objectResult.errors.length);
console.log('Object format - Headers:', objectResult.headers);
console.log('Object format - Row count:', objectResult.rowCount);

// Test single object
const singleObject = JSON.stringify({
  description: 'Single transaction',
  amount: '100.50',
  date: '2023-01-01'
});

const singleResult = parseJSON(singleObject);
console.log('Single object - Errors:', singleResult.errors.length);
console.log('Single object - Row count:', singleResult.rowCount);

// Test nested objects
const nestedObject = JSON.stringify([
  { 
    description: 'Test', 
    amount: '100.50', 
    date: '2023-01-01',
    metadata: { category: 'food', tags: ['lunch', 'business'] }
  }
]);

const nestedResult = parseJSON(nestedObject);
console.log('Nested objects - Errors:', nestedResult.errors.length);
console.log('Nested objects - Metadata field:', nestedResult.data[0]?.metadata);

// Test invalid JSON
const invalidResult = parseJSON('{ invalid json }');
console.log('Invalid JSON - Errors:', invalidResult.errors.length);
console.log('Invalid JSON - Error message:', invalidResult.errors[0]);

// Test empty JSON
const emptyResult = parseJSON('');
console.log('Empty JSON - Errors:', emptyResult.errors.length);
console.log('Empty JSON - Error message:', emptyResult.errors[0]);

console.log('\n✅ JSON parsing tests completed!'); 