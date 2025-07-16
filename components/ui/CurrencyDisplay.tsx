'use client';

import { useEffect, useState } from 'react';
import { useCurrency } from '@/hooks/useCurrency';
import { cn } from '@/lib/utils';
import { CurrencyCode } from '@/types/database';

interface CurrencyDisplayProps {
  amount: number;
  currency: CurrencyCode;
  showConverted?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function CurrencyDisplay({
  amount,
  currency,
  showConverted = true,
  size = 'md',
  className = ''
}: CurrencyDisplayProps) {
  const { format, convert, userPreferences } = useCurrency();
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null);
  const baseCurrency: CurrencyCode = userPreferences?.default_currency || 'ILS';
  
  useEffect(() => {
    if (showConverted && currency !== baseCurrency) {
      convert(amount, currency, baseCurrency).then(setConvertedAmount);
    }
  }, [amount, currency, baseCurrency, showConverted, convert]);
  
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg font-bold'
  };
  
  return (
    <div className={cn('flex flex-col', className)}>
      <div className={sizeClasses[size]}>
        {format(amount, currency)}
      </div>
      {showConverted && convertedAmount !== null && currency !== baseCurrency && (
        <div className="text-sm text-muted-foreground">
          {format(convertedAmount, baseCurrency)}
        </div>
      )}
    </div>
  );
} 