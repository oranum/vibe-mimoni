import { supabase } from '../supabase';
import { CurrencyCode } from '../../types/database';

/**
 * Convert an amount from one currency to another
 * @param amount - The amount to convert
 * @param fromCurrency - Source currency code
 * @param toCurrency - Target currency code
 * @returns Promise<number> - The converted amount
 */
export async function convertAmount(
  amount: number,
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode
): Promise<number> {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  const rate = await getConversionRate(fromCurrency, toCurrency);
  return amount * rate;
}

/**
 * Get the conversion rate between two currencies
 * @param fromCurrency - Source currency code
 * @param toCurrency - Target currency code
 * @returns Promise<number> - The conversion rate
 */
export async function getConversionRate(
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode
): Promise<number> {
  if (fromCurrency === toCurrency) {
    return 1.0;
  }

  try {
    // First try to get direct rate
    const { data, error } = await supabase
      .from('currency_rates')
      .select('rate')
      .eq('from_currency', fromCurrency)
      .eq('to_currency', toCurrency)
      .order('last_updated', { ascending: false })
      .limit(1);

    if (!error && data && data.length > 0) {
      return Number(data[0].rate);
    }

    // If no direct rate found, try reverse rate
    const { data: reverseData, error: reverseError } = await supabase
      .from('currency_rates')
      .select('rate')
      .eq('from_currency', toCurrency)
      .eq('to_currency', fromCurrency)
      .order('last_updated', { ascending: false })
      .limit(1);

    if (!reverseError && reverseData && reverseData.length > 0) {
      return 1 / Number(reverseData[0].rate);
    }

    // If neither direct nor reverse rate found, throw error
    throw new Error(`No conversion rate found for ${fromCurrency} to ${toCurrency}`);
  } catch (error) {
    console.error('Error getting conversion rate:', error);
    throw error;
  }
}

/**
 * Get all available currency rates from the database
 * @returns Promise<Array> - Array of currency rates
 */
export async function getAllCurrencyRates() {
  try {
    const { data, error } = await supabase
      .from('currency_rates')
      .select('*')
      .order('last_updated', { ascending: false });

    if (error) {
      throw error;
    }

    return data?.map(rate => ({
      ...rate,
      rate: Number(rate.rate),
      last_updated: new Date(rate.last_updated),
    })) || [];
  } catch (error) {
    console.error('Error getting all currency rates:', error);
    throw error;
  }
}

/**
 * Update or create a currency rate
 * @param fromCurrency - Source currency code
 * @param toCurrency - Target currency code
 * @param rate - The conversion rate
 * @param effectiveDate - Optional effective date (defaults to now)
 * @returns Promise<void>
 */
export async function updateCurrencyRate(
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode,
  rate: number,
  effectiveDate?: Date
): Promise<void> {
  try {
    const { error } = await supabase
      .from('currency_rates')
      .insert({
        from_currency: fromCurrency,
        to_currency: toCurrency,
        rate: rate,
        last_updated: effectiveDate?.toISOString() || new Date().toISOString(),
      });

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error updating currency rate:', error);
    throw error;
  }
}

/**
 * Batch convert multiple amounts using the same currency pair
 * @param amounts - Array of amounts to convert
 * @param fromCurrency - Source currency code
 * @param toCurrency - Target currency code
 * @returns Promise<number[]> - Array of converted amounts
 */
export async function batchConvertAmounts(
  amounts: number[],
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode
): Promise<number[]> {
  if (fromCurrency === toCurrency) {
    return amounts;
  }

  const rate = await getConversionRate(fromCurrency, toCurrency);
  return amounts.map(amount => amount * rate);
}

/**
 * Get the latest exchange rates for a specific currency
 * @param baseCurrency - The base currency to get rates for
 * @returns Promise<Record<CurrencyCode, number>> - Object with currency codes as keys and rates as values
 */
export async function getLatestRatesForCurrency(
  baseCurrency: CurrencyCode
): Promise<Record<CurrencyCode, number>> {
  try {
    const { data, error } = await supabase
      .from('currency_rates')
      .select('to_currency, rate')
      .eq('from_currency', baseCurrency)
      .order('last_updated', { ascending: false });

    if (error) {
      throw error;
    }

    const rates: Partial<Record<CurrencyCode, number>> = { [baseCurrency]: 1.0 };
    
    // Get the latest rate for each currency
    const latestRates = new Map<CurrencyCode, number>();
    data?.forEach(rate => {
      const currency = rate.to_currency as CurrencyCode;
      if (!latestRates.has(currency)) {
        latestRates.set(currency, Number(rate.rate));
      }
    });

    // Convert Map to Record
    latestRates.forEach((rate, currency) => {
      rates[currency] = rate;
    });

    return rates as Record<CurrencyCode, number>;
  } catch (error) {
    console.error('Error getting latest rates:', error);
    throw error;
  }
} 