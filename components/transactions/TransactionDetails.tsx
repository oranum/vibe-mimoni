'use client';

import { TransactionWithLabels } from '@/types/database';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { ApprovalActions } from './ApprovalActions';
import { Calendar, DollarSign, FileText, Tag, Clock, User } from 'lucide-react';

export interface TransactionDetailsProps {
  transaction: TransactionWithLabels;
  onApprove?: (id: string) => Promise<void>;
  onReject?: (id: string) => Promise<void>;
  onEdit?: (transaction: TransactionWithLabels) => void;
  onClose?: () => void;
  isLoading?: boolean;
  className?: string;
}

export function TransactionDetails({
  transaction,
  onApprove,
  onReject,
  onEdit,
  onClose,
  isLoading = false,
  className,
}: TransactionDetailsProps) {
  const isIncome = transaction.amount > 0;
  const isPending = transaction.status === 'pending';

  return (
    <Card className={cn('w-full max-w-2xl mx-auto', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-2">Transaction Details</h2>
            <Badge
              variant={isPending ? 'secondary' : 'default'}
              className={cn(
                isPending && 'bg-yellow-100 text-yellow-800'
              )}
            >
              {transaction.status}
            </Badge>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              ×
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Main transaction info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Amount */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              Amount
            </div>
            <div
              className={cn(
                'text-2xl font-bold',
                isIncome ? 'text-green-600' : 'text-red-600'
              )}
            >
              {isIncome ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount))}
            </div>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Transaction Date
            </div>
            <div className="text-lg">
              {formatDate(transaction.date, true)}
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <FileText className="h-4 w-4" />
            Description
          </div>
          <div className="text-base bg-gray-50 p-3 rounded-md">
            {transaction.description}
          </div>
        </div>

        {/* Additional info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Identifier */}
          {transaction.identifier && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Tag className="h-4 w-4" />
                Identifier
              </div>
              <div className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                {transaction.identifier}
              </div>
            </div>
          )}

          {/* Source */}
          {transaction.source && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <User className="h-4 w-4" />
                Source
              </div>
              <div className="text-sm bg-blue-50 text-blue-700 px-2 py-1 rounded">
                {transaction.source}
              </div>
            </div>
          )}
        </div>

        {/* Labels */}
        {transaction.labels && transaction.labels.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Tag className="h-4 w-4" />
              Labels
            </div>
            <div className="flex flex-wrap gap-2">
              {transaction.labels.map((label) => (
                <Badge
                  key={label.id}
                  variant="outline"
                  style={{ 
                    backgroundColor: `${label.color}20`, 
                    borderColor: label.color,
                    color: label.color
                  }}
                  className="text-sm"
                >
                  {label.name}
                  {label.recurring && (
                    <span className="ml-1 text-xs opacity-70">↻</span>
                  )}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {transaction.notes && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <FileText className="h-4 w-4" />
              Notes
            </div>
            <div className="text-sm bg-gray-50 p-3 rounded-md whitespace-pre-wrap">
              {transaction.notes}
            </div>
          </div>
        )}

        {/* Timestamps */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-muted-foreground">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3" />
              Created
            </div>
            <div>{formatDate(transaction.created_at, true)}</div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3" />
              Last Updated
            </div>
            <div>{formatDate(transaction.updated_at, true)}</div>
          </div>
        </div>

        {/* Actions */}
        {isPending && (onApprove || onReject || onEdit) && (
          <div className="flex items-center justify-center pt-4 border-t">
            <ApprovalActions
              transaction={transaction}
              onApprove={onApprove}
              onReject={onReject}
              onEdit={onEdit}
              isLoading={isLoading}
              size="default"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
} 