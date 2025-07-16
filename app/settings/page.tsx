'use client';

import { useState, useEffect } from 'react';
import { useCurrency } from '@/hooks/useCurrency';
import { CurrencySelector } from '@/components/ui/CurrencySelector';
import { CurrencyToggle } from '@/components/ui/CurrencyToggle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CurrencyCode } from '@/types/database';
import { createClient } from '@/utils/supabase/client';
import { AuthRequired } from '@/components/auth/AuthRequired';

export default function SettingsPage() {
  const { userPreferences } = useCurrency();
  const [defaultCurrency, setDefaultCurrency] = useState<CurrencyCode>('ILS');
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  // Update state when preferences load
  useEffect(() => {
    if (userPreferences?.default_currency) {
      setDefaultCurrency(userPreferences.default_currency);
    }
  }, [userPreferences]);

  const updateDefaultCurrency = async (currency: CurrencyCode) => {
    setIsLoading(true);
    const previousCurrency = defaultCurrency;
    setDefaultCurrency(currency);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('user_preferences')
        .update({ 
          default_currency: currency, 
          updated_at: new Date().toISOString() 
        })
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      console.log(`Default currency updated to ${currency}`);
    } catch (error) {
      console.error('Failed to update default currency:', error);
      // Revert UI state if update failed
      setDefaultCurrency(previousCurrency);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthRequired>
      <div className="container py-8">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>Currency Preferences</CardTitle>
            <CardDescription>
              Configure how currencies are displayed and used throughout the app.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <CurrencySelector
                label="Default Currency"
                value={defaultCurrency}
                onChange={updateDefaultCurrency}
                disabled={isLoading}
              />
              <p className="text-sm text-muted-foreground mt-1">
                All amounts will be converted to this currency for reports and summaries.
              </p>
            </div>
            
            <CurrencyToggle />
          </CardContent>
        </Card>
      </div>
    </AuthRequired>
  );
} 