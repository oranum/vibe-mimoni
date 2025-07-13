'use client';

import { TransactionWithLabels } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Check, X, Edit, MoreHorizontal } from 'lucide-react';
import { useState } from 'react';

export interface ApprovalActionsProps {
  transaction: TransactionWithLabels;
  onApprove?: (id: string) => Promise<void>;
  onReject?: (id: string) => Promise<void>;
  onEdit?: (transaction: TransactionWithLabels) => void;
  isLoading?: boolean;
  size?: 'sm' | 'default';
}

export function ApprovalActions({
  transaction,
  onApprove,
  onReject,
  onEdit,
  isLoading = false,
  size = 'sm'
}: ApprovalActionsProps) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const handleApprove = async () => {
    if (!onApprove || isLoading) return;
    
    setLoadingAction('approve');
    try {
      await onApprove(transaction.id);
    } catch (error) {
      console.error('Failed to approve transaction:', error);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleReject = async () => {
    if (!onReject || isLoading) return;
    
    setLoadingAction('reject');
    try {
      await onReject(transaction.id);
    } catch (error) {
      console.error('Failed to reject transaction:', error);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleEdit = () => {
    if (!onEdit || isLoading) return;
    onEdit(transaction);
  };

  const isActionLoading = (action: string) => 
    isLoading || loadingAction === action;

  return (
    <div className="flex items-center gap-1">
      {onApprove && (
        <Button
          size={size}
          variant="outline"
          onClick={handleApprove}
          disabled={isActionLoading('approve')}
          className="text-green-600 border-green-200 hover:bg-green-50 hover:border-green-300"
        >
          <Check className="h-3 w-3" />
          {size === 'default' && (
            <span className="ml-1">
              {isActionLoading('approve') ? 'Approving...' : 'Approve'}
            </span>
          )}
        </Button>
      )}
      
      {onReject && (
        <Button
          size={size}
          variant="outline"
          onClick={handleReject}
          disabled={isActionLoading('reject')}
          className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
        >
          <X className="h-3 w-3" />
          {size === 'default' && (
            <span className="ml-1">
              {isActionLoading('reject') ? 'Rejecting...' : 'Reject'}
            </span>
          )}
        </Button>
      )}
      
      {onEdit && (
        <Button
          size={size}
          variant="outline"
          onClick={handleEdit}
          disabled={isLoading}
          className="text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300"
        >
          <Edit className="h-3 w-3" />
          {size === 'default' && <span className="ml-1">Edit</span>}
        </Button>
      )}
    </div>
  );
} 