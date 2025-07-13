'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Transaction } from '@/types/database';
import { formatRelativeDate } from '@/lib/utils';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { FileText, Edit3, Save, X, Plus, MessageSquare } from 'lucide-react';

interface TransactionNotesProps {
  transaction: Transaction;
  onNotesUpdate: (notes: string) => void;
}

export function TransactionNotes({ transaction, onNotesUpdate }: TransactionNotesProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedNotes, setEditedNotes] = useState(transaction.notes || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleStartEdit = () => {
    setEditedNotes(transaction.notes || '');
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditedNotes(transaction.notes || '');
    setIsEditing(false);
  };

  const handleSaveNotes = async () => {
    if (editedNotes.trim() === (transaction.notes || '').trim()) {
      setIsEditing(false);
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      
      const { error } = await supabase
        .from('transactions')
        .update({
          notes: editedNotes.trim() || null
        })
        .eq('id', transaction.id)
        .eq('user_id', transaction.user_id);

      if (error) {
        console.error('Error updating notes:', error);
        toast.error('Failed to update notes');
        return;
      }

      onNotesUpdate(editedNotes.trim());
      setIsEditing(false);
      
      if (editedNotes.trim()) {
        toast.success('Notes updated successfully');
      } else {
        toast.success('Notes cleared');
      }
      
    } catch (error) {
      console.error('Error updating notes:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancelEdit();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSaveNotes();
    }
  };

  const currentNotes = transaction.notes || '';
  const hasNotes = currentNotes.length > 0;

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Notes
          </div>
          {!isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleStartEdit}
              className="ml-auto"
            >
              {hasNotes ? (
                <>
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Notes
                </>
              )}
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!isEditing ? (
          // Display mode
          <div className="space-y-3">
            {hasNotes ? (
              <div className="space-y-2">
                <div className="p-3 bg-gray-50 rounded-md">
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {currentNotes}
                  </p>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>
                    Last updated {formatRelativeDate(transaction.updated_at)}
                  </span>
                  <span>
                    {currentNotes.length} characters
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500 mb-3">
                  No notes added to this transaction yet
                </p>
                <p className="text-xs text-gray-400">
                  Click "Add Notes" to include additional information, context, or reminders about this transaction.
                </p>
              </div>
            )}
          </div>
        ) : (
          // Edit mode
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-medium">
                Notes
              </Label>
              <textarea
                id="notes"
                value={editedNotes}
                onChange={(e) => setEditedNotes(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Add notes about this transaction..."
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                maxLength={2000}
                disabled={isLoading}
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>
                  {editedNotes.length}/2000 characters
                </span>
                <span>
                  Ctrl/Cmd + Enter to save, Esc to cancel
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={handleCancelEdit}
                disabled={isLoading}
                size="sm"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleSaveNotes}
                disabled={isLoading}
                size="sm"
                className="min-w-[80px]"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </div>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Tips */}
        {isEditing && (
          <div className="mt-4 p-3 bg-blue-50 rounded-md">
            <p className="text-xs text-blue-700">
              💡 <strong>Tips:</strong> Use notes to record additional context like:
            </p>
            <ul className="text-xs text-blue-600 mt-1 ml-4 list-disc">
              <li>Split transaction details</li>
              <li>Business purpose or category</li>
              <li>Related receipts or documents</li>
              <li>Tax deduction information</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 