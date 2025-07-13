// Database types for the Personal Finance Management App
// These types mirror the database schema with proper TypeScript definitions

export type TransactionStatus = 'pending' | 'approved';

export interface DatabaseTransaction {
  id: string;
  user_id: string;
  amount: number;
  description: string;
  identifier?: string;
  date: string; // ISO timestamp
  source?: string;
  status: TransactionStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseLabel {
  id: string;
  user_id: string;
  name: string;
  recurring: boolean;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseTransactionLabel {
  transaction_id: string;
  label_id: string;
  created_at: string;
}

export interface DatabaseRule {
  id: string;
  user_id: string;
  name: string;
  conditions: RuleCondition[];
  labels_to_apply: string[];
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Rule condition types
export interface RuleCondition {
  field: 'description' | 'amount' | 'identifier' | 'date' | 'source';
  operator: 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than' | 'between';
  value: string | number | [number, number]; // array for 'between' operator
}

// Client-side types (with computed properties)
export interface Transaction extends Omit<DatabaseTransaction, 'date' | 'created_at' | 'updated_at'> {
  date: Date;
  created_at: Date;
  updated_at: Date;
  labels?: Label[];
}

export interface Label extends Omit<DatabaseLabel, 'created_at' | 'updated_at'> {
  created_at: Date;
  updated_at: Date;
  transaction_count?: number;
}

export interface Rule extends Omit<DatabaseRule, 'created_at' | 'updated_at'> {
  created_at: Date;
  updated_at: Date;
  labels?: Label[];
}

// Form types for creating/updating records
export interface CreateTransactionInput {
  amount: number;
  description: string;
  identifier?: string;
  date: Date;
  source?: string;
  status?: TransactionStatus;
  notes?: string;
}

export interface UpdateTransactionInput {
  amount?: number;
  description?: string;
  identifier?: string;
  date?: Date;
  source?: string;
  status?: TransactionStatus;
  notes?: string;
}

export interface CreateLabelInput {
  name: string;
  recurring?: boolean;
  color?: string;
}

export interface UpdateLabelInput {
  name?: string;
  recurring?: boolean;
  color?: string;
}

export interface CreateRuleInput {
  name: string;
  conditions: RuleCondition[];
  labels_to_apply: string[];
  order_index?: number;
  is_active?: boolean;
}

export interface UpdateRuleInput {
  name?: string;
  conditions?: RuleCondition[];
  labels_to_apply?: string[];
  order_index?: number;
  is_active?: boolean;
}

// Transaction with labels (for display)
export interface TransactionWithLabels extends Transaction {
  labels: Label[];
  isSplitParent?: boolean;
  isSplit?: boolean;
  splitParentId?: string;
  splitIndex?: number;
  splits?: TransactionSplit[];
}

// Query types for filtering/searching
export interface TransactionFilters {
  status?: TransactionStatus;
  labels?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
}

export interface LabelFilters {
  recurring?: boolean;
  search?: string;
}

// Dashboard/reporting types
export interface TransactionSummary {
  total_income: number;
  total_expenses: number;
  net_amount: number;
  transaction_count: number;
  pending_count: number;
  approved_count: number;
}

export interface LabelSummary {
  label_id: string;
  label_name: string;
  label_color: string;
  total_amount: number;
  transaction_count: number;
}

export interface MonthlySummary {
  year: number;
  month: number;
  total_income: number;
  total_expenses: number;
  net_amount: number;
  transaction_count: number;
  top_labels: LabelSummary[];
}

// API response types
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Supabase specific types
export interface SupabaseTransactionRow {
  id: string;
  user_id: string;
  amount: string; // Supabase returns numeric as string
  description: string;
  identifier: string | null;
  date: string;
  source: string | null;
  status: TransactionStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupabaseLabelRow {
  id: string;
  user_id: string;
  name: string;
  recurring: boolean;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface SupabaseRuleRow {
  id: string;
  user_id: string;
  name: string;
  conditions: RuleCondition[];
  labels_to_apply: string[];
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Utility type for transforming Supabase rows to client types
export type SupabaseToClient<T> = T extends SupabaseTransactionRow 
  ? Transaction 
  : T extends SupabaseLabelRow 
  ? Label 
  : T extends SupabaseRuleRow 
  ? Rule 
  : never;

// Database table names as constants
export const DATABASE_TABLES = {
  TRANSACTIONS: 'transactions',
  LABELS: 'labels',
  TRANSACTION_LABELS: 'transaction_labels',
  RULES: 'rules',
} as const;

export type DatabaseTable = typeof DATABASE_TABLES[keyof typeof DATABASE_TABLES];

// Split transaction types
export interface SplitTransactionData {
  amount: number;
  description: string;
  labels: string[]; // label IDs
  notes?: string;
}

export interface SplitTransactionRequest {
  originalTransactionId: string;
  splits: SplitTransactionData[];
}

export interface TransactionSplit {
  id: string;
  amount: number;
  description: string;
  labels: Label[];
  notes?: string;
}

export interface SplitTransaction extends Transaction {
  isSplitParent: boolean;
  isSplit: boolean;
  splitParentId?: string;
  splitIndex?: number;
  splits?: TransactionSplit[];
} 