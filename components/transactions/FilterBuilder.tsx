'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label, Transaction } from '@/types/database'
import { Plus, X, Play, Save, Filter, Calendar, DollarSign, FileText, MapPin, Tag, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/auth'

export type FilterField = 'description' | 'amount' | 'date' | 'source' | 'status' | 'label'
export type FilterOperator = 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than' | 'between' | 'in' | 'not_in'

export interface FilterCondition {
  id: string
  field: FilterField
  operator: FilterOperator
  value: any
}

export interface Filter {
  id?: string
  name?: string
  conditions: FilterCondition[]
  conjunction: 'AND' | 'OR'
}

interface FilterBuilderProps {
  initialFilter?: Filter
  onFilterChange: (filter: Filter) => void
  onSave?: (filter: Filter) => void
  onTest?: (filter: Filter) => void
  showActions?: boolean
}

const FIELD_OPTIONS = [
  { value: 'description', label: 'Description', icon: FileText },
  { value: 'amount', label: 'Amount', icon: DollarSign },
  { value: 'date', label: 'Date', icon: Calendar },
  { value: 'source', label: 'Source', icon: MapPin },
  { value: 'status', label: 'Status', icon: AlertCircle },
  { value: 'label', label: 'Label', icon: Tag }
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

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'cancelled', label: 'Cancelled' }
] as const

export default function FilterBuilder({ 
  initialFilter, 
  onFilterChange, 
  onSave, 
  onTest, 
  showActions = true 
}: FilterBuilderProps) {
  const { user } = useAuth()
  const [filter, setFilter] = useState<Filter>(initialFilter || {
    conditions: [createNewCondition()],
    conjunction: 'AND'
  })
  const [labels, setLabels] = useState<Label[]>([])
  const [filterName, setFilterName] = useState(initialFilter?.name || '')

  useEffect(() => {
    if (user) {
      fetchLabels()
    }
  }, [user])

  useEffect(() => {
    onFilterChange(filter)
  }, [filter, onFilterChange])

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

  function createNewCondition(): FilterCondition {
    return {
      id: `condition-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      field: 'description',
      operator: 'contains',
      value: ''
    }
  }

  const addCondition = () => {
    setFilter(prev => ({
      ...prev,
      conditions: [...prev.conditions, createNewCondition()]
    }))
  }

  const removeCondition = (conditionId: string) => {
    if (filter.conditions.length > 1) {
      setFilter(prev => ({
        ...prev,
        conditions: prev.conditions.filter(c => c.id !== conditionId)
      }))
    }
  }

  const updateCondition = (conditionId: string, updates: Partial<FilterCondition>) => {
    setFilter(prev => ({
      ...prev,
      conditions: prev.conditions.map(c => 
        c.id === conditionId ? { ...c, ...updates } : c
      )
    }))
  }

  const resetConditionValue = (conditionId: string, field: FilterField) => {
    let defaultValue = ''
    
    switch (field) {
      case 'amount':
        defaultValue = '0'
        break
      case 'date':
        defaultValue = new Date().toISOString().split('T')[0]
        break
      case 'status':
        defaultValue = 'pending'
        break
      case 'label':
        defaultValue = labels[0]?.id || ''
        break
      default:
        defaultValue = ''
    }
    
    updateCondition(conditionId, { 
      field, 
      value: defaultValue,
      operator: getDefaultOperator(field)
    })
  }

  const getDefaultOperator = (field: FilterField): FilterOperator => {
    switch (field) {
      case 'amount':
        return 'equals'
      case 'date':
        return 'equals'
      case 'status':
      case 'label':
        return 'equals'
      default:
        return 'contains'
    }
  }

  const getOperatorsForField = (field: FilterField) => {
    switch (field) {
      case 'amount':
        return NUMBER_OPERATORS
      case 'date':
        return NUMBER_OPERATORS
      case 'status':
      case 'label':
        return [{ value: 'equals', label: 'equals' }, { value: 'not_in', label: 'is not' }]
      default:
        return TEXT_OPERATORS
    }
  }

  const getFieldIcon = (field: FilterField) => {
    const fieldOption = FIELD_OPTIONS.find(f => f.value === field)
    return fieldOption?.icon || FileText
  }

  const renderValueInput = (condition: FilterCondition) => {
    const { field, operator, value } = condition

    switch (field) {
      case 'amount':
        if (operator === 'between') {
          const values = Array.isArray(value) ? value : [0, 0]
          return (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={values[0] || ''}
                onChange={(e) => updateCondition(condition.id, { 
                  value: [Number(e.target.value), values[1]] 
                })}
                placeholder="Min"
                className="w-20"
              />
              <span className="text-sm text-gray-500">to</span>
              <Input
                type="number"
                value={values[1] || ''}
                onChange={(e) => updateCondition(condition.id, { 
                  value: [values[0], Number(e.target.value)] 
                })}
                placeholder="Max"
                className="w-20"
              />
            </div>
          )
        }
        return (
          <Input
            type="number"
            value={value || ''}
            onChange={(e) => updateCondition(condition.id, { value: Number(e.target.value) })}
            placeholder="Amount"
            className="w-24"
          />
        )

      case 'date':
        if (operator === 'between') {
          const values = Array.isArray(value) ? value : ['', '']
          return (
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={values[0] || ''}
                onChange={(e) => updateCondition(condition.id, { 
                  value: [e.target.value, values[1]] 
                })}
                className="w-36"
              />
              <span className="text-sm text-gray-500">to</span>
              <Input
                type="date"
                value={values[1] || ''}
                onChange={(e) => updateCondition(condition.id, { 
                  value: [values[0], e.target.value] 
                })}
                className="w-36"
              />
            </div>
          )
        }
        return (
          <Input
            type="date"
            value={value || ''}
            onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
            className="w-36"
          />
        )

      case 'status':
        return (
          <Select 
            value={value || 'pending'} 
            onValueChange={(val) => updateCondition(condition.id, { value: val })}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(status => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'label':
        return (
          <Select 
            value={value || ''} 
            onValueChange={(val) => updateCondition(condition.id, { value: val })}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Select label" />
            </SelectTrigger>
            <SelectContent>
              {labels.map(label => (
                <SelectItem key={label.id} value={label.id}>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: label.color }}
                    />
                    {label.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      default:
        return (
          <Input
            type="text"
            value={value || ''}
            onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
            placeholder="Enter value"
            className="flex-1"
          />
        )
    }
  }

  const handleSave = () => {
    if (!filterName.trim()) {
      toast.error('Please enter a filter name')
      return
    }

    if (filter.conditions.some(c => !c.value || (Array.isArray(c.value) && c.value.some(v => !v)))) {
      toast.error('All conditions must have values')
      return
    }

    onSave?.({
      ...filter,
      name: filterName.trim()
    })
  }

  const handleTest = () => {
    if (filter.conditions.some(c => !c.value || (Array.isArray(c.value) && c.value.some(v => !v)))) {
      toast.error('All conditions must have values to test')
      return
    }

    onTest?.(filter)
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter size={20} />
          Filter Builder
        </CardTitle>
        <CardDescription>
          Create complex filters with multiple conditions and logical operators
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filter Name */}
        {showActions && (
          <div>
            <label className="block text-sm font-medium mb-2">Filter Name</label>
            <Input
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              placeholder="Enter filter name"
            />
          </div>
        )}

        {/* Conjunction Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">Logic</label>
          <Select 
            value={filter.conjunction} 
            onValueChange={(val) => setFilter(prev => ({ ...prev, conjunction: val as 'AND' | 'OR' }))}
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AND">AND</SelectItem>
              <SelectItem value="OR">OR</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500 mt-1">
            {filter.conjunction === 'AND' ? 'All conditions must match' : 'Any condition can match'}
          </p>
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
            {filter.conditions.map((condition, index) => {
              const FieldIcon = getFieldIcon(condition.field)
              return (
                <div key={condition.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  {index > 0 && (
                    <div className="text-xs font-medium text-gray-500 w-8">
                      {filter.conjunction}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <FieldIcon size={16} className="text-gray-500" />
                    <Select 
                      value={condition.field} 
                      onValueChange={(val) => resetConditionValue(condition.id, val as FilterField)}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FIELD_OPTIONS.map(field => (
                          <SelectItem key={field.value} value={field.value}>
                            {field.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Select 
                    value={condition.operator} 
                    onValueChange={(val) => updateCondition(condition.id, { operator: val as FilterOperator })}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getOperatorsForField(condition.field).map(op => (
                        <SelectItem key={op.value} value={op.value}>
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {renderValueInput(condition)}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCondition(condition.id)}
                    disabled={filter.conditions.length === 1}
                  >
                    <X size={14} />
                  </Button>
                </div>
              )
            })}
          </div>
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={handleTest}
              className="flex items-center gap-2"
            >
              <Play size={16} />
              Test Filter
            </Button>
            <Button
              onClick={handleSave}
              className="flex items-center gap-2"
            >
              <Save size={16} />
              Save Filter
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 