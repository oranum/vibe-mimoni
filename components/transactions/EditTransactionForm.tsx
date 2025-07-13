'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Transaction, UpdateTransactionInput, TransactionStatus } from '@/types/database';
import { formatCurrency, formatDate } from '@/lib/utils';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { CalendarIcon, Save, X, DollarSign, FileText, Hash, Building2 } from 'lucide-react';

interface EditTransactionFormProps {
  transaction: Transaction;
  onSave: (updatedTransaction: Transaction) => void;
  onCancel: () => void;
}

interface FormData {
  amount: string;
  description: string;
  identifier: string;
  date: string;
  source: string;
  status: TransactionStatus;
  notes: string;
}

interface FormErrors {
  amount?: string;
  description?: string;
  date?: string;
}

export function EditTransactionForm({ transaction, onSave, onCancel }: EditTransactionFormProps) {
  const [formData, setFormData] = useState<FormData>({
    amount: Math.abs(transaction.amount).toString(),
    description: transaction.description,
    identifier: transaction.identifier || '',
    date: transaction.date.toISOString().split('T')[0], // YYYY-MM-DD format
    source: transaction.source || '',
    status: transaction.status,
    notes: transaction.notes || ''
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isIncome, setIsIncome] = useState(transaction.amount >= 0);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Amount validation
    const amount = parseFloat(formData.amount);
    if (!formData.amount || isNaN(amount) || amount <= 0) {
      newErrors.amount = 'Amount must be a positive number';
    }

    // Description validation
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters';
    }

    // Date validation
    if (!formData.date) {
      newErrors.date = 'Date is required';
    } else {
      const selectedDate = new Date(formData.date);
      const today = new Date();
      const maxDate = new Date();
      maxDate.setFullYear(today.getFullYear() + 1); // Allow up to 1 year in future

      if (selectedDate > maxDate) {
        newErrors.date = 'Date cannot be more than 1 year in the future';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the form errors before saving');
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      
      // Prepare update data
      const amount = parseFloat(formData.amount);
      const finalAmount = isIncome ? amount : -amount;
      
      const updateData: UpdateTransactionInput = {
        amount: finalAmount,
        description: formData.description.trim(),
        identifier: formData.identifier.trim() || undefined,
        date: new Date(formData.date),
        source: formData.source.trim() || undefined,
        status: formData.status,
        notes: formData.notes.trim() || undefined
      };

      // Remove undefined values
      const cleanUpdateData = Object.fromEntries(
        Object.entries(updateData).filter(([_, v]) => v !== undefined)
      );

      const { data, error } = await supabase
        .from('transactions')
        .update(cleanUpdateData)
        .eq('id', transaction.id)
        .eq('user_id', transaction.user_id)
        .select()
        .single();

      if (error) {
        console.error('Error updating transaction:', error);
        toast.error('Failed to update transaction');
        return;
      }

      // Transform the response back to client format
      const updatedTransaction: Transaction = {
        ...data,
        amount: parseFloat(data.amount),
        date: new Date(data.date),
        created_at: new Date(data.created_at),
        updated_at: new Date(data.updated_at),
        labels: transaction.labels // Preserve existing labels
      };

      toast.success('Transaction updated successfully');
      onSave(updatedTransaction);
      
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFieldChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const toggleIncomeExpense = () => {
    setIsIncome(!isIncome);
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Edit Transaction
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Amount and Type */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={isIncome ? "default" : "outline"}
                onClick={toggleIncomeExpense}
                className="px-3"
              >
                <DollarSign className="h-4 w-4" />
                {isIncome ? "Income" : "Expense"}
              </Button>
              <div className="flex-1">
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => handleFieldChange('amount', e.target.value)}
                  placeholder="0.00"
                  className={errors.amount ? 'border-red-500' : ''}
                />
                {errors.amount && (
                  <p className="text-sm text-red-500 mt-1">{errors.amount}</p>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              placeholder="Transaction description"
              className={errors.description ? 'border-red-500' : ''}
              maxLength={500}
            />
            {errors.description && (
              <p className="text-sm text-red-500 mt-1">{errors.description}</p>
            )}
            <p className="text-xs text-gray-500">
              {formData.description.length}/500 characters
            </p>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <div className="relative">
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => handleFieldChange('date', e.target.value)}
                className={errors.date ? 'border-red-500' : ''}
              />
              <CalendarIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
            {errors.date && (
              <p className="text-sm text-red-500 mt-1">{errors.date}</p>
            )}
          </div>

          {/* Identifier */}
          <div className="space-y-2">
            <Label htmlFor="identifier">Identifier (Optional)</Label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="identifier"
                value={formData.identifier}
                onChange={(e) => handleFieldChange('identifier', e.target.value)}
                placeholder="Transaction ID or reference"
                className="pl-10"
              />
            </div>
          </div>

          {/* Source */}
          <div className="space-y-2">
            <Label htmlFor="source">Source (Optional)</Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="source"
                value={formData.source}
                onChange={(e) => handleFieldChange('source', e.target.value)}
                placeholder="Bank, card, or payment method"
                className="pl-10"
              />
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) => handleFieldChange('status', e.target.value as TransactionStatus)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
            </select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleFieldChange('notes', e.target.value)}
              placeholder="Additional notes or comments"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              maxLength={1000}
            />
            <p className="text-xs text-gray-500">
              {formData.notes.length}/1000 characters
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              disabled={isLoading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
              className="min-w-[100px]"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </div>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
} 