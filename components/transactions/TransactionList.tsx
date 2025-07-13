'use client';

import { TransactionWithLabels, TransactionFilters } from '@/types/database';
import { TransactionCard } from './TransactionCard';
import { AdvancedFilterPanel } from './AdvancedFilterPanel';
import { TransactionPagination, PaginationSettings } from './TransactionPagination';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState, useMemo } from 'react';
import { formatCurrency } from '@/lib/utils';
import { Filter, SortAsc, SortDesc, RefreshCw, Settings } from 'lucide-react';
import { useFilters } from '@/context/filters';

export interface TransactionListProps {
  transactions: TransactionWithLabels[];
  onApprove?: (id: string) => Promise<void>;
  onReject?: (id: string) => Promise<void>;
  onEdit?: (transaction: TransactionWithLabels) => void;
  onViewDetails?: (transaction: TransactionWithLabels) => void;
  onRefresh?: () => Promise<void>;
  isLoading?: boolean;
  showSummary?: boolean;
  className?: string;
  // Pagination props
  currentPage?: number;
  onPageChange?: (page: number) => void;
  totalItems?: number;
  paginationSettings?: PaginationSettings;
  onPaginationSettingsChange?: (settings: PaginationSettings) => void;
  hasNextPage?: boolean;
  onLoadMore?: () => void;
}

type SortField = 'date' | 'amount' | 'description' | 'status';
type SortDirection = 'asc' | 'desc';

export function TransactionList({
  transactions,
  onApprove,
  onReject,
  onEdit,
  onViewDetails,
  onRefresh,
  isLoading = false,
  showSummary = true,
  className,
  currentPage = 1,
  onPageChange,
  totalItems,
  paginationSettings = { pageSize: 25, mode: 'traditional' },
  onPaginationSettingsChange,
  hasNextPage = false,
  onLoadMore,
}: TransactionListProps) {
  const {
    activeFilters,
    showAdvancedFilters,
    setShowAdvancedFilters,
  } = useFilters();

  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Filter and sort transactions
  const filteredAndSortedTransactions = useMemo(() => {
    let filtered = [...transactions];

    // Apply filters
    if (activeFilters.status) {
      filtered = filtered.filter(t => t.status === activeFilters.status);
    }
    if (activeFilters.search) {
      const searchLower = activeFilters.search.toLowerCase();
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(searchLower) ||
        (t.identifier && t.identifier.toLowerCase().includes(searchLower)) ||
        (t.source && t.source.toLowerCase().includes(searchLower))
      );
    }
    if (activeFilters.labels && activeFilters.labels.length > 0) {
      filtered = filtered.filter(t => 
        t.labels && t.labels.some(label => 
          activeFilters.labels!.includes(label.id)
        )
      );
    }
    if (activeFilters.minAmount !== undefined) {
      filtered = filtered.filter(t => Math.abs(t.amount) >= activeFilters.minAmount!);
    }
    if (activeFilters.maxAmount !== undefined) {
      filtered = filtered.filter(t => Math.abs(t.amount) <= activeFilters.maxAmount!);
    }
    if (activeFilters.dateFrom) {
      filtered = filtered.filter(t => new Date(t.date) >= activeFilters.dateFrom!);
    }
    if (activeFilters.dateTo) {
      filtered = filtered.filter(t => new Date(t.date) <= activeFilters.dateTo!);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'date':
          aValue = new Date(a.date).getTime();
          bValue = new Date(b.date).getTime();
          break;
        case 'amount':
          aValue = Math.abs(a.amount);
          bValue = Math.abs(b.amount);
          break;
        case 'description':
          aValue = a.description.toLowerCase();
          bValue = b.description.toLowerCase();
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          aValue = a.date;
          bValue = b.date;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [transactions, activeFilters, sortField, sortDirection]);

  // Calculate summary for currently visible transactions
  const summary = useMemo(() => {
    const total = filteredAndSortedTransactions.length;
    const pending = filteredAndSortedTransactions.filter(t => t.status === 'pending').length;
    const approved = filteredAndSortedTransactions.filter(t => t.status === 'approved').length;
    const totalAmount = filteredAndSortedTransactions.reduce((sum, t) => sum + t.amount, 0);
    const income = filteredAndSortedTransactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
    const expenses = filteredAndSortedTransactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);

    return { total, pending, approved, totalAmount, income, expenses };
  }, [filteredAndSortedTransactions]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />;
  };

  const handlePageSizeChange = (size: number) => {
    if (onPaginationSettingsChange) {
      onPaginationSettingsChange({
        ...paginationSettings,
        pageSize: size
      });
    }
  };

  const handleModeChange = (mode: 'traditional' | 'infinite') => {
    if (onPaginationSettingsChange) {
      onPaginationSettingsChange({
        ...paginationSettings,
        mode
      });
    }
  };

  // Count active filters for display
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

  const activeFilterCount = getActiveFilterCount();

  if (transactions.length === 0 && !isLoading) {
    return (
      <div className={className}>
        <div className="text-center py-12">
          <p className="text-muted-foreground">No transactions found.</p>
          {onRefresh && (
            <Button variant="outline" onClick={onRefresh} className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header with summary and controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-semibold">Transactions</h2>
          {showSummary && (
            <div className="flex items-center gap-2">
              <Badge variant="outline">{summary.total} total</Badge>
              {summary.pending > 0 && (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  {summary.pending} pending
                </Badge>
              )}
              {summary.approved > 0 && (
                <Badge variant="default">{summary.approved} approved</Badge>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          )}
        </div>
      </div>

      {/* Advanced Filter Panel */}
      {showAdvancedFilters && (
        <div className="mb-6">
          <AdvancedFilterPanel onClose={() => setShowAdvancedFilters(false)} />
        </div>
      )}

      {/* Summary cards */}
      {showSummary && summary.total > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-sm text-green-600 font-medium">Income</div>
            <div className="text-xl font-bold text-green-700">
              +{formatCurrency(summary.income)}
            </div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-sm text-red-600 font-medium">Expenses</div>
            <div className="text-xl font-bold text-red-700">
              -{formatCurrency(summary.expenses)}
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm text-blue-600 font-medium">Net</div>
            <div className={`text-xl font-bold ${summary.totalAmount >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {summary.totalAmount >= 0 ? '+' : ''}{formatCurrency(summary.totalAmount)}
            </div>
          </div>
        </div>
      )}

      {/* Sort controls */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-muted-foreground">Sort by:</span>
        {(['date', 'amount', 'description', 'status'] as SortField[]).map((field) => (
          <Button
            key={field}
            variant={sortField === field ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSort(field)}
            className="capitalize"
          >
            {field}
            {getSortIcon(field)}
          </Button>
        ))}
      </div>

      {/* Transactions list */}
      {isLoading && filteredAndSortedTransactions.length === 0 ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-32 bg-gray-200 rounded-lg"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAndSortedTransactions.map((transaction) => (
            <TransactionCard
              key={transaction.id}
              transaction={transaction}
              onApprove={onApprove}
              onReject={onReject}
              onEdit={onEdit}
              onViewDetails={onViewDetails}
              isLoading={isLoading}
            />
          ))}
        </div>
      )}

      {/* No results message */}
      {filteredAndSortedTransactions.length === 0 && !isLoading && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            {activeFilterCount > 0 
              ? "No transactions match the current filters." 
              : "No transactions found."
            }
          </p>
          {activeFilterCount > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowAdvancedFilters(true)}
              className="mt-2"
            >
              Adjust Filters
            </Button>
          )}
        </div>
      )}

      {/* Pagination */}
      {(totalItems !== undefined && onPageChange && onPaginationSettingsChange) && (
        <div className="mt-6">
          <TransactionPagination
            totalItems={totalItems}
            currentPage={currentPage}
            pageSize={paginationSettings.pageSize}
            onPageChange={onPageChange}
            onPageSizeChange={handlePageSizeChange}
            mode={paginationSettings.mode}
            onModeChange={handleModeChange}
            isLoading={isLoading}
            hasNextPage={hasNextPage}
            onLoadMore={onLoadMore}
          />
        </div>
      )}
    </div>
  );
} 