'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/auth';
import { AuthRequired } from '@/components/auth/AuthRequired';
import { FilterProvider, useFilters } from '@/context/filters';
import { TransactionList, EditTransactionForm, LabelSelector, TransactionNotes, SplitTransactionForm, PaginationSettings } from '@/components/transactions';
import { TransactionWithLabels, TransactionFilters, Transaction, Label } from '@/types/database';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { X, Play } from 'lucide-react';
import { applyRulesToTransaction, applyRulesToTransactions } from '@/lib/rules-engine';

export default function InboxPage() {
  return (
    <AuthRequired>
      <FilterProvider initialFilters={{ status: 'pending' }}>
        <InboxContent />
      </FilterProvider>
    </AuthRequired>
  );
}

function InboxContent() {
  const { user } = useAuth();
  const { activeFilters } = useFilters();
  const [transactions, setTransactions] = useState<TransactionWithLabels[]>([]);
  const [allTransactions, setAllTransactions] = useState<TransactionWithLabels[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [paginationSettings, setPaginationSettings] = useState<PaginationSettings>({
    pageSize: 25,
    mode: 'traditional'
  });

  // Edit modal state
  const [editingTransaction, setEditingTransaction] = useState<TransactionWithLabels | null>(null);
  const [editMode, setEditMode] = useState<'details' | 'labels' | 'notes' | 'split'>('details');

  const supabase = createClient();

  // Fetch transactions from Supabase
  const fetchTransactions = useCallback(async (customFilters?: TransactionFilters) => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      const appliedFilters = customFilters || activeFilters;
      
      // Build the query
      let query = supabase
        .from('transactions')
        .select(`
          *,
          transaction_labels (
            labels (
              id,
              name,
              color,
              recurring
            )
          )
        `)
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      // Apply filters
      if (appliedFilters.status) {
        query = query.eq('status', appliedFilters.status);
      }

      if (appliedFilters.dateFrom) {
        query = query.gte('date', appliedFilters.dateFrom.toISOString());
      }

      if (appliedFilters.dateTo) {
        query = query.lte('date', appliedFilters.dateTo.toISOString());
      }

      if (appliedFilters.minAmount !== undefined) {
        query = query.gte('amount', appliedFilters.minAmount);
      }

      if (appliedFilters.maxAmount !== undefined) {
        query = query.lte('amount', appliedFilters.maxAmount);
      }

      if (appliedFilters.search) {
        query = query.or(`description.ilike.%${appliedFilters.search}%,identifier.ilike.%${appliedFilters.search}%,source.ilike.%${appliedFilters.search}%`);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      // Transform the data to match our TransactionWithLabels interface
      const transformedTransactions: TransactionWithLabels[] = (data || []).map(transaction => ({
        id: transaction.id,
        user_id: transaction.user_id,
        amount: parseFloat(transaction.amount),
        original_currency: transaction.original_currency || 'ILS',
        converted_amount: transaction.converted_amount ? parseFloat(transaction.converted_amount) : parseFloat(transaction.amount),
        base_currency: transaction.base_currency || 'ILS',
        description: transaction.description,
        identifier: transaction.identifier,
        date: new Date(transaction.date),
        source: transaction.source,
        status: transaction.status,
        notes: transaction.notes,
        created_at: new Date(transaction.created_at),
        updated_at: new Date(transaction.updated_at),
        labels: transaction.transaction_labels?.map((tl: any) => ({
          id: tl.labels.id,
          name: tl.labels.name,
          color: tl.labels.color,
          recurring: tl.labels.recurring,
          user_id: user.id,
          created_at: new Date(),
          updated_at: new Date()
        })) || []
      }));

      setTransactions(transformedTransactions);
      setAllTransactions(transformedTransactions);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
      toast.error('Failed to load transactions');
    } finally {
      setIsLoading(false);
    }
  }, [user, activeFilters, supabase]);

  // Alternative fetch function for transactions without labels (fallback)
  const fetchTransactionsSimple = useCallback(async (customFilters?: TransactionFilters) => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      const appliedFilters = customFilters || activeFilters;
      
      let query = supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      // Apply filters (same as above but simpler)
      if (appliedFilters.status) {
        query = query.eq('status', appliedFilters.status);
      }

      if (appliedFilters.dateFrom) {
        query = query.gte('date', appliedFilters.dateFrom.toISOString());
      }

      if (appliedFilters.dateTo) {
        query = query.lte('date', appliedFilters.dateTo.toISOString());
      }

      if (appliedFilters.search) {
        query = query.or(`description.ilike.%${appliedFilters.search}%,identifier.ilike.%${appliedFilters.search}%,source.ilike.%${appliedFilters.search}%`);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      // Transform the data to match our TransactionWithLabels interface
      const transformedTransactions: TransactionWithLabels[] = (data || []).map(transaction => ({
        id: transaction.id,
        user_id: transaction.user_id,
        amount: parseFloat(transaction.amount),
        original_currency: transaction.original_currency || 'ILS',
        converted_amount: transaction.converted_amount ? parseFloat(transaction.converted_amount) : parseFloat(transaction.amount),
        base_currency: transaction.base_currency || 'ILS',
        description: transaction.description,
        identifier: transaction.identifier,
        date: new Date(transaction.date),
        source: transaction.source,
        status: transaction.status,
        notes: transaction.notes,
        created_at: new Date(transaction.created_at),
        updated_at: new Date(transaction.updated_at),
        labels: [] // No labels in simple fetch
      }));

      setTransactions(transformedTransactions);
      setAllTransactions(transformedTransactions);
    } catch (err) {
      console.error('Error fetching transactions (simple):', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
      toast.error('Failed to load transactions');
    } finally {
      setIsLoading(false);
    }
  }, [user, activeFilters, supabase]);

  // Approve transaction function
  const handleApprove = useCallback(async (id: string) => {
    if (!user) return;

    try {
      // Optimistic update
      setTransactions(prev => 
        prev.map(t => 
          t.id === id 
            ? { ...t, status: 'approved' as const, updated_at: new Date() }
            : t
        )
      );

      const { error } = await supabase
        .from('transactions')
        .update({ 
          status: 'approved',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      toast.success('Transaction approved successfully');
      
      // Refresh the transactions list
      await fetchTransactionsSimple();
    } catch (err) {
      console.error('Error approving transaction:', err);
      toast.error('Failed to approve transaction');
      
      // Revert optimistic update
      setTransactions(prev => 
        prev.map(t => 
          t.id === id 
            ? { ...t, status: 'pending' as const }
            : t
        )
      );
    }
  }, [user, supabase, fetchTransactionsSimple]);

  // Reject transaction function (sets status to 'cancelled')
  const handleReject = useCallback(async (id: string) => {
    if (!user) return;

    try {
      // Optimistic update - remove from list since we're filtering by 'pending'
      setTransactions(prev => prev.filter(t => t.id !== id));

      const { error } = await supabase
        .from('transactions')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      toast.success('Transaction rejected');
    } catch (err) {
      console.error('Error rejecting transaction:', err);
      toast.error('Failed to reject transaction');
      
      // Refresh the transactions list to revert changes
      await fetchTransactionsSimple();
    }
  }, [user, supabase, fetchTransactionsSimple]);

  // Handle edit transaction
  const handleEdit = useCallback((transaction: TransactionWithLabels) => {
    setEditingTransaction(transaction);
    setEditMode('details');
  }, []);

  // Handle transaction update from edit form
  const handleTransactionUpdate = useCallback((updatedTransaction: Transaction) => {
    setTransactions(prev => 
      prev.map(t => 
        t.id === updatedTransaction.id 
          ? { ...t, ...updatedTransaction }
          : t
      )
    );
    setEditingTransaction(null);
  }, []);

  // Handle labels update
  const handleLabelsUpdate = useCallback((labels: Label[]) => {
    if (!editingTransaction) return;
    
    const updatedTransaction = {
      ...editingTransaction,
      labels
    };
    
    setEditingTransaction(updatedTransaction);
    setTransactions(prev => 
      prev.map(t => 
        t.id === editingTransaction.id 
          ? updatedTransaction
          : t
      )
    );
  }, [editingTransaction]);

  // Handle notes update
  const handleNotesUpdate = useCallback((notes: string) => {
    if (!editingTransaction) return;
    
    const updatedTransaction = {
      ...editingTransaction,
      notes
    };
    
    setEditingTransaction(updatedTransaction);
    setTransactions(prev => 
      prev.map(t => 
        t.id === editingTransaction.id 
          ? updatedTransaction
          : t
      )
    );
  }, [editingTransaction]);

  // Handle split transaction save
  const handleSplitSave = useCallback(() => {
    // Refresh the transactions to show the split transactions
    fetchTransactionsSimple();
    setEditingTransaction(null);
    setEditMode('details');
  }, [fetchTransactionsSimple]);

  // Close edit modal
  const closeEditModal = useCallback(() => {
    setEditingTransaction(null);
    setEditMode('details');
  }, []);

  // Handle view details (placeholder for now)
  const handleViewDetails = useCallback((transaction: TransactionWithLabels) => {
    // TODO: Open details modal
    console.log('View details:', transaction);
    toast.info('Details view coming soon!');
  }, []);

  // Handle manual rule application to all pending transactions
  const handleApplyRules = useCallback(async () => {
    if (!user) return;

    try {
      // Show loading toast
      const loadingToast = toast.loading('Applying rules to pending transactions...');
      
      // Filter for pending transactions only
      const pendingTransactions = transactions.filter(t => t.status === 'pending');
      
      if (pendingTransactions.length === 0) {
        toast.dismiss(loadingToast);
        toast.info('No pending transactions to apply rules to');
        return;
      }

      // Apply rules to all pending transactions
      const { totalProcessed, rulesApplied, labelsApplied } = await applyRulesToTransactions(pendingTransactions);
      
      // Calculate statistics
      const totalRulesApplied = Object.values(rulesApplied).reduce((sum, rules) => sum + rules.length, 0);
      const totalLabelsApplied = Object.values(labelsApplied).reduce((sum, labels) => sum + labels.length, 0);
      const transactionsAffected = Object.keys(rulesApplied).length;
      
      // Dismiss loading toast
      toast.dismiss(loadingToast);
      
      // Show success toast with statistics
      if (totalRulesApplied > 0) {
        toast.success(`Rules applied successfully! ${totalRulesApplied} rule${totalRulesApplied !== 1 ? 's' : ''} applied to ${transactionsAffected} transaction${transactionsAffected !== 1 ? 's' : ''}, ${totalLabelsApplied} label${totalLabelsApplied !== 1 ? 's' : ''} assigned`);
      } else {
        toast.info('No rules matched the pending transactions');
      }
      
      // Refresh the transaction list to show applied labels
      await fetchTransactionsSimple();
      
    } catch (error) {
      console.error('Error applying rules:', error);
      toast.error('Failed to apply rules to transactions');
    }
  }, [user, transactions, fetchTransactionsSimple]);



  // Setup real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('transactions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          console.log('Real-time update:', payload);
          
          // Handle new transactions with rules engine
          if (payload.eventType === 'INSERT' && payload.new) {
            const newTransaction = payload.new as Transaction;
            
            try {
              // Apply rules to the new transaction
              const { rulesApplied, labelsApplied } = await applyRulesToTransaction(newTransaction);
              
              // Show informative toast based on rules applied
              if (rulesApplied.length > 0) {
                toast.success(`New transaction detected - ${rulesApplied.length} rule${rulesApplied.length !== 1 ? 's' : ''} applied, ${labelsApplied.length} label${labelsApplied.length !== 1 ? 's' : ''} assigned`);
              } else {
                toast.info('New transaction detected');
              }
            } catch (error) {
              console.error('Error applying rules to new transaction:', error);
              toast.info('New transaction detected');
            }
          }
          
          // Refresh transactions when we get updates
          fetchTransactionsSimple();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, supabase, fetchTransactionsSimple]);

  // Initial data fetch and when filters change
  useEffect(() => {
    if (user) {
      fetchTransactionsSimple();
    }
  }, [user, fetchTransactionsSimple, activeFilters]);

  if (!user) {
    return null; // AuthRequired will handle this
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-3xl font-bold">Transaction Inbox</h1>
            <Button 
              onClick={handleApplyRules}
              disabled={isLoading || transactions.filter(t => t.status === 'pending').length === 0}
              className="flex items-center gap-2"
            >
              <Play size={16} />
              Apply Rules
            </Button>
          </div>
          <p className="text-muted-foreground">
            Review and approve your pending transactions
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="text-red-800 font-medium">Error</div>
            <div className="text-red-600 text-sm">{error}</div>
          </div>
        )}

        <TransactionList
          transactions={transactions}
          onApprove={handleApprove}
          onReject={handleReject}
          onEdit={handleEdit}
          onViewDetails={handleViewDetails}
          onRefresh={() => fetchTransactionsSimple()}
          isLoading={isLoading}
          showSummary={true}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          totalItems={allTransactions.length}
          paginationSettings={paginationSettings}
          onPaginationSettingsChange={setPaginationSettings}
          hasNextPage={false}
        />

        {/* Edit Transaction Modal */}
        {editingTransaction && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-semibold">Edit Transaction</h2>
                  <div className="flex gap-2">
                    <Button
                      variant={editMode === 'details' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setEditMode('details')}
                    >
                      Details
                    </Button>
                    <Button
                      variant={editMode === 'labels' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setEditMode('labels')}
                    >
                      Labels
                    </Button>
                    <Button
                      variant={editMode === 'notes' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setEditMode('notes')}
                    >
                      Notes
                    </Button>
                    <Button
                      variant={editMode === 'split' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setEditMode('split')}
                    >
                      Split
                    </Button>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={closeEditModal}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                {editMode === 'details' && (
                  <EditTransactionForm
                    transaction={editingTransaction}
                    onSave={handleTransactionUpdate}
                    onCancel={closeEditModal}
                  />
                )}
                
                {editMode === 'labels' && (
                  <LabelSelector
                    transaction={editingTransaction}
                    onLabelsUpdate={handleLabelsUpdate}
                  />
                )}
                
                {editMode === 'notes' && (
                  <TransactionNotes
                    transaction={editingTransaction}
                    onNotesUpdate={handleNotesUpdate}
                  />
                )}
                
                {editMode === 'split' && (
                  <SplitTransactionForm
                    transaction={editingTransaction}
                    onSave={handleSplitSave}
                    onCancel={closeEditModal}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 