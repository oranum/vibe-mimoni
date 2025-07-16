'use client';

import { useState, useEffect } from 'react';
import { useCurrency } from '@/hooks/useCurrency';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { createClient } from '@/utils/supabase/client';

export function CurrencyToggle() {
  const { userPreferences } = useCurrency();
  const [showConverted, setShowConverted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    setShowConverted(userPreferences?.show_converted || false);
  }, [userPreferences]);

  const updatePreference = async (value: boolean) => {
    setIsLoading(true);
    const previousValue = showConverted;
    setShowConverted(value);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('user_preferences')
        .update({ 
          show_converted: value, 
          updated_at: new Date().toISOString() 
        })
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      console.log(`Currency conversion display ${value ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Failed to update preference:', error);
      // Revert UI state if update failed
      setShowConverted(previousValue);
      console.error("Failed to update preference. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <Label htmlFor="show-converted">Show converted amounts</Label>
      <Switch
        id="show-converted"
        checked={showConverted}
        onCheckedChange={updatePreference}
        disabled={isLoading}
      />
    </div>
  );
} 