'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label as UILabel } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label, CreateLabelInput, UpdateLabelInput } from '@/types/database';
import { useAuthenticatedMutation } from '@/hooks/useAuthenticatedMutation';
import { toast } from 'sonner';
import { Palette, Save, X } from 'lucide-react';

interface LabelFormProps {
  label?: Label; // If provided, we're editing; otherwise creating
  onSave: (label: Label) => void;
  onCancel: () => void;
  existingLabels?: Label[]; // For name uniqueness validation
}

const DEFAULT_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#64748b', '#6b7280', '#374151'
];

export function LabelForm({ label, onSave, onCancel, existingLabels = [] }: LabelFormProps) {
  const { insert, update, isAuthenticated } = useAuthenticatedMutation();
  const [formData, setFormData] = useState({
    name: label?.name || '',
    color: label?.color || DEFAULT_COLORS[0],
    recurring: label?.recurring || false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditing = !!label;

  // Reset form when label prop changes
  useEffect(() => {
    if (label) {
      setFormData({
        name: label.name,
        color: label.color,
        recurring: label.recurring
      });
    }
  }, [label]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Label name is required';
    } else if (formData.name.trim().length > 50) {
      newErrors.name = 'Label name must be 50 characters or less';
    } else {
      // Check for duplicate names (excluding current label if editing)
      const duplicateLabel = existingLabels.find(existingLabel => 
        existingLabel.name.toLowerCase() === formData.name.trim().toLowerCase() &&
        existingLabel.id !== label?.id
      );
      if (duplicateLabel) {
        newErrors.name = 'A label with this name already exists';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    if (!isAuthenticated) {
      toast.error('User not authenticated');
      return;
    }

    setIsLoading(true);

    try {
      if (isEditing) {
        // Update existing label
        const updateData: UpdateLabelInput = {
          name: formData.name.trim(),
          color: formData.color,
          recurring: formData.recurring
        };

        const [data] = await update('labels', label.id, updateData);

        const updatedLabel: Label = {
          ...data,
          created_at: new Date(data.created_at),
          updated_at: new Date(data.updated_at)
        };

        toast.success(`Updated label "${updatedLabel.name}"`);
        onSave(updatedLabel);
      } else {
        // Create new label
        const createData = {
          name: formData.name.trim(),
          color: formData.color,
          recurring: formData.recurring
        };

        const [data] = await insert('labels', createData);

        const newLabel: Label = {
          ...data,
          created_at: new Date(data.created_at),
          updated_at: new Date(data.updated_at)
        };

        toast.success(`Created label "${newLabel.name}"`);
        onSave(newLabel);
      }
    } catch (error) {
      console.error('Error saving label:', error);
      toast.error(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, name: e.target.value }));
    // Clear name error when user starts typing
    if (errors.name) {
      setErrors(prev => ({ ...prev, name: '' }));
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          {isEditing ? 'Edit Label' : 'Create New Label'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Field */}
          <div className="space-y-2">
            <UILabel htmlFor="name" className="text-sm font-medium">
              Label Name *
            </UILabel>
            <Input
              id="name"
              value={formData.name}
              onChange={handleNameChange}
              placeholder="Enter label name"
              maxLength={50}
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          {/* Color Picker */}
          <div className="space-y-2">
            <UILabel className="text-sm font-medium">Color</UILabel>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    formData.color === color 
                      ? 'border-gray-800 scale-110' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setFormData(prev => ({ ...prev, color }))}
                />
              ))}
            </div>
          </div>

          {/* Recurring Checkbox */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="recurring"
              checked={formData.recurring}
              onChange={(e) => setFormData(prev => ({ ...prev, recurring: e.target.checked }))}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <UILabel htmlFor="recurring" className="text-sm font-medium cursor-pointer">
              Recurring label
            </UILabel>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={isLoading || !formData.name.trim()}
              className="flex-1"
            >
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'Saving...' : (isEditing ? 'Update' : 'Create')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
} 