// Database types for the Personal Finance Management App
// These types mirror the database schema with proper TypeScript definitions

export type TransactionStatus = 'pending' | 'approved';

// Currency types
export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'ILS';

export interface DatabaseTransaction {
  id: string;
  user_id: string;
  amount: number;
  original_currency: CurrencyCode;
  converted_amount: number;
  base_currency: CurrencyCode;
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

// Multi-currency support types
export interface DatabaseCurrencyRate {
  id: string;
  from_currency: CurrencyCode;
  to_currency: CurrencyCode;
  rate: number;
  last_updated: string; // ISO timestamp
}

export interface DatabaseUserPreferences {
  id: string;
  user_id: string;
  default_currency: CurrencyCode;
  show_converted: boolean;
  created_at: string;
  updated_at: string;
}

// Rule condition types
export interface RuleCondition {
  field: 'description' | 'amount' | 'identifier' | 'date' | 'source' | 'original_currency';
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

export interface CurrencyRate extends Omit<DatabaseCurrencyRate, 'last_updated'> {
  last_updated: Date;
}

export interface UserPreferences extends Omit<DatabaseUserPreferences, 'created_at' | 'updated_at'> {
  created_at: Date;
  updated_at: Date;
}

// Form types for creating/updating records
export interface CreateTransactionInput {
  amount: number;
  original_currency?: CurrencyCode;
  base_currency?: CurrencyCode;
  description: string;
  identifier?: string;
  date: Date;
  source?: string;
  status?: TransactionStatus;
  notes?: string;
}

export interface UpdateTransactionInput {
  amount?: number;
  original_currency?: CurrencyCode;
  base_currency?: CurrencyCode;
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

export interface CreateCurrencyRateInput {
  from_currency: CurrencyCode;
  to_currency: CurrencyCode;
  rate: number;
  last_updated?: Date;
}

export interface UpdateCurrencyRateInput {
  rate?: number;
  last_updated?: Date;
}

export interface CreateUserPreferencesInput {
  default_currency: CurrencyCode;
  show_converted?: boolean;
}

export interface UpdateUserPreferencesInput {
  default_currency?: CurrencyCode;
  show_converted?: boolean;
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
  original_currency?: CurrencyCode;
  base_currency?: CurrencyCode;
}

export interface LabelFilters {
  recurring?: boolean;
  search?: string;
}

// Dashboard/reporting types with multi-currency support
export interface TransactionSummary {
  total_income: number;
  total_expenses: number;
  net_amount: number;
  transaction_count: number;
  pending_count: number;
  approved_count: number;
  currency: CurrencyCode;
}

export interface LabelSummary {
  label_id: string;
  label_name: string;
  label_color: string;
  total_amount: number;
  transaction_count: number;
  currency: CurrencyCode;
}

export interface MonthlySummary {
  year: number;
  month: number;
  total_income: number;
  total_expenses: number;
  net_amount: number;
  transaction_count: number;
  top_labels: LabelSummary[];
  currency: CurrencyCode;
}

// Multi-currency summary types
export interface MultiCurrencySummary {
  summaries: TransactionSummary[];
  base_currency: CurrencyCode;
  converted_summary: TransactionSummary;
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
  original_currency: CurrencyCode;
  converted_amount: string; // Supabase returns numeric as string
  base_currency: CurrencyCode;
  description: string;
  identifier: string | null;
  date: string;
  source: string | null;
  status: TransactionStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupabaseCurrencyRateRow {
  id: string;
  from_currency: CurrencyCode;
  to_currency: CurrencyCode;
  rate: string; // Supabase returns numeric as string
  last_updated: string;
}

export interface SupabaseUserPreferencesRow {
  id: string;
  user_id: string;
  default_currency: CurrencyCode;
  show_converted: boolean;
  created_at: string;
  updated_at: string;
}

// Rule Performance Monitoring types
export interface RulePerformance {
  id: string;
  user_id: string;
  rule_id: string;
  total_executions: number;
  total_matches: number;
  total_labels_applied: number;
  avg_execution_time_ms: number;
  last_execution_at: Date | null;
  executions_today: number;
  executions_this_week: number;
  executions_this_month: number;
  matches_today: number;
  matches_this_week: number;
  matches_this_month: number;
  match_rate: number;
  created_at: Date;
  updated_at: Date;
}

export interface RuleExecutionLog {
  id: string;
  user_id: string;
  rule_id: string;
  transaction_id: string;
  matched: boolean;
  execution_time_ms: number;
  labels_applied: string[];
  rule_conditions: any;
  transaction_data: any;
  executed_at: Date;
}

export interface RulePerformanceWithRule extends RulePerformance {
  rule: Rule;
}

export interface RulePerformanceStats {
  totalExecutions: number;
  totalMatches: number;
  totalLabelsApplied: number;
  averageMatchRate: number;
  mostActiveRule: RulePerformanceWithRule | null;
  mostEffectiveRule: RulePerformanceWithRule | null;
  executionsToday: number;
  matchesToday: number;
  recentActivity: RuleExecutionLog[];
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
  : T extends SupabaseCurrencyRateRow
  ? CurrencyRate
  : T extends SupabaseUserPreferencesRow
  ? UserPreferences
  : never;

// Database table names as constants
export const DATABASE_TABLES = {
  TRANSACTIONS: 'transactions',
  LABELS: 'labels',
  TRANSACTION_LABELS: 'transaction_labels',
  RULES: 'rules',
  CURRENCY_RATES: 'currency_rates',
  USER_PREFERENCES: 'user_preferences',
} as const;

export type DatabaseTable = typeof DATABASE_TABLES[keyof typeof DATABASE_TABLES];

// Split transaction types
export interface SplitTransactionData {
  amount: number;
  description: string;
  labels: string[]; // label IDs
  notes?: string;
  original_currency?: CurrencyCode;
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
  original_currency: CurrencyCode;
  converted_amount: number;
}

export interface SplitTransaction extends Transaction {
  isSplitParent: boolean;
  isSplit: boolean;
  splitParentId?: string;
  splitIndex?: number;
  splits?: TransactionSplit[];
}

// Currency utility types
export interface CurrencyInfo {
  code: CurrencyCode;
  symbol: string;
  name: string;
  format: (amount: number) => string;
}

export interface CurrencyConversion {
  from: CurrencyCode;
  to: CurrencyCode;
  rate: number;
  amount: number;
  converted_amount: number;
  last_updated: Date;
}

// Currency formatting options
export const CURRENCY_INFO: Record<CurrencyCode, CurrencyInfo> = {
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    format: (amount: number) => `$${amount.toFixed(2)}`,
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    format: (amount: number) => `€${amount.toFixed(2)}`,
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    format: (amount: number) => `£${amount.toFixed(2)}`,
  },
  ILS: {
    code: 'ILS',
    symbol: '₪',
    name: 'Israeli New Shekel',
    format: (amount: number) => `₪${amount.toFixed(2)}`,
  },
} as const; 