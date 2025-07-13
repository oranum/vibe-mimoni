'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label as UILabel } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label, Transaction } from '@/types/database';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { Search, Plus, X, Tag, Palette, Check } from 'lucide-react';

interface LabelSelectorProps {
  transaction: Transaction;
  onLabelsUpdate: (labels: Label[]) => void;
}

interface NewLabelForm {
  name: string;
  color: string;
  recurring: boolean;
}

const DEFAULT_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#64748b', '#6b7280', '#374151'
];

export function LabelSelector({ transaction, onLabelsUpdate }: LabelSelectorProps) {
  const [availableLabels, setAvailableLabels] = useState<Label[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<Label[]>(transaction.labels || []);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showNewLabelForm, setShowNewLabelForm] = useState(false);
  const [newLabelForm, setNewLabelForm] = useState<NewLabelForm>({
    name: '',
    color: DEFAULT_COLORS[0],
    recurring: false
  });

  // Fetch available labels
  const fetchLabels = useCallback(async () => {
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

      const labels: Label[] = data.map(label => ({
        ...label,
        created_at: new Date(label.created_at),
        updated_at: new Date(label.updated_at)
      }));

      setAvailableLabels(labels);
    } catch (error) {
      console.error('Error fetching labels:', error);
    }
  }, []);

  useEffect(() => {
    fetchLabels();
  }, [fetchLabels]);

  // Filter labels based on search term
  const filteredLabels = availableLabels.filter(label =>
    label.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Check if a label is selected
  const isLabelSelected = (labelId: string) => {
    return selectedLabels.some(label => label.id === labelId);
  };

  // Toggle label selection
  const toggleLabel = async (label: Label) => {
    setIsLoading(true);
    
    try {
      const supabase = createClient();
      const isSelected = isLabelSelected(label.id);

      if (isSelected) {
        // Remove label from transaction
        const { error } = await supabase
          .from('transaction_labels')
          .delete()
          .eq('transaction_id', transaction.id)
          .eq('label_id', label.id);

        if (error) {
          console.error('Error removing label:', error);
          toast.error('Failed to remove label');
          return;
        }

        const newSelectedLabels = selectedLabels.filter(l => l.id !== label.id);
        setSelectedLabels(newSelectedLabels);
        onLabelsUpdate(newSelectedLabels);
        toast.success(`Removed label "${label.name}"`);
        
      } else {
        // Add label to transaction
        const { error } = await supabase
          .from('transaction_labels')
          .insert({
            transaction_id: transaction.id,
            label_id: label.id
          });

        if (error) {
          console.error('Error adding label:', error);
          toast.error('Failed to add label');
          return;
        }

        const newSelectedLabels = [...selectedLabels, label];
        setSelectedLabels(newSelectedLabels);
        onLabelsUpdate(newSelectedLabels);
        toast.success(`Added label "${label.name}"`);
      }
    } catch (error) {
      console.error('Error toggling label:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Create new label
  const createNewLabel = async () => {
    if (!newLabelForm.name.trim()) {
      toast.error('Label name is required');
      return;
    }

    // Check if label name already exists
    if (availableLabels.some(label => 
      label.name.toLowerCase() === newLabelForm.name.trim().toLowerCase()
    )) {
      toast.error('A label with this name already exists');
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('labels')
        .insert({
          name: newLabelForm.name.trim(),
          color: newLabelForm.color,
          recurring: newLabelForm.recurring
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating label:', error);
        toast.error('Failed to create label');
        return;
      }

      const newLabel: Label = {
        ...data,
        created_at: new Date(data.created_at),
        updated_at: new Date(data.updated_at)
      };

      setAvailableLabels(prev => [...prev, newLabel].sort((a, b) => a.name.localeCompare(b.name)));
      
      // Reset form
      setNewLabelForm({
        name: '',
        color: DEFAULT_COLORS[0],
        recurring: false
      });
      setShowNewLabelForm(false);
      
      toast.success(`Created label "${newLabel.name}"`);

      // Optionally auto-add the new label to the transaction
      await toggleLabel(newLabel);
      
    } catch (error) {
      console.error('Error creating label:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="h-5 w-5" />
          Manage Labels
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Labels */}
        {selectedLabels.length > 0 && (
          <div className="space-y-2">
            <UILabel className="text-sm font-medium">Current Labels</UILabel>
            <div className="flex flex-wrap gap-2">
              {selectedLabels.map(label => (
                <Badge
                  key={label.id}
                  style={{ backgroundColor: label.color, color: 'white' }}
                  className="cursor-pointer hover:opacity-80"
                  onClick={() => toggleLabel(label)}
                >
                  {label.name}
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="space-y-2">
          <UILabel className="text-sm font-medium">Available Labels</UILabel>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search labels..."
              className="pl-10"
            />
          </div>
        </div>

        {/* Available Labels */}
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {filteredLabels.length > 0 ? (
            filteredLabels.map(label => {
              const isSelected = isLabelSelected(label.id);
              return (
                <div
                  key={label.id}
                  className={`flex items-center justify-between p-2 rounded-md border cursor-pointer transition-colors ${
                    isSelected 
                      ? 'bg-blue-50 border-blue-200' 
                      : 'hover:bg-gray-50 border-gray-200'
                  }`}
                  onClick={() => toggleLabel(label)}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: label.color }}
                    />
                    <span className="text-sm">{label.name}</span>
                    {label.recurring && (
                      <Badge variant="secondary" className="text-xs">
                        Recurring
                      </Badge>
                    )}
                  </div>
                  {isSelected && (
                    <Check className="h-4 w-4 text-blue-600" />
                  )}
                </div>
              );
            })
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">
              {searchTerm ? 'No labels match your search' : 'No labels available'}
            </p>
          )}
        </div>

        {/* Create New Label */}
        {!showNewLabelForm ? (
          <Button
            variant="outline"
            onClick={() => setShowNewLabelForm(true)}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create New Label
          </Button>
        ) : (
          <div className="space-y-3 p-3 border rounded-md bg-gray-50">
            <div className="space-y-2">
              <UILabel className="text-sm">Label Name</UILabel>
              <Input
                value={newLabelForm.name}
                onChange={(e) => setNewLabelForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter label name"
                maxLength={50}
              />
            </div>

            <div className="space-y-2">
              <UILabel className="text-sm">Color</UILabel>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={`w-6 h-6 rounded-full border-2 ${
                      newLabelForm.color === color 
                        ? 'border-gray-800' 
                        : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewLabelForm(prev => ({ ...prev, color }))}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="recurring"
                checked={newLabelForm.recurring}
                onChange={(e) => setNewLabelForm(prev => ({ ...prev, recurring: e.target.checked }))}
                className="rounded"
              />
              <UILabel htmlFor="recurring" className="text-sm">
                Recurring label
              </UILabel>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={createNewLabel}
                disabled={isLoading || !newLabelForm.name.trim()}
              >
                Create
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowNewLabelForm(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 