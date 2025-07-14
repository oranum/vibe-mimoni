'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/auth'
import { useAuthenticatedMutation } from '@/hooks/useAuthenticatedMutation'
import { supabase } from '@/lib/supabase'
import { Label, RuleCondition, CreateRuleInput } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { X, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface RuleFormProps {
  onClose: () => void
  onSuccess: () => void
  initialRule?: any // For editing rules
}

const CONDITION_FIELDS = [
  { value: 'description', label: 'Description' },
  { value: 'amount', label: 'Amount' },
  { value: 'identifier', label: 'Identifier' },
  { value: 'date', label: 'Date' },
  { value: 'source', label: 'Source' }
] as const

const TEXT_OPERATORS = [
  { value: 'equals', label: 'equals' },
  { value: 'contains', label: 'contains' },
  { value: 'starts_with', label: 'starts with' },
  { value: 'ends_with', label: 'ends with' }
] as const

const NUMBER_OPERATORS = [
  { value: 'equals', label: 'equals' },
  { value: 'greater_than', label: 'greater than' },
  { value: 'less_than', label: 'less than' },
  { value: 'between', label: 'between' }
] as const

export default function RuleForm({ onClose, onSuccess, initialRule }: RuleFormProps) {
  const { user } = useAuth()
  const { insert } = useAuthenticatedMutation()
  const [ruleName, setRuleName] = useState(initialRule?.name || '')
  const [conditions, setConditions] = useState<RuleCondition[]>(
    initialRule?.conditions || [{ field: 'description', operator: 'contains', value: '' }]
  )
  const [selectedLabels, setSelectedLabels] = useState<string[]>(
    initialRule?.labels_to_apply || []
  )
  const [availableLabels, setAvailableLabels] = useState<Label[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingLabels, setLoadingLabels] = useState(true)

  useEffect(() => {
    if (user) {
      fetchLabels()
    }
  }, [user])

  const fetchLabels = async () => {
    try {
      const { data, error } = await supabase
        .from('labels')
        .select('*')
        .order('name')

      if (error) throw error
      setAvailableLabels(data || [])
    } catch (error) {
      console.error('Error fetching labels:', error)
      toast.error('Failed to load labels')
    } finally {
      setLoadingLabels(false)
    }
  }

  const addCondition = () => {
    setConditions([...conditions, { field: 'description', operator: 'contains', value: '' }])
  }

  const removeCondition = (index: number) => {
    if (conditions.length > 1) {
      setConditions(conditions.filter((_, i) => i !== index))
    }
  }

  const updateCondition = (index: number, field: keyof RuleCondition, value: any) => {
    const updatedConditions = [...conditions]
    updatedConditions[index] = { ...updatedConditions[index], [field]: value }

    // Reset operator and value when field changes
    if (field === 'field') {
      updatedConditions[index].operator = 'contains'
      updatedConditions[index].value = ''
    }

    // Reset value when operator changes to between
    if (field === 'operator' && value === 'between') {
      updatedConditions[index].value = [0, 0]
    } else if (field === 'operator' && updatedConditions[index].operator === 'between') {
      updatedConditions[index].value = ''
    }

    setConditions(updatedConditions)
  }

  const toggleLabel = (labelId: string) => {
    setSelectedLabels(prev => 
      prev.includes(labelId) 
        ? prev.filter(id => id !== labelId)
        : [...prev, labelId]
    )
  }

  const getOperatorsForField = (field: string) => {
    if (field === 'amount') {
      return NUMBER_OPERATORS
    }
    return TEXT_OPERATORS
  }

  const renderValueInput = (condition: RuleCondition, index: number) => {
    const isNumberField = condition.field === 'amount'
    const isBetweenOperator = condition.operator === 'between'

    if (isBetweenOperator) {
      const value = Array.isArray(condition.value) ? condition.value : [0, 0]
      return (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={value[0]}
            onChange={(e) => updateCondition(index, 'value', [Number(e.target.value), value[1]])}
            placeholder="Min"
            className="w-24"
          />
          <span className="text-sm text-gray-500">and</span>
          <Input
            type="number"
            value={value[1]}
            onChange={(e) => updateCondition(index, 'value', [value[0], Number(e.target.value)])}
            placeholder="Max"
            className="w-24"
          />
        </div>
      )
    }

    return (
      <Input
        type={isNumberField ? 'number' : 'text'}
        value={condition.value as string | number}
        onChange={(e) => updateCondition(index, 'value', isNumberField ? Number(e.target.value) : e.target.value)}
        placeholder={isNumberField ? 'Enter amount' : 'Enter text'}
        className="flex-1"
      />
    )
  }

  const validateForm = () => {
    if (!ruleName.trim()) {
      toast.error('Rule name is required')
      return false
    }

    if (conditions.some(c => !c.value || (Array.isArray(c.value) && c.value.some(v => v === 0)))) {
      toast.error('All conditions must have values')
      return false
    }

    if (selectedLabels.length === 0) {
      toast.error('At least one label must be selected')
      return false
    }

    return true
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setLoading(true)
    try {
      const ruleData: CreateRuleInput = {
        name: ruleName.trim(),
        conditions,
        labels_to_apply: selectedLabels,
        order_index: 0, // Will be set by the backend
        is_active: true
      }

      const result = await insert('rules', ruleData)

      toast.success('Rule created successfully')
      onSuccess()
    } catch (error) {
      console.error('Error creating rule:', error)
      toast.error('Failed to create rule')
    } finally {
      setLoading(false)
    }
  }

  const getLabelById = (labelId: string) => {
    return availableLabels.find(label => label.id === labelId)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Create New Rule</CardTitle>
              <CardDescription>Set up conditions to automatically assign labels to transactions</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X size={16} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Rule Name */}
          <div>
            <label className="block text-sm font-medium mb-2">Rule Name</label>
            <Input
              value={ruleName}
              onChange={(e) => setRuleName(e.target.value)}
              placeholder="Enter rule name"
              className="w-full"
            />
          </div>

          {/* Conditions */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="block text-sm font-medium">Conditions</label>
              <Button
                variant="outline"
                size="sm"
                onClick={addCondition}
                className="flex items-center gap-1"
              >
                <Plus size={14} />
                Add Condition
              </Button>
            </div>
            <div className="space-y-3">
              {conditions.map((condition, index) => (
                <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded">
                  <select
                    value={condition.field}
                    onChange={(e) => updateCondition(index, 'field', e.target.value)}
                    className="px-2 py-1 border rounded text-sm"
                  >
                    {CONDITION_FIELDS.map(field => (
                      <option key={field.value} value={field.value}>
                        {field.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={condition.operator}
                    onChange={(e) => updateCondition(index, 'operator', e.target.value)}
                    className="px-2 py-1 border rounded text-sm"
                  >
                    {getOperatorsForField(condition.field).map(op => (
                      <option key={op.value} value={op.value}>
                        {op.label}
                      </option>
                    ))}
                  </select>

                  {renderValueInput(condition, index)}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCondition(index)}
                    disabled={conditions.length === 1}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Labels Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Labels to Apply</label>
            {loadingLabels ? (
              <div className="text-sm text-gray-500">Loading labels...</div>
            ) : availableLabels.length === 0 ? (
              <div className="text-sm text-gray-500">No labels available. Create some labels first.</div>
            ) : (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {availableLabels.map(label => (
                    <Badge
                      key={label.id}
                      variant={selectedLabels.includes(label.id) ? "default" : "outline"}
                      className="cursor-pointer"
                      style={{
                        backgroundColor: selectedLabels.includes(label.id) ? label.color : 'transparent',
                        borderColor: label.color,
                        color: selectedLabels.includes(label.id) ? 'white' : label.color
                      }}
                      onClick={() => toggleLabel(label.id)}
                    >
                      {label.name}
                    </Badge>
                  ))}
                </div>
                {selectedLabels.length > 0 && (
                  <div className="text-sm text-gray-600">
                    Selected: {selectedLabels.map(id => getLabelById(id)?.name).join(', ')}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || loadingLabels}
            >
              {loading ? 'Creating...' : 'Create Rule'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 