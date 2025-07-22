'use client'

import { AuthRequired } from '@/components/auth/AuthRequired'
import { useAuth } from '@/context/auth'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, Check, CalendarIcon } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { TransactionWithLabels } from '@/types/database'
import { formatCurrency } from '@/lib/currency/formatting'
import { cn } from '@/lib/utils'
import { MonthPicker } from '@/components/ui/month-picker'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { he } from 'date-fns/locale'

// Date formatting utilities

interface DashboardData {
  monthlyBalance: number
  totalExpenses: number
  totalIncome: number
  pendingCount: number
  expenseTransactions: TransactionWithLabels[]
}

export default function DashboardPage() {
  return (
    <AuthRequired>
      <DashboardContent />
    </AuthRequired>
  )
}

function DashboardContent() {
  const { user } = useAuth()
  const supabase = createClient()
  
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isChangingMonth, setIsChangingMonth] = useState(false)
  
  // Calculate month boundaries
  const monthStart = useMemo(() => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    return date.toISOString().split('T')[0]
  }, [currentDate])
  
  const monthEnd = useMemo(() => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
    return date.toISOString().split('T')[0]
  }, [currentDate])
  
  // Format current month in Hebrew  
  const currentMonthHebrew = format(currentDate, 'MMMM yyyy', { locale: he })
  
  // Navigation functions with useCallback to prevent unnecessary re-renders
  const goToPreviousMonth = useCallback(() => {
    setIsChangingMonth(true)
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }, [])
  
  const goToNextMonth = useCallback(() => {
    setIsChangingMonth(true)  
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }, [])
  
  const goToCurrentMonth = useCallback(() => {
    setIsChangingMonth(true)
    setCurrentDate(new Date())
  }, [])
  
  const handleMonthChange = useCallback((date: Date) => {
    setIsChangingMonth(true)
    setCurrentDate(date)
  }, [])
  
  // Fetch dashboard data
  useEffect(() => {
    if (!user) return
    
    const fetchDashboardData = async () => {
      // Use different loading states for initial vs month change
      if (data === null) {
        setLoading(true)
      } else {
        setIsChangingMonth(true)
      }
      
      try {
        // Fetch approved transactions for the month (excluding ignored)
        const { data: approvedTransactions, error: approvedError } = await supabase
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
          .eq('status', 'approved')
          .gte('date', monthStart)
          .lte('date', monthEnd)
        
        if (approvedError) throw approvedError
        
        // Fetch pending transactions count for month status
        const { data: pendingTransactions, error: pendingError } = await supabase
          .from('transactions')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', 'pending')
          .gte('date', monthStart)
          .lte('date', monthEnd)
        
        if (pendingError) throw pendingError
        
        // Transform and calculate data
        const transformedTransactions: TransactionWithLabels[] = (approvedTransactions || []).map(transaction => ({
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
            updated_at: new Date(),
          })) || []
        }))
        
        // Calculate KPIs
        const expenses = transformedTransactions.filter(t => t.converted_amount < 0)
        const incomeTransactions = transformedTransactions.filter(t => 
          t.converted_amount > 0 && 
          t.labels.some(label => label.name === 'הכנסה')
        )
        
        const totalExpenses = Math.abs(expenses.reduce((sum, t) => sum + t.converted_amount, 0))
        const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.converted_amount, 0)
        const monthlyBalance = totalIncome - totalExpenses
        
        setData({
          monthlyBalance,
          totalExpenses,
          totalIncome,
          pendingCount: pendingTransactions?.length || 0,
          expenseTransactions: expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        })
        
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
        setIsChangingMonth(false)
      }
    }
    
    fetchDashboardData()
  }, [user, monthStart, monthEnd, supabase])
  
  // Only show full loading for initial load, not for month changes
  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gray-50 rtl">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>טוען נתונים...</p>
          </div>
        </div>
      </div>
    )
  }

  // Safety check - shouldn't happen but prevents TypeScript errors
  if (!data) {
    return null
  }
  
  return (
    <div className="min-h-screen bg-gray-50 rtl relative">
      {/* Header with month navigation */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Month Status */}
            <div className="flex items-center gap-2">
              {data.pendingCount === 0 ? (
                <Badge variant="default" className="bg-green-100 text-green-800 flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  חודש מוגש
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  {data.pendingCount} עסקאות ממתינות
                </Badge>
              )}
            </div>
            
            {/* Month Navigation */}
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPreviousMonth}
                disabled={isChangingMonth}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              
              <MonthPicker
                selectedMonth={currentDate}
                onMonthChange={handleMonthChange}
                className="bg-gray-900 text-white border-gray-700 hover:bg-gray-800"
                disabled={isChangingMonth}
              />
              
              <Button
                variant="outline"
                size="sm"
                onClick={goToNextMonth}
                disabled={isChangingMonth}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={goToCurrentMonth}
                disabled={isChangingMonth}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                חזור להיום
              </Button>
            </div>
            
            {/* User info */}
            <div className="text-sm text-gray-600">
              {user?.email}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Monthly Balance */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">יתרה חודשית</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn(
                "text-2xl font-bold ltr",
                data.monthlyBalance >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {data.monthlyBalance >= 0 ? "+" : ""}{formatCurrency(Math.abs(data.monthlyBalance), 'ILS')}
              </div>
            </CardContent>
          </Card>
          
          {/* Total Expenses */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">סה"כ הוצאות</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600 ltr">
                {formatCurrency(data.totalExpenses, 'ILS')}
              </div>
            </CardContent>
          </Card>
          
          {/* Total Income */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">סה"כ הכנסות</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600 ltr">
                {formatCurrency(data.totalIncome, 'ILS')}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Empty Chart Area Placeholder */}
        <Card className="mb-8 h-64 flex items-center justify-center bg-gray-50">
          <div className="text-center text-gray-500">
            <div className="text-lg font-medium mb-2">גרפים וחוצאות</div>
            <div className="text-sm">כאן יוצגו גרפים של הוצאות לפי קטגוריות</div>
          </div>
        </Card>

        {/* Monthly Expenses Table */}
        <Card>
          <CardHeader>
            <CardTitle>הוצאות חודשיות</CardTitle>
            <CardDescription>
              כל ההוצאות של {currentMonthHebrew}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.expenseTransactions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                אין הוצאות לחודש זה
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-right p-3 font-medium">סכום</th>
                      <th className="text-right p-3 font-medium">תוויות</th>
                      <th className="text-right p-3 font-medium">תאריך</th>
                      <th className="text-right p-3 font-medium">תיאור העסקה</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.expenseTransactions.map((transaction) => (
                      <tr key={transaction.id} className="border-b hover:bg-gray-50">
                        <td className="p-3 ltr text-red-600 font-medium">
                          {formatCurrency(Math.abs(transaction.converted_amount), transaction.base_currency)}
                          {transaction.original_currency !== transaction.base_currency && (
                            <div className="text-xs text-gray-500">
                              {formatCurrency(Math.abs(transaction.amount), transaction.original_currency)}
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-1 justify-end">
                            {transaction.labels.map((label) => (
                              <Badge
                                key={label.id}
                                variant="outline"
                                style={{ 
                                  backgroundColor: `${label.color}20`, 
                                  borderColor: label.color,
                                  color: label.color
                                }}
                                className="text-xs"
                              >
                                {label.name}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="p-3 text-sm text-gray-600 ltr">
                          {transaction.date.toLocaleDateString('he-IL')}
                        </td>
                        <td className="p-3">
                          <div className="font-medium">{transaction.description}</div>
                          {transaction.identifier && (
                            <div className="text-xs text-gray-500 ltr">
                              ID: {transaction.identifier}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      
      {/* Month Change Loading Overlay */}
      {isChangingMonth && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">טוען נתוני חודש...</p>
          </div>
        </div>
      )}
    </div>
  )
} 