'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/auth'
import { supabase } from '@/lib/supabase'
import { Rule, Label } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Trash2, Edit, Plus, Play, Pause, ArrowUp, ArrowDown, FlaskConical } from 'lucide-react'
import { toast } from 'sonner'
import AuthRequired from '@/components/auth/AuthRequired'
import RuleForm from '@/components/transactions/RuleForm'
import RuleTestingInterface from '@/components/transactions/RuleTestingInterface'

export default function RulesPage() {
  const { user } = useAuth()
  const [rules, setRules] = useState<Rule[]>([])
  const [labels, setLabels] = useState<Label[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showTestingInterface, setShowTestingInterface] = useState(false)

  useEffect(() => {
    if (user) {
      fetchRules()
      fetchLabels()
    }
  }, [user])

  const fetchRules = async () => {
    try {
      const { data, error } = await supabase
        .from('rules')
        .select('*')
        .order('order_index', { ascending: true })

      if (error) throw error
      setRules(data || [])
    } catch (error) {
      console.error('Error fetching rules:', error)
      toast.error("Failed to load rules")
    } finally {
      setLoading(false)
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

  const toggleRuleStatus = async (ruleId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('rules')
        .update({ is_active: !isActive })
        .eq('id', ruleId)

      if (error) throw error

      setRules(rules.map(rule => 
        rule.id === ruleId ? { ...rule, is_active: !isActive } : rule
      ))

      toast.success(`Rule ${!isActive ? 'enabled' : 'disabled'} successfully`)
    } catch (error) {
      console.error('Error toggling rule:', error)
      toast.error("Failed to update rule status")
    }
  }

  const deleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return

    try {
      const { error } = await supabase
        .from('rules')
        .delete()
        .eq('id', ruleId)

      if (error) throw error

      setRules(rules.filter(rule => rule.id !== ruleId))
      toast.success("Rule deleted successfully")
    } catch (error) {
      console.error('Error deleting rule:', error)
      toast.error("Failed to delete rule")
    }
  }

  const moveRule = async (ruleId: string, direction: 'up' | 'down') => {
    const currentIndex = rules.findIndex(rule => rule.id === ruleId)
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    
    if (newIndex < 0 || newIndex >= rules.length) return

    const updatedRules = [...rules]
    const [movedRule] = updatedRules.splice(currentIndex, 1)
    updatedRules.splice(newIndex, 0, movedRule)

    // Update order_index for all affected rules
    const updates = updatedRules.map((rule, index) => ({
      id: rule.id,
      order_index: index
    }))

    try {
      for (const update of updates) {
        const { error } = await supabase
          .from('rules')
          .update({ order_index: update.order_index })
          .eq('id', update.id)

        if (error) throw error
      }

      setRules(updatedRules.map((rule, index) => ({ ...rule, order_index: index })))
      toast.success("Rule order updated successfully")
    } catch (error) {
      console.error('Error moving rule:', error)
      toast.error("Failed to update rule order")
    }
  }

  const getLabelName = (labelId: string) => {
    const label = labels.find(l => l.id === labelId)
    return label?.name || 'Unknown Label'
  }

  const getLabelColor = (labelId: string) => {
    const label = labels.find(l => l.id === labelId)
    return label?.color || '#3B82F6'
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

  if (loading) {
    return (
      <AuthRequired>
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </AuthRequired>
    )
  }

  return (
    <AuthRequired>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Rules Engine</h1>
            <p className="text-gray-600">Automatically assign labels to transactions based on conditions</p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => setShowTestingInterface(true)}
              variant="outline"
              className="flex items-center gap-2"
              disabled={rules.length === 0}
            >
              <FlaskConical size={16} />
              Test Rules
            </Button>
            <Button 
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2"
            >
              <Plus size={16} />
              Create Rule
            </Button>
          </div>
        </div>

        {rules.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-gray-500 mb-4">
                <Play size={48} className="mx-auto mb-2 opacity-50" />
                <h3 className="text-lg font-medium">No rules yet</h3>
                <p>Create your first rule to automatically organize transactions</p>
                <p className="text-sm mt-2">Once you have rules, you can test them against sample transactions</p>
              </div>
              <Button 
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-2"
              >
                <Plus size={16} />
                Create Your First Rule
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {rules.map((rule, index) => (
              <Card key={rule.id} className={`${!rule.is_active ? 'opacity-60' : ''}`}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {rule.name}
                        {!rule.is_active && (
                          <Badge variant="secondary">Disabled</Badge>
                        )}
                      </CardTitle>
                      <CardDescription>
                        {rule.conditions.length} condition{rule.conditions.length !== 1 ? 's' : ''} • {rule.labels_to_apply.length} label{rule.labels_to_apply.length !== 1 ? 's' : ''}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveRule(rule.id, 'up')}
                        disabled={index === 0}
                      >
                        <ArrowUp size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveRule(rule.id, 'down')}
                        disabled={index === rules.length - 1}
                      >
                        <ArrowDown size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleRuleStatus(rule.id, rule.is_active)}
                      >
                        {rule.is_active ? <Pause size={16} /> : <Play size={16} />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {/* TODO: Edit rule */}}
                      >
                        <Edit size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteRule(rule.id)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium text-sm mb-2">Conditions:</h4>
                      <div className="space-y-1">
                        {rule.conditions.map((condition, i) => (
                          <div key={i} className="text-sm bg-gray-50 p-2 rounded">
                            {formatCondition(condition)}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm mb-2">Labels to apply:</h4>
                      <div className="flex flex-wrap gap-1">
                        {rule.labels_to_apply.map((labelId) => (
                          <Badge 
                            key={labelId}
                            style={{ backgroundColor: getLabelColor(labelId) }}
                            className="text-white"
                          >
                            {getLabelName(labelId)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {showCreateForm && (
          <RuleForm
            onClose={() => setShowCreateForm(false)}
            onSuccess={() => {
              setShowCreateForm(false)
              fetchRules()
            }}
          />
        )}

        {showTestingInterface && (
          <RuleTestingInterface
            onClose={() => setShowTestingInterface(false)}
          />
        )}
      </div>
    </AuthRequired>
  )
} 