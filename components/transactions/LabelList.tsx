'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label as UILabel } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/types/database';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Tag, 
  Filter,
  MoreVertical
} from 'lucide-react';
import { LabelBadge } from './LabelBadge';
import { LabelForm } from './LabelForm';

interface LabelWithStats extends Label {
  transaction_count: number;
}

interface LabelListProps {
  onLabelSelect?: (label: Label) => void;
  showCreateButton?: boolean;
  className?: string;
}

type SortOption = 'name' | 'usage' | 'created';
type FilterOption = 'all' | 'recurring' | 'regular';

export function LabelList({ 
  onLabelSelect, 
  showCreateButton = true,
  className 
}: LabelListProps) {
  const [labels, setLabels] = useState<LabelWithStats[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [editingLabel, setEditingLabel] = useState<Label | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [deletingLabel, setDeletingLabel] = useState<string | null>(null);

  // Fetch labels with transaction counts
  const fetchLabels = useCallback(async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      
      // Get labels with transaction counts
      const { data, error } = await supabase
        .from('labels')
        .select(`
          *,
          transaction_labels (
            transaction_id
          )
        `)
        .order('name');

      if (error) {
        console.error('Error fetching labels:', error);
        toast.error('Failed to load labels');
        return;
      }

      const labelsWithStats: LabelWithStats[] = data.map(label => ({
        ...label,
        created_at: new Date(label.created_at),
        updated_at: new Date(label.updated_at),
        transaction_count: label.transaction_labels?.length || 0
      }));

      setLabels(labelsWithStats);
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

  // Filter and sort labels
  const filteredAndSortedLabels = labels
    .filter(label => {
      // Text search filter
      const matchesSearch = label.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Recurring filter
      const matchesFilter = filterBy === 'all' || 
        (filterBy === 'recurring' && label.recurring) ||
        (filterBy === 'regular' && !label.recurring);
      
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'usage':
          return b.transaction_count - a.transaction_count;
        case 'created':
          return b.created_at.getTime() - a.created_at.getTime();
        default:
          return 0;
      }
    });

  const handleLabelCreated = (newLabel: Label) => {
    const labelWithStats: LabelWithStats = {
      ...newLabel,
      transaction_count: 0
    };
    setLabels(prev => [...prev, labelWithStats]);
    setShowCreateForm(false);
    toast.success(`Created label "${newLabel.name}"`);
  };

  const handleLabelUpdated = (updatedLabel: Label) => {
    setLabels(prev => prev.map(label => 
      label.id === updatedLabel.id 
        ? { ...updatedLabel, transaction_count: label.transaction_count }
        : label
    ));
    setEditingLabel(null);
    toast.success(`Updated label "${updatedLabel.name}"`);
  };

  const handleDeleteLabel = async (labelId: string) => {
    if (deletingLabel) return;
    
    const label = labels.find(l => l.id === labelId);
    if (!label) return;

    // Confirm deletion if label has transactions
    if (label.transaction_count > 0) {
      const confirmed = window.confirm(
        `Are you sure you want to delete "${label.name}"? This will remove it from ${label.transaction_count} transaction(s).`
      );
      if (!confirmed) return;
    }

    setDeletingLabel(labelId);

    try {
      const supabase = createClient();
      
      // First remove all transaction associations
      const { error: deleteAssociationsError } = await supabase
        .from('transaction_labels')
        .delete()
        .eq('label_id', labelId);

      if (deleteAssociationsError) {
        console.error('Error removing label associations:', deleteAssociationsError);
        toast.error('Failed to remove label associations');
        return;
      }

      // Then delete the label
      const { error: deleteLabelError } = await supabase
        .from('labels')
        .delete()
        .eq('id', labelId);

      if (deleteLabelError) {
        console.error('Error deleting label:', deleteLabelError);
        toast.error('Failed to delete label');
        return;
      }

      setLabels(prev => prev.filter(l => l.id !== labelId));
      toast.success(`Deleted label "${label.name}"`);
    } catch (error) {
      console.error('Error deleting label:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setDeletingLabel(null);
    }
  };

  const handleCreateCancel = () => {
    setShowCreateForm(false);
  };

  const handleEditCancel = () => {
    setEditingLabel(null);
  };

  // Show form if creating or editing
  if (showCreateForm || editingLabel) {
    return (
      <LabelForm
        label={editingLabel || undefined}
        onSave={editingLabel ? handleLabelUpdated : handleLabelCreated}
        onCancel={editingLabel ? handleEditCancel : handleCreateCancel}
        existingLabels={labels}
      />
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Labels ({labels.length})
          </div>
          {showCreateButton && (
            <Button 
              onClick={() => setShowCreateForm(true)}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Label
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and Filters */}
        <div className="space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search labels..."
              className="pl-10"
            />
          </div>

          {/* Sort and Filter Controls */}
          <div className="flex gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <UILabel className="text-sm text-gray-600">Sort:</UILabel>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="text-sm border rounded px-2 py-1"
              >
                <option value="name">Name</option>
                <option value="usage">Usage</option>
                <option value="created">Created Date</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value as FilterOption)}
                className="text-sm border rounded px-2 py-1"
              >
                <option value="all">All Labels</option>
                <option value="recurring">Recurring Only</option>
                <option value="regular">Regular Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Labels List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {isLoading ? (
            <p className="text-sm text-gray-500 text-center py-8">
              Loading labels...
            </p>
          ) : filteredAndSortedLabels.length > 0 ? (
            filteredAndSortedLabels.map(label => (
              <div
                key={label.id}
                className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                  onLabelSelect 
                    ? 'cursor-pointer hover:bg-gray-50' 
                    : 'bg-white'
                }`}
                onClick={() => onLabelSelect?.(label)}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div
                    className="w-5 h-5 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: label.color }}
                  />
                  <div className="flex flex-col flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{label.name}</span>
                      {label.recurring && (
                        <Badge variant="secondary" className="text-xs">
                          Recurring
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>{label.transaction_count} transactions</span>
                      <span>Created {label.created_at.toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingLabel(label);
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteLabel(label.id);
                    }}
                    disabled={deletingLabel === label.id}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <Tag className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">
                {searchTerm || filterBy !== 'all' 
                  ? 'No labels match your search criteria' 
                  : 'No labels created yet'
                }
              </p>
              {showCreateButton && !searchTerm && filterBy === 'all' && (
                <Button 
                  variant="outline" 
                  onClick={() => setShowCreateForm(true)}
                  className="mt-3"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Label
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 