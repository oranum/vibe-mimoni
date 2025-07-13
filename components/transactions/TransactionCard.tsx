'use client';

import { Transaction, TransactionWithLabels } from '@/types/database';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { ApprovalActions } from './ApprovalActions';

export interface TransactionCardProps {
  transaction: TransactionWithLabels;
  showActions?: boolean;
  onApprove?: (id: string) => Promise<void>;
  onReject?: (id: string) => Promise<void>;
  onEdit?: (transaction: TransactionWithLabels) => void;
  onViewDetails?: (transaction: TransactionWithLabels) => void;
  isLoading?: boolean;
  className?: string;
}

export function TransactionCard({
  transaction,
  showActions = true,
  onApprove,
  onReject,
  onEdit,
  onViewDetails,
  isLoading = false,
  className,
}: TransactionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const isIncome = transaction.amount > 0;
  const isPending = transaction.status === 'pending';
  
  return (
    <Card 
      className={cn(
        'transition-all duration-200 hover:shadow-md',
        isPending && 'border-yellow-200 bg-yellow-50/50',
        className
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-sm truncate">
                {transaction.description}
              </h3>
              <Badge
                variant={isPending ? 'secondary' : 'default'}
                className={cn(
                  'text-xs',
                  isPending && 'bg-yellow-100 text-yellow-800'
                )}
              >
                {transaction.status}
              </Badge>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{formatDate(transaction.date)}</span>
              {transaction.source && (
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                  {transaction.source}
                </span>
              )}
            </div>
          </div>
          
          <div className="text-right">
            <div
              className={cn(
                'font-semibold text-lg',
                isIncome ? 'text-green-600' : 'text-red-600'
              )}
            >
              {isIncome ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount))}
            </div>
            {transaction.identifier && (
              <div className="text-xs text-muted-foreground mt-1">
                ID: {transaction.identifier}
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Labels */}
        {transaction.labels && transaction.labels.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {transaction.labels.map((label) => (
              <Badge
                key={label.id}
                variant="outline"
                style={{ backgroundColor: `${label.color}20`, borderColor: label.color }}
                className="text-xs"
              >
                {label.name}
              </Badge>
            ))}
          </div>
        )}
        
        {/* Notes preview */}
        {transaction.notes && (
          <div className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {transaction.notes}
          </div>
        )}
        
        {/* Action buttons */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs"
          >
            {isExpanded ? 'Hide Details' : 'View Details'}
          </Button>
          
          {showActions && isPending && (
            <ApprovalActions
              transaction={transaction}
              onApprove={onApprove}
              onReject={onReject}
              onEdit={onEdit}
              isLoading={isLoading}
            />
          )}
        </div>
        
        {/* Expanded details */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t space-y-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Created:</span>
                <span className="ml-2 text-muted-foreground">
                  {formatDate(transaction.created_at, true)}
                </span>
              </div>
              <div>
                <span className="font-medium">Updated:</span>
                <span className="ml-2 text-muted-foreground">
                  {formatDate(transaction.updated_at, true)}
                </span>
              </div>
            </div>
            
            {transaction.notes && (
              <div>
                <span className="font-medium text-sm">Notes:</span>
                <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                  {transaction.notes}
                </p>
              </div>
            )}
            
            {onViewDetails && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewDetails(transaction)}
                className="w-full mt-3"
              >
                View Full Details
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 