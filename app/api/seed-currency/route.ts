import { NextResponse } from 'next/server';
import { seedCurrencyRates, testCurrencyConversion } from '@/lib/database/seed-currency';

export async function POST() {
  try {
    const rates = await seedCurrencyRates();
    await testCurrencyConversion();
    
    return NextResponse.json({ 
      success: true, 
      message: `Successfully seeded ${rates?.length || 0} currency rates`,
      rates 
    });
  } catch (error) {
    console.error('Error seeding currency rates:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const testResult = await testCurrencyConversion();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Currency conversion test passed',
      testResult 
    });
  } catch (error) {
    console.error('Error testing currency conversion:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 