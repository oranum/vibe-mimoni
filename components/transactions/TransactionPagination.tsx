'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  MoreHorizontal,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PaginationSettings {
  pageSize: number;
  mode: 'traditional' | 'infinite';
}

interface TransactionPaginationProps {
  totalItems: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  mode: 'traditional' | 'infinite';
  onModeChange: (mode: 'traditional' | 'infinite') => void;
  isLoading?: boolean;
  hasNextPage?: boolean;
  onLoadMore?: () => void;
  className?: string;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export function TransactionPagination({
  totalItems,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
  mode,
  onModeChange,
  isLoading = false,
  hasNextPage = false,
  onLoadMore,
  className,
}: TransactionPaginationProps) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const totalPages = Math.ceil(totalItems / pageSize);
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Infinite scroll intersection observer
  useEffect(() => {
    if (mode !== 'infinite' || !loadMoreRef.current || !onLoadMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setIsIntersecting(entry.isIntersecting);
        
        if (entry.isIntersecting && hasNextPage && !isLoading) {
          onLoadMore();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
      }
    );

    observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [mode, hasNextPage, isLoading, onLoadMore]);

  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    const delta = 2; // Number of pages to show around current page

    if (totalPages <= 7) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      // Add ellipsis if needed
      if (currentPage - delta > 2) {
        pages.push('ellipsis');
      }

      // Add pages around current page
      const start = Math.max(2, currentPage - delta);
      const end = Math.min(totalPages - 1, currentPage + delta);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      // Add ellipsis if needed
      if (currentPage + delta < totalPages - 1) {
        pages.push('ellipsis');
      }

      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  if (totalItems === 0) return null;

  if (mode === 'infinite') {
    return (
      <div className={cn("space-y-4", className)}>
        {/* Mode toggle and page size selector */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground">
              Showing {totalItems} items
            </span>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Per page:</span>
              <div className="flex gap-1">
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <Button
                    key={size}
                    variant={pageSize === size ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onPageSizeChange(size)}
                    className="h-7 px-2"
                  >
                    {size}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onModeChange('traditional')}
          >
            Switch to Traditional
          </Button>
        </div>

        {/* Infinite scroll trigger */}
        {hasNextPage && (
          <div ref={loadMoreRef} className="flex justify-center py-4">
            {isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading more...
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={onLoadMore}
                disabled={isLoading}
              >
                Load More
              </Button>
            )}
          </div>
        )}

        {!hasNextPage && totalItems > pageSize && (
          <div className="text-center py-4 text-muted-foreground text-sm">
            All items loaded
          </div>
        )}
      </div>
    );
  }

  // Traditional pagination
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>
          Showing {startItem}-{endItem} of {totalItems} items
        </span>
        <div className="flex items-center gap-2">
          <span>Per page:</span>
          <div className="flex gap-1">
            {PAGE_SIZE_OPTIONS.map((size) => (
              <Button
                key={size}
                variant={pageSize === size ? 'default' : 'outline'}
                size="sm"
                onClick={() => onPageSizeChange(size)}
                className="h-7 px-2"
              >
                {size}
              </Button>
            ))}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onModeChange('infinite')}
        >
          Switch to Infinite Scroll
        </Button>
      </div>

      <div className="flex items-center gap-1">
        {/* First page */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1 || isLoading}
          className="h-8 w-8 p-0"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>

        {/* Previous page */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1 || isLoading}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Page numbers */}
        {getPageNumbers().map((page, index) => (
          <React.Fragment key={index}>
            {page === 'ellipsis' ? (
              <Button
                variant="ghost"
                size="sm"
                disabled
                className="h-8 w-8 p-0"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant={currentPage === page ? 'default' : 'outline'}
                size="sm"
                onClick={() => onPageChange(page)}
                disabled={isLoading}
                className="h-8 w-8 p-0"
              >
                {page}
              </Button>
            )}
          </React.Fragment>
        ))}

        {/* Next page */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || isLoading}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* Last page */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages || isLoading}
          className="h-8 w-8 p-0"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
} 