'use client';

import { CurrencyCode } from '@/types/database';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CurrencySelectorProps {
  value: CurrencyCode;
  onChange: (currency: CurrencyCode) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

const CURRENCY_OPTIONS = [
  { code: 'ILS' as CurrencyCode, label: '₪ ILS (Israeli New Shekel)' },
  { code: 'USD' as CurrencyCode, label: '$ USD (US Dollar)' },
  { code: 'EUR' as CurrencyCode, label: '€ EUR (Euro)' },
  { code: 'GBP' as CurrencyCode, label: '£ GBP (British Pound)' },
];

export function CurrencySelector({
  value,
  onChange,
  label = 'Currency',
  disabled = false,
  className = ''
}: CurrencySelectorProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {label && <Label htmlFor="currency-select">{label}</Label>}
      <Select 
        value={value} 
        onValueChange={(val: string) => onChange(val as CurrencyCode)}
        disabled={disabled}
      >
        <SelectTrigger id="currency-select">
          <SelectValue placeholder="Select currency" />
        </SelectTrigger>
        <SelectContent>
          {CURRENCY_OPTIONS.map(({ code, label }) => (
            <SelectItem key={code} value={code}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
} 