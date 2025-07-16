import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { convertAmount, getConversionRate, batchConvertAmounts } from '../lib/currency/conversion';
import { formatCurrency, formatCurrencyConversion, getCurrencyOptions } from '../lib/currency/formatting';
import { CurrencyCode, UserPreferences } from '../types/database';

interface UseCurrencyReturn {
  // User preferences
  userPreferences: UserPreferences | null;
  defaultCurrency: CurrencyCode;
  showConverted: boolean;
  
  // Conversion functions
  convert: (amount: number, fromCurrency: CurrencyCode, toCurrency?: CurrencyCode) => Promise<number>;
  batchConvert: (amounts: number[], fromCurrency: CurrencyCode, toCurrency?: CurrencyCode) => Promise<number[]>;
  getRate: (fromCurrency: CurrencyCode, toCurrency?: CurrencyCode) => Promise<number>;
  
  // Formatting functions
  format: (amount: number, currencyCode: CurrencyCode) => string;
  formatConversion: (originalAmount: number, originalCurrency: CurrencyCode, convertedAmount: number, convertedCurrency: CurrencyCode) => string;
  
  // Utility functions
  getCurrencyOptions: () => ReturnType<typeof getCurrencyOptions>;
  
  // State management
  loading: boolean;
  error: string | null;
  
  // Preference management
  updatePreferences: (preferences: Partial<UserPreferences>) => Promise<void>;
  refreshPreferences: () => Promise<void>;
}

export function useCurrency(): UseCurrencyReturn {
  const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user preferences
  const fetchPreferences = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No preferences found, create default
          const defaultPreferences = {
            default_currency: 'ILS' as CurrencyCode,
            show_converted: true,
          };
          
          const { data: newPrefs, error: createError } = await supabase
            .from('user_preferences')
            .insert(defaultPreferences)
            .select()
            .single();
          
          if (createError) {
            throw createError;
          }
          
          setUserPreferences({
            ...newPrefs,
            created_at: new Date(newPrefs.created_at),
            updated_at: new Date(newPrefs.updated_at),
          });
        } else {
          throw error;
        }
      } else {
        setUserPreferences({
          ...data,
          created_at: new Date(data.created_at),
          updated_at: new Date(data.updated_at),
        });
      }
    } catch (err) {
      console.error('Error fetching user preferences:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch preferences');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize preferences on mount
  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  // Convert amount with optional target currency
  const convert = useCallback(async (
    amount: number,
    fromCurrency: CurrencyCode,
    toCurrency?: CurrencyCode
  ): Promise<number> => {
    const targetCurrency = toCurrency || userPreferences?.default_currency || 'ILS';
    return convertAmount(amount, fromCurrency, targetCurrency);
  }, [userPreferences]);

  // Batch convert amounts
  const batchConvert = useCallback(async (
    amounts: number[],
    fromCurrency: CurrencyCode,
    toCurrency?: CurrencyCode
  ): Promise<number[]> => {
    const targetCurrency = toCurrency || userPreferences?.default_currency || 'ILS';
    return batchConvertAmounts(amounts, fromCurrency, targetCurrency);
  }, [userPreferences]);

  // Get conversion rate
  const getRate = useCallback(async (
    fromCurrency: CurrencyCode,
    toCurrency?: CurrencyCode
  ): Promise<number> => {
    const targetCurrency = toCurrency || userPreferences?.default_currency || 'ILS';
    return getConversionRate(fromCurrency, targetCurrency);
  }, [userPreferences]);

  // Format currency
  const format = useCallback((amount: number, currencyCode: CurrencyCode): string => {
    return formatCurrency(amount, currencyCode);
  }, []);

  // Format conversion (show both original and converted)
  const formatConversion = useCallback((
    originalAmount: number,
    originalCurrency: CurrencyCode,
    convertedAmount: number,
    convertedCurrency: CurrencyCode
  ): string => {
    const showBoth = userPreferences?.show_converted ?? true;
    return formatCurrencyConversion(
      originalAmount,
      originalCurrency,
      convertedAmount,
      convertedCurrency,
      showBoth
    );
  }, [userPreferences]);

  // Update user preferences
  const updatePreferences = useCallback(async (updates: Partial<UserPreferences>) => {
    try {
      setError(null);
      
      const { data, error } = await supabase
        .from('user_preferences')
        .update(updates)
        .eq('user_id', userPreferences?.user_id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      setUserPreferences({
        ...data,
        created_at: new Date(data.created_at),
        updated_at: new Date(data.updated_at),
      });
    } catch (err) {
      console.error('Error updating preferences:', err);
      setError(err instanceof Error ? err.message : 'Failed to update preferences');
      throw err;
    }
  }, [userPreferences]);

  // Refresh preferences
  const refreshPreferences = useCallback(async () => {
    await fetchPreferences();
  }, [fetchPreferences]);

  return {
    // User preferences
    userPreferences,
    defaultCurrency: userPreferences?.default_currency || 'ILS',
    showConverted: userPreferences?.show_converted ?? true,
    
    // Conversion functions
    convert,
    batchConvert,
    getRate,
    
    // Formatting functions
    format,
    formatConversion,
    
    // Utility functions
    getCurrencyOptions,
    
    // State management
    loading,
    error,
    
    // Preference management
    updatePreferences,
    refreshPreferences,
  };
}

/**
 * Hook for currency conversion with caching
 * Useful for components that need to convert many amounts
 */
export function useCurrencyConversion(
  fromCurrency: CurrencyCode,
  toCurrency?: CurrencyCode
) {
  const [rate, setRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { defaultCurrency, getRate } = useCurrency();

  const targetCurrency = toCurrency || defaultCurrency;

  // Fetch conversion rate
  useEffect(() => {
    if (fromCurrency === targetCurrency) {
      setRate(1);
      return;
    }

    const fetchRate = async () => {
      try {
        setLoading(true);
        setError(null);
        const conversionRate = await getRate(fromCurrency, targetCurrency);
        setRate(conversionRate);
      } catch (err) {
        console.error('Error fetching conversion rate:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch rate');
      } finally {
        setLoading(false);
      }
    };

    fetchRate();
  }, [fromCurrency, targetCurrency, getRate]);

  // Convert amount using cached rate
  const convertAmount = useCallback((amount: number): number => {
    if (rate === null) return amount;
    return amount * rate;
  }, [rate]);

  return {
    rate,
    loading,
    error,
    convertAmount,
    fromCurrency,
    toCurrency: targetCurrency,
  };
} 