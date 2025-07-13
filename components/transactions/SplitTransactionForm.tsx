'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TransactionWithLabels, SplitTransactionData, Label as DatabaseLabel } from '@/types/database';
import { formatCurrency } from '@/lib/utils';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { Plus, Minus, Save, X, Scissors, DollarSign, AlertTriangle } from 'lucide-react';

interface SplitTransactionFormProps {
  transaction: TransactionWithLabels;
  onSave: () => void;
  onCancel: () => void;
}

interface SplitEntry extends SplitTransactionData {
  id: string; // temporary ID for form management
  selectedLabels: DatabaseLabel[];
}

export function SplitTransactionForm({ transaction, onSave, onCancel }: SplitTransactionFormProps) {
  const [splits, setSplits] = useState<SplitEntry[]>([
    {
      id: '1',
      amount: Math.abs(transaction.amount),
      description: transaction.description,
      labels: [],
      selectedLabels: [],
      notes: ''
    }
  ]);
  const [availableLabels, setAvailableLabels] = useState<DatabaseLabel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const originalAmount = Math.abs(transaction.amount);
  const isIncome = transaction.amount >= 0;

  // Fetch available labels
  useEffect(() => {
    const fetchLabels = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('labels')
          .select('*')
          .order('name');

        if (error) {
          console.error('Error fetching labels:', error);
          return;
        }

        const labels: DatabaseLabel[] = data.map(label => ({
          ...label,
          created_at: new Date(label.created_at),
          updated_at: new Date(label.updated_at)
        }));

        setAvailableLabels(labels);
      } catch (error) {
        console.error('Error fetching labels:', error);
      }
    };

    fetchLabels();
  }, []);

  // Calculate total split amount
  const totalSplitAmount = splits.reduce((sum, split) => sum + (split.amount || 0), 0);
  const remainingAmount = originalAmount - totalSplitAmount;
  const isValidTotal = Math.abs(remainingAmount) < 0.01; // Allow for small floating point errors

  // Add new split
  const addSplit = () => {
    const newSplit: SplitEntry = {
      id: Date.now().toString(),
      amount: Math.max(0, remainingAmount),
      description: '',
      labels: [],
      selectedLabels: [],
      notes: ''
    };
    setSplits(prev => [...prev, newSplit]);
  };

  // Remove split
  const removeSplit = (id: string) => {
    if (splits.length > 1) {
      setSplits(prev => prev.filter(split => split.id !== id));
      // Clear any errors for this split
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`amount_${id}`];
        delete newErrors[`description_${id}`];
        return newErrors;
      });
    }
  };

  // Update split field
  const updateSplit = (id: string, field: keyof SplitEntry, value: any) => {
    setSplits(prev => prev.map(split => 
      split.id === id 
        ? { ...split, [field]: value }
        : split
    ));

    // Clear error when user starts typing
    const errorKey = `${field}_${id}`;
    if (errors[errorKey]) {
      setErrors(prev => ({ ...prev, [errorKey]: '' }));
    }
  };

  // Toggle label for split
  const toggleLabelForSplit = (splitId: string, label: DatabaseLabel) => {
    setSplits(prev => prev.map(split => {
      if (split.id !== splitId) return split;

      const isSelected = split.selectedLabels.some(l => l.id === label.id);
      
      if (isSelected) {
        return {
          ...split,
          selectedLabels: split.selectedLabels.filter(l => l.id !== label.id),
          labels: split.labels.filter(id => id !== label.id)
        };
      } else {
        return {
          ...split,
          selectedLabels: [...split.selectedLabels, label],
          labels: [...split.labels, label.id]
        };
      }
    }));
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Check if total matches
    if (!isValidTotal) {
      newErrors.total = `Split amounts must equal the original amount (${formatCurrency(originalAmount)})`;
    }

    // Validate each split
    splits.forEach(split => {
      if (!split.amount || split.amount <= 0) {
        newErrors[`amount_${split.id}`] = 'Amount must be greater than 0';
      }
      if (!split.description.trim()) {
        newErrors[`description_${split.id}`] = 'Description is required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Please fix the form errors before saving');
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();

      // Generate split identifier
      const splitIdentifier = `SPLIT_${transaction.id}_${Date.now()}`;

      // Update original transaction to mark as split parent
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          identifier: `SPLIT_PARENT_${splitIdentifier}`,
          notes: (transaction.notes || '') + 
            `\n\n[SPLIT] This transaction was split into ${splits.length} parts on ${new Date().toLocaleDateString()}`
        })
        .eq('id', transaction.id)
        .eq('user_id', transaction.user_id);

      if (updateError) {
        throw updateError;
      }

      // Create split transactions
      const splitTransactions = splits.map((split, index) => ({
        user_id: transaction.user_id,
        amount: isIncome ? split.amount : -split.amount,
        description: split.description.trim(),
        identifier: `${splitIdentifier}_${index + 1}`,
        date: transaction.date.toISOString(),
        source: transaction.source,
        status: transaction.status,
        notes: split.notes?.trim() || null
      }));

      const { data: newTransactions, error: insertError } = await supabase
        .from('transactions')
        .insert(splitTransactions)
        .select();

      if (insertError) {
        throw insertError;
      }

      // Add labels to each split transaction
      for (let i = 0; i < splits.length; i++) {
        const split = splits[i];
        const newTransaction = newTransactions[i];

        if (split.labels.length > 0) {
          const labelInserts = split.labels.map(labelId => ({
            transaction_id: newTransaction.id,
            label_id: labelId
          }));

          const { error: labelError } = await supabase
            .from('transaction_labels')
            .insert(labelInserts);

          if (labelError) {
            console.error('Error adding labels to split:', labelError);
            // Don't throw here, as the main split was successful
          }
        }
      }

      toast.success(`Transaction split into ${splits.length} parts successfully`);
      onSave();

    } catch (error) {
      console.error('Error splitting transaction:', error);
      toast.error('Failed to split transaction');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scissors className="h-5 w-5" />
          Split Transaction
        </CardTitle>
        <div className="text-sm text-gray-600">
          Original: {formatCurrency(originalAmount)} • {transaction.description}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Total validation */}
        <div className={`p-4 rounded-lg border ${
          isValidTotal 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isValidTotal ? (
                <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-500" />
              )}
              <span className="font-medium">
                Total: {formatCurrency(totalSplitAmount)}
              </span>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">
                Original: {formatCurrency(originalAmount)}
              </div>
              <div className={`text-sm font-medium ${
                isValidTotal ? 'text-green-600' : 'text-red-600'
              }`}>
                Remaining: {formatCurrency(remainingAmount)}
              </div>
            </div>
          </div>
          {errors.total && (
            <p className="text-red-600 text-sm mt-2">{errors.total}</p>
          )}
        </div>

        {/* Split entries */}
        <div className="space-y-4">
          {splits.map((split, index) => (
            <Card key={split.id} className="border-gray-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Split {index + 1}</h4>
                  {splits.length > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeSplit(split.id)}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Amount and Description */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`amount_${split.id}`}>Amount</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id={`amount_${split.id}`}
                        type="number"
                        step="0.01"
                        min="0"
                        value={split.amount || ''}
                        onChange={(e) => updateSplit(split.id, 'amount', parseFloat(e.target.value) || 0)}
                        className={`pl-10 ${errors[`amount_${split.id}`] ? 'border-red-500' : ''}`}
                        placeholder="0.00"
                      />
                    </div>
                    {errors[`amount_${split.id}`] && (
                      <p className="text-red-500 text-sm">{errors[`amount_${split.id}`]}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`description_${split.id}`}>Description</Label>
                    <Input
                      id={`description_${split.id}`}
                      value={split.description}
                      onChange={(e) => updateSplit(split.id, 'description', e.target.value)}
                      className={errors[`description_${split.id}`] ? 'border-red-500' : ''}
                      placeholder="Split description"
                      maxLength={200}
                    />
                    {errors[`description_${split.id}`] && (
                      <p className="text-red-500 text-sm">{errors[`description_${split.id}`]}</p>
                    )}
                  </div>
                </div>

                {/* Labels */}
                <div className="space-y-2">
                  <Label>Labels</Label>
                  <div className="flex flex-wrap gap-2">
                    {split.selectedLabels.map(label => (
                      <Badge
                        key={label.id}
                        style={{ backgroundColor: label.color, color: 'white' }}
                        className="cursor-pointer hover:opacity-80"
                        onClick={() => toggleLabelForSplit(split.id, label)}
                      >
                        {label.name}
                        <X className="h-3 w-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                    {availableLabels
                      .filter(label => !split.selectedLabels.some(l => l.id === label.id))
                      .map(label => (
                        <Button
                          key={label.id}
                          variant="outline"
                          size="sm"
                          onClick={() => toggleLabelForSplit(split.id, label)}
                          className="text-xs"
                        >
                          <div
                            className="w-2 h-2 rounded-full mr-2"
                            style={{ backgroundColor: label.color }}
                          />
                          {label.name}
                        </Button>
                      ))}
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor={`notes_${split.id}`}>Notes (Optional)</Label>
                  <textarea
                    id={`notes_${split.id}`}
                    value={split.notes || ''}
                    onChange={(e) => updateSplit(split.id, 'notes', e.target.value)}
                    placeholder="Additional notes for this split..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    maxLength={500}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Add Split Button */}
        <Button
          variant="outline"
          onClick={addSplit}
          className="w-full"
          disabled={splits.length >= 10} // Reasonable limit
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Another Split
          {splits.length >= 10 && ' (Maximum 10 splits)'}
        </Button>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !isValidTotal}
            className="min-w-[120px]"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Splitting...
              </div>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Split Transaction
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 