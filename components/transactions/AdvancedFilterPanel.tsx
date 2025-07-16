'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useFilters } from '@/context/filters';
import { Label as LabelType } from '@/types/database';
import { createClient } from '@/utils/supabase/client';
import { 
  Calendar, 
  DollarSign, 
  Tag, 
  Filter, 
  X, 
  Save, 
  Star, 
  StarOff,
  Trash2,
  RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';
import { cn, formatCurrency } from '@/lib/utils';
import { LabelBadge } from './LabelBadge';

interface AdvancedFilterPanelProps {
  onClose?: () => void;
  className?: string;
}

export function AdvancedFilterPanel({ onClose, className }: AdvancedFilterPanelProps) {
  const {
    activeFilters,
    updateFilters,
    clearFilters,
    savedFilters,
    saveCurrentFilters,
    loadSavedFilter,
    deleteSavedFilter,
    setDefaultFilters,
  } = useFilters();

  const [labels, setLabels] = useState<LabelType[]>([]);
  const [saveFilterName, setSaveFilterName] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);

  const supabase = createClient();

  // Fetch available labels
  useEffect(() => {
    const fetchLabels = async () => {
      try {
        const { data } = await supabase
          .from('labels')
          .select('*')
          .order('name');
        
        if (data) {
          setLabels(data);
        }
      } catch (error) {
        console.error('Error fetching labels:', error);
      }
    };

    fetchLabels();
  }, [supabase]);

  const handleDateChange = (field: 'dateFrom' | 'dateTo', value: string) => {
    const date = value ? new Date(value) : undefined;
    updateFilters({ [field]: date });
  };

  const handleAmountChange = (field: 'minAmount' | 'maxAmount', value: string) => {
    const amount = value === '' ? undefined : parseFloat(value);
    updateFilters({ [field]: amount });
  };

  const handleStatusChange = (status: string) => {
    updateFilters({ 
      status: activeFilters.status === status ? undefined : status as any 
    });
  };

  const handleLabelToggle = (labelId: string) => {
    const currentLabels = activeFilters.labels || [];
    const updatedLabels = currentLabels.includes(labelId)
      ? currentLabels.filter(id => id !== labelId)
      : [...currentLabels, labelId];
    
    updateFilters({ 
      labels: updatedLabels.length > 0 ? updatedLabels : undefined 
    });
  };

  const handleSaveFilter = () => {
    if (!saveFilterName.trim()) {
      toast.error('Please enter a name for the filter');
      return;
    }

    saveCurrentFilters(saveFilterName.trim());
    setSaveFilterName('');
    setShowSaveInput(false);
    toast.success('Filter saved successfully');
  };

  const handleSetAsDefault = () => {
    setDefaultFilters(activeFilters);
    toast.success('Set as default filters');
  };

  const formatDateForInput = (date: Date | undefined) => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (activeFilters.status) count++;
    if (activeFilters.search) count++;
    if (activeFilters.labels?.length) count++;
    if (activeFilters.minAmount !== undefined) count++;
    if (activeFilters.maxAmount !== undefined) count++;
    if (activeFilters.dateFrom) count++;
    if (activeFilters.dateTo) count++;
    return count;
  };

  const activeCount = getActiveFilterCount();

  return (
    <Card className={cn("p-6 space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Advanced Filters</h3>
          {activeCount > 0 && (
            <Badge variant="secondary">{activeCount} active</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={clearFilters}
            disabled={activeCount === 0}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Clear All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open('/search', '_blank')}
          >
            <Filter className="h-4 w-4 mr-2" />
            Advanced Search
          </Button>
          {onClose && (
            <Button variant="outline" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="space-y-2">
        <Label htmlFor="search">Search</Label>
        <Input
          id="search"
          placeholder="Search transactions..."
          value={activeFilters.search || ''}
          onChange={(e) => updateFilters({ search: e.target.value || undefined })}
        />
      </div>

      {/* Status Filter */}
      <div className="space-y-3">
        <Label>Status</Label>
        <div className="flex flex-wrap gap-2">
          {['pending', 'approved', 'rejected'].map((status) => (
            <Button
              key={status}
              variant={activeFilters.status === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleStatusChange(status)}
              className="capitalize"
            >
              {status}
            </Button>
          ))}
        </div>
      </div>

      {/* Date Range */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Date Range
        </Label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="dateFrom" className="text-sm text-muted-foreground">From</Label>
            <Input
              id="dateFrom"
              type="date"
              value={formatDateForInput(activeFilters.dateFrom)}
              onChange={(e) => handleDateChange('dateFrom', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="dateTo" className="text-sm text-muted-foreground">To</Label>
            <Input
              id="dateTo"
              type="date"
              value={formatDateForInput(activeFilters.dateTo)}
              onChange={(e) => handleDateChange('dateTo', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Amount Range */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Amount Range
        </Label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="minAmount" className="text-sm text-muted-foreground">Min Amount</Label>
            <Input
              id="minAmount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={activeFilters.minAmount || ''}
              onChange={(e) => handleAmountChange('minAmount', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="maxAmount" className="text-sm text-muted-foreground">Max Amount</Label>
            <Input
              id="maxAmount"
              type="number"
              step="0.01"
              placeholder="No limit"
              value={activeFilters.maxAmount || ''}
              onChange={(e) => handleAmountChange('maxAmount', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Labels Filter */}
      {labels.length > 0 && (
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Labels
          </Label>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {labels.map((label) => {
              const isSelected = activeFilters.labels?.includes(label.id) || false;
              return (
                <div
                  key={label.id}
                  className={cn(
                    'cursor-pointer transition-all border-2 rounded-full',
                    isSelected 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-transparent hover:border-gray-300'
                  )}
                  onClick={() => handleLabelToggle(label.id)}
                >
                  <LabelBadge 
                    label={label} 
                    size="sm"
                    className={cn(
                      'transition-all',
                      isSelected && 'shadow-sm'
                    )}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Save Current Filter */}
      <div className="space-y-3 border-t pt-4">
        <Label>Save Current Filter</Label>
        {showSaveInput ? (
          <div className="flex gap-2">
            <Input
              placeholder="Filter name..."
              value={saveFilterName}
              onChange={(e) => setSaveFilterName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveFilter();
                if (e.key === 'Escape') {
                  setShowSaveInput(false);
                  setSaveFilterName('');
                }
              }}
              autoFocus
            />
            <Button size="sm" onClick={handleSaveFilter}>
              <Save className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setShowSaveInput(false);
                setSaveFilterName('');
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSaveInput(true)}
              disabled={activeCount === 0}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Filter
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSetAsDefault}
              disabled={activeCount === 0}
            >
              <Star className="h-4 w-4 mr-2" />
              Set as Default
            </Button>
          </div>
        )}
      </div>

      {/* Saved Filters */}
      {savedFilters.length > 0 && (
        <div className="space-y-3 border-t pt-4">
          <Label>Saved Filters ({savedFilters.length})</Label>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {savedFilters.map((filter) => (
              <div
                key={filter.id}
                className="flex items-center justify-between p-2 border rounded-lg hover:bg-muted/50"
              >
                <div className="flex-1">
                  <div className="font-medium text-sm">{filter.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Created {filter.createdAt.toLocaleDateString()}
                    {filter.lastUsed && (
                      <> • Last used {filter.lastUsed.toLocaleDateString()}</>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => loadSavedFilter(filter.id)}
                    className="h-8 px-2"
                  >
                    Load
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteSavedFilter(filter.id)}
                    className="h-8 px-2 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
} 