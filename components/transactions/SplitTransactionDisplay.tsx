'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { TransactionWithLabels } from '@/types/database';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Scissors, ArrowRight } from 'lucide-react';

interface SplitTransactionDisplayProps {
  parentTransaction: TransactionWithLabels;
  splitTransactions: TransactionWithLabels[];
  showCompact?: boolean;
}

export function SplitTransactionDisplay({ 
  parentTransaction, 
  splitTransactions, 
  showCompact = false 
}: SplitTransactionDisplayProps) {
  const totalSplitAmount = splitTransactions.reduce((sum, split) => sum + Math.abs(split.amount), 0);
  const originalAmount = Math.abs(parentTransaction.amount);

  if (showCompact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Scissors className="h-4 w-4" />
          <span>Split into {splitTransactions.length} parts</span>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {splitTransactions.map((split, index) => (
            <div
              key={split.id}
              className="flex items-center justify-between p-2 bg-gray-50 rounded-md text-sm"
            >
              <div className="flex items-center gap-2">
                <span className="text-gray-500">#{index + 1}</span>
                <span className="font-medium">{split.description}</span>
                {split.labels && split.labels.length > 0 && (
                  <div className="flex gap-1">
                    {split.labels.slice(0, 2).map(label => (
                      <Badge
                        key={label.id}
                        style={{ backgroundColor: label.color, color: 'white' }}
                        className="text-xs"
                      >
                        {label.name}
                      </Badge>
                    ))}
                    {split.labels.length > 2 && (
                      <Badge variant="secondary" className="text-xs">
                        +{split.labels.length - 2}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
              <div className={`font-medium ${
                split.amount >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(Math.abs(split.amount))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Scissors className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-lg">Split Transaction</h3>
          </div>
          <div className="text-sm text-gray-500">
            {formatDate(parentTransaction.date)}
          </div>
        </div>

        {/* Original Transaction Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-blue-900">Original Transaction</div>
              <div className="text-blue-700 text-sm">{parentTransaction.description}</div>
              {parentTransaction.source && (
                <div className="text-blue-600 text-xs mt-1">
                  Source: {parentTransaction.source}
                </div>
              )}
            </div>
            <div className="text-right">
              <div className={`font-semibold text-lg ${
                parentTransaction.amount >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(originalAmount)}
              </div>
              <Badge 
                variant={parentTransaction.status === 'approved' ? 'default' : 'secondary'}
                className="text-xs"
              >
                {parentTransaction.status}
              </Badge>
            </div>
          </div>
        </div>

        {/* Arrow */}
        <div className="flex justify-center mb-4">
          <div className="flex items-center gap-2 text-gray-500">
            <div className="h-px bg-gray-300 w-8" />
            <ArrowRight className="h-4 w-4" />
            <div className="h-px bg-gray-300 w-8" />
          </div>
        </div>

        {/* Split Transactions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Split Transactions ({splitTransactions.length})</h4>
            <div className="text-sm text-gray-600">
              Total: {formatCurrency(totalSplitAmount)}
              {Math.abs(totalSplitAmount - originalAmount) > 0.01 && (
                <span className="text-red-500 ml-2">
                  (Difference: {formatCurrency(Math.abs(totalSplitAmount - originalAmount))})
                </span>
              )}
            </div>
          </div>

          {splitTransactions.map((split, index) => (
            <Card key={split.id} className="border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-gray-500">
                        Split #{index + 1}
                      </span>
                      <Badge 
                        variant={split.status === 'approved' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {split.status}
                      </Badge>
                    </div>
                    
                    <div className="font-medium mb-2">{split.description}</div>
                    
                    {split.labels && split.labels.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {split.labels.map(label => (
                          <Badge
                            key={label.id}
                            style={{ backgroundColor: label.color, color: 'white' }}
                            className="text-xs"
                          >
                            {label.name}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {split.notes && (
                      <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded mt-2">
                        {split.notes}
                      </div>
                    )}

                    {split.source && split.source !== parentTransaction.source && (
                      <div className="text-xs text-gray-500 mt-1">
                        Source: {split.source}
                      </div>
                    )}
                  </div>

                  <div className="text-right ml-4">
                    <div className={`font-semibold text-lg ${
                      split.amount >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(Math.abs(split.amount))}
                    </div>
                    
                    {split.identifier && (
                      <div className="text-xs text-gray-400 mt-1">
                        ID: {split.identifier.split('_').pop()}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Summary */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">
              Split on {formatDate(parentTransaction.updated_at)}
            </span>
            <span className={`font-medium ${
              Math.abs(totalSplitAmount - originalAmount) < 0.01 
                ? 'text-green-600' 
                : 'text-red-500'
            }`}>
              {Math.abs(totalSplitAmount - originalAmount) < 0.01 
                ? 'Split amounts match original' 
                : 'Split amounts don\'t match original'
              }
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 