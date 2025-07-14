'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/auth'
import { supabase } from '@/lib/supabase'
import { Rule, Transaction, Label } from '@/types/database'
import { testRulesAgainstTransaction } from '@/lib/rules-engine'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { X, Play, AlertCircle, CheckCircle2, Clock, DollarSign, FileText, Calendar, MapPin } from 'lucide-react'
import { toast } from 'sonner'

interface RuleTestingInterfaceProps {
  onClose: () => void
}

export default function RuleTestingInterface({ onClose }: RuleTestingInterfaceProps) {
  const { user } = useAuth()
  const [rules, setRules] = useState<Rule[]>([])
  const [existingTransactions, setExistingTransactions] = useState<Transaction[]>([])
  const [labels, setLabels] = useState<Label[]>([])
  const [loading, setLoading] = useState(false)
  const [testMode, setTestMode] = useState<'sample' | 'existing'>('sample')
  
  // Sample transaction form
  const [sampleTransaction, setSampleTransaction] = useState({
    description: '',
    amount: 0,
    identifier: '',
    date: new Date().toISOString().split('T')[0],
    source: ''
  })

  // Selected existing transaction
  const [selectedTransactionId, setSelectedTransactionId] = useState<string>('')

  // Test results
  const [testResults, setTestResults] = useState<{
    matchingRules: Rule[]
    labelsToApply: string[]
    transaction: Transaction | null
  } | null>(null)

  useEffect(() => {
    if (user) {
      fetchRules()
      fetchExistingTransactions()
      fetchLabels()
    }
  }, [user])

  const fetchRules = async () => {
    try {
      const { data, error } = await supabase
        .from('rules')
        .select('*')
        .eq('is_active', true)
        .order('order_index', { ascending: true })

      if (error) throw error
      setRules(data || [])
    } catch (error) {
      console.error('Error fetching rules:', error)
      toast.error('Failed to load rules')
    }
  }

  const fetchExistingTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false })
        .limit(20)

      if (error) throw error
      setExistingTransactions(data || [])
    } catch (error) {
      console.error('Error fetching transactions:', error)
      toast.error('Failed to load transactions')
    }
  }

  const fetchLabels = async () => {
    try {
      const { data, error } = await supabase
        .from('labels')
        .select('*')
        .order('name')

      if (error) throw error
      setLabels(data || [])
    } catch (error) {
      console.error('Error fetching labels:', error)
    }
  }

  const getLabelById = (labelId: string) => {
    return labels.find(label => label.id === labelId)
  }

  const handleTestSampleTransaction = async () => {
    if (!sampleTransaction.description || sampleTransaction.amount === 0) {
      toast.error('Please fill in at least description and amount')
      return
    }

    setLoading(true)
    try {
      const testTransaction: Transaction = {
        id: 'test-' + Date.now(),
        user_id: user?.id || '',
        description: sampleTransaction.description,
        amount: sampleTransaction.amount,
        identifier: sampleTransaction.identifier,
        date: new Date(sampleTransaction.date),
        source: sampleTransaction.source,
        status: 'pending',
        notes: null,
        created_at: new Date(),
        updated_at: new Date()
      }

      const results = await testRulesAgainstTransaction(testTransaction)
      setTestResults({
        ...results,
        transaction: testTransaction
      })
    } catch (error) {
      console.error('Error testing rules:', error)
      toast.error('Failed to test rules')
    } finally {
      setLoading(false)
    }
  }

  const handleTestExistingTransaction = async () => {
    if (!selectedTransactionId) {
      toast.error('Please select a transaction to test')
      return
    }

    const selectedTransaction = existingTransactions.find(t => t.id === selectedTransactionId)
    if (!selectedTransaction) {
      toast.error('Selected transaction not found')
      return
    }

    setLoading(true)
    try {
      const results = await testRulesAgainstTransaction(selectedTransaction)
      setTestResults({
        ...results,
        transaction: selectedTransaction
      })
    } catch (error) {
      console.error('Error testing rules:', error)
      toast.error('Failed to test rules')
    } finally {
      setLoading(false)
    }
  }

  const formatCondition = (condition: any) => {
    const field = condition.field.charAt(0).toUpperCase() + condition.field.slice(1)
    const operator = condition.operator.replace(/_/g, ' ')
    let value = condition.value

    if (condition.operator === 'between' && Array.isArray(value)) {
      value = `${value[0]} - ${value[1]}`
    }

    return `${field} ${operator} "${value}"`
  }

  const getFieldIcon = (field: string) => {
    switch (field) {
      case 'description': return <FileText size={16} />
      case 'amount': return <DollarSign size={16} />
      case 'identifier': return <AlertCircle size={16} />
      case 'date': return <Calendar size={16} />
      case 'source': return <MapPin size={16} />
      default: return <FileText size={16} />
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Play size={20} />
                Rule Testing Interface
              </CardTitle>
              <CardDescription>
                Test your rules against sample or existing transactions to see which rules would match
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X size={16} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Panel - Transaction Input */}
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-3">Transaction Input</h3>
                <Tabs value={testMode} onValueChange={(value) => setTestMode(value as 'sample' | 'existing')}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="sample">Sample Transaction</TabsTrigger>
                    <TabsTrigger value="existing">Existing Transaction</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="sample" className="space-y-4">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">Description *</label>
                        <Input
                          value={sampleTransaction.description}
                          onChange={(e) => setSampleTransaction({ ...sampleTransaction, description: e.target.value })}
                          placeholder="e.g., Grocery shopping at Walmart"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Amount *</label>
                        <Input
                          type="number"
                          value={sampleTransaction.amount}
                          onChange={(e) => setSampleTransaction({ ...sampleTransaction, amount: Number(e.target.value) })}
                          placeholder="e.g., -45.67"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Identifier</label>
                        <Input
                          value={sampleTransaction.identifier}
                          onChange={(e) => setSampleTransaction({ ...sampleTransaction, identifier: e.target.value })}
                          placeholder="e.g., TXN123456"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Date</label>
                        <Input
                          type="date"
                          value={sampleTransaction.date}
                          onChange={(e) => setSampleTransaction({ ...sampleTransaction, date: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Source</label>
                        <Input
                          value={sampleTransaction.source}
                          onChange={(e) => setSampleTransaction({ ...sampleTransaction, source: e.target.value })}
                          placeholder="e.g., bank_import"
                        />
                      </div>
                    </div>
                    <Button 
                      onClick={handleTestSampleTransaction}
                      disabled={loading}
                      className="w-full"
                    >
                      {loading ? 'Testing...' : 'Test Sample Transaction'}
                    </Button>
                  </TabsContent>
                  
                  <TabsContent value="existing" className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Select Transaction</label>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {existingTransactions.map(transaction => (
                          <div
                            key={transaction.id}
                            className={`p-3 border rounded cursor-pointer transition-colors ${
                              selectedTransactionId === transaction.id
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => setSelectedTransactionId(transaction.id)}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="font-medium text-sm">{transaction.description}</div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {new Date(transaction.date).toLocaleDateString()} • {transaction.source}
                                </div>
                              </div>
                              <div className={`text-sm font-medium ${
                                transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                ${Math.abs(transaction.amount).toFixed(2)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <Button 
                      onClick={handleTestExistingTransaction}
                      disabled={loading || !selectedTransactionId}
                      className="w-full"
                    >
                      {loading ? 'Testing...' : 'Test Selected Transaction'}
                    </Button>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Rules Summary */}
              <div className="mt-6">
                <h3 className="font-semibold mb-3">Active Rules ({rules.length})</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {rules.map(rule => (
                    <div key={rule.id} className="p-2 bg-gray-50 rounded text-sm">
                      <div className="font-medium">{rule.name}</div>
                      <div className="text-xs text-gray-600">
                        {rule.conditions.length} condition{rule.conditions.length !== 1 ? 's' : ''} • {rule.labels_to_apply.length} label{rule.labels_to_apply.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Panel - Test Results */}
            <div className="space-y-4">
              <h3 className="font-semibold">Test Results</h3>
              
              {!testResults ? (
                <div className="text-center py-12 text-gray-500">
                  <Clock size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No test results yet</p>
                  <p className="text-sm">Configure a transaction and run a test to see results</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Transaction Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Transaction Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <FileText size={16} />
                          <span className="font-medium">Description:</span>
                        </div>
                        <div>{testResults.transaction?.description}</div>
                        
                        <div className="flex items-center gap-2">
                          <DollarSign size={16} />
                          <span className="font-medium">Amount:</span>
                        </div>
                        <div className={testResults.transaction?.amount && testResults.transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}>
                          ${Math.abs(testResults.transaction?.amount || 0).toFixed(2)}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Calendar size={16} />
                          <span className="font-medium">Date:</span>
                        </div>
                        <div>{testResults.transaction?.date ? new Date(testResults.transaction.date).toLocaleDateString() : 'N/A'}</div>
                        
                        {testResults.transaction?.source && (
                          <>
                            <div className="flex items-center gap-2">
                              <MapPin size={16} />
                              <span className="font-medium">Source:</span>
                            </div>
                            <div>{testResults.transaction.source}</div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Matching Rules */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {testResults.matchingRules.length > 0 ? (
                          <CheckCircle2 className="text-green-500" size={20} />
                        ) : (
                          <AlertCircle className="text-orange-500" size={20} />
                        )}
                        Matching Rules ({testResults.matchingRules.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {testResults.matchingRules.length === 0 ? (
                        <div className="text-center py-6 text-gray-500">
                          <AlertCircle size={32} className="mx-auto mb-2 opacity-50" />
                          <p>No rules match this transaction</p>
                          <p className="text-sm">The transaction doesn't meet any rule conditions</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {testResults.matchingRules.map(rule => (
                            <div key={rule.id} className="border rounded p-3">
                              <div className="font-medium text-sm mb-2">{rule.name}</div>
                              <div className="space-y-1">
                                {rule.conditions.map((condition, index) => (
                                  <div key={index} className="flex items-center gap-2 text-xs bg-green-50 p-2 rounded">
                                    {getFieldIcon(condition.field)}
                                    <span className="text-green-700">{formatCondition(condition)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Labels to Apply */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Labels to Apply ({testResults.labelsToApply.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {testResults.labelsToApply.length === 0 ? (
                        <div className="text-center py-4 text-gray-500">
                          <p>No labels would be applied</p>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {testResults.labelsToApply.map(labelId => {
                            const label = getLabelById(labelId)
                            return (
                              <Badge 
                                key={labelId}
                                style={{ backgroundColor: label?.color || '#3B82F6' }}
                                className="text-white"
                              >
                                {label?.name || 'Unknown Label'}
                              </Badge>
                            )
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 