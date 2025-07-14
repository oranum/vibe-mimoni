'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label as UILabel } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/types/database';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { Search, Plus, Check, Tag } from 'lucide-react';
import { LabelBadge } from './LabelBadge';
import { LabelForm } from './LabelForm';

interface LabelPickerProps {
  selectedLabels: Label[];
  onSelectionChange: (labels: Label[]) => void;
  title?: string;
  showCreateButton?: boolean;
  maxHeight?: string;
  className?: string;
}

export function LabelPicker({ 
  selectedLabels, 
  onSelectionChange,
  title = "Select Labels",
  showCreateButton = true,
  maxHeight = "max-h-64",
  className 
}: LabelPickerProps) {
  const [availableLabels, setAvailableLabels] = useState<Label[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Fetch available labels
  const fetchLabels = useCallback(async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('labels')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching labels:', error);
        toast.error('Failed to load labels');
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
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLabels();
  }, [fetchLabels]);

  // Filter labels based on search term
  const filteredLabels = availableLabels.filter(label =>
    label.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isLabelSelected = (labelId: string) => {
    return selectedLabels.some(label => label.id === labelId);
  };

  const toggleLabel = (label: Label) => {
    const isSelected = isLabelSelected(label.id);
    
    if (isSelected) {
      // Remove label
      const updatedLabels = selectedLabels.filter(l => l.id !== label.id);
      onSelectionChange(updatedLabels);
    } else {
      // Add label
      const updatedLabels = [...selectedLabels, label];
      onSelectionChange(updatedLabels);
    }
  };

  const removeLabelFromSelection = (labelId: string) => {
    const updatedLabels = selectedLabels.filter(l => l.id !== labelId);
    onSelectionChange(updatedLabels);
  };

  const handleLabelCreated = (newLabel: Label) => {
    setAvailableLabels(prev => [...prev, newLabel].sort((a, b) => a.name.localeCompare(b.name)));
    setShowCreateForm(false);
    
    // Auto-select the newly created label
    onSelectionChange([...selectedLabels, newLabel]);
  };

  const handleCreateCancel = () => {
    setShowCreateForm(false);
  };

  if (showCreateForm) {
    return (
      <LabelForm
        onSave={handleLabelCreated}
        onCancel={handleCreateCancel}
        existingLabels={availableLabels}
      />
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Selected Labels */}
        {selectedLabels.length > 0 && (
          <div className="space-y-2">
            <UILabel className="text-sm font-medium">Selected Labels</UILabel>
            <div className="flex flex-wrap gap-2">
              {selectedLabels.map(label => (
                <LabelBadge
                  key={label.id}
                  label={label}
                  onRemove={() => removeLabelFromSelection(label.id)}
                  showRecurring
                  size="sm"
                />
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
        <div className={`space-y-2 overflow-y-auto ${maxHeight}`}>
          {isLoading ? (
            <p className="text-sm text-gray-500 text-center py-4">
              Loading labels...
            </p>
          ) : filteredLabels.length > 0 ? (
            filteredLabels.map(label => {
              const isSelected = isLabelSelected(label.id);
              return (
                <div
                  key={label.id}
                  className={`flex items-center justify-between p-3 rounded-md border cursor-pointer transition-all ${
                    isSelected 
                      ? 'bg-blue-50 border-blue-200 shadow-sm' 
                      : 'hover:bg-gray-50 border-gray-200'
                  }`}
                  onClick={() => toggleLabel(label)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                      style={{ backgroundColor: label.color }}
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{label.name}</span>
                      {label.recurring && (
                        <span className="text-xs text-gray-500">Recurring</span>
                      )}
                    </div>
                  </div>
                  {isSelected && (
                    <Check className="h-5 w-5 text-blue-600" />
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

        {/* Create New Label Button */}
        {showCreateButton && (
          <Button
            variant="outline"
            onClick={() => setShowCreateForm(true)}
            className="w-full"
            disabled={isLoading}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create New Label
          </Button>
        )}
      </CardContent>
    </Card>
  );
} 