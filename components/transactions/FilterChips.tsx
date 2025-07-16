'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Filter, FilterCondition } from './FilterBuilder'
import { X, Calendar, DollarSign, FileText, MapPin, Tag, AlertCircle } from 'lucide-react'

interface FilterChipsProps {
  filter: Filter
  onRemoveCondition: (conditionId: string) => void
  onClearAll: () => void
  labels?: { id: string; name: string; color: string }[]
}

export function FilterChips({ filter, onRemoveCondition, onClearAll, labels = [] }: FilterChipsProps) {
  if (!filter.conditions || filter.conditions.length === 0) {
    return null
  }

  const getFieldIcon = (field: string) => {
    switch (field) {
      case 'description':
        return <FileText size={12} />
      case 'amount':
        return <DollarSign size={12} />
      case 'date':
        return <Calendar size={12} />
      case 'source':
        return <MapPin size={12} />
      case 'status':
        return <AlertCircle size={12} />
      case 'label':
        return <Tag size={12} />
      default:
        return null
    }
  }

  const formatConditionValue = (condition: FilterCondition) => {
    const { field, operator, value } = condition

    if (field === 'label') {
      const label = labels.find(l => l.id === value)
      return label ? label.name : value
    }

    if (field === 'amount') {
      if (operator === 'between' && Array.isArray(value)) {
        return `$${value[0]} - $${value[1]}`
      }
      return `$${value}`
    }

    if (field === 'date') {
      if (operator === 'between' && Array.isArray(value)) {
        return `${value[0]} - ${value[1]}`
      }
      return value
    }

    if (Array.isArray(value)) {
      return value.join(', ')
    }

    return String(value)
  }

  const getOperatorLabel = (operator: string) => {
    switch (operator) {
      case 'equals':
        return '='
      case 'contains':
        return 'contains'
      case 'starts_with':
        return 'starts with'
      case 'ends_with':
        return 'ends with'
      case 'greater_than':
        return '>'
      case 'less_than':
        return '<'
      case 'between':
        return 'between'
      case 'not_in':
        return 'is not'
      default:
        return operator
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">Active filters:</span>
        <Badge variant="outline" className="font-normal">
          {filter.conjunction}
        </Badge>
      </div>
      
      {filter.conditions.map((condition, index) => (
        <Badge
          key={condition.id}
          variant="secondary"
          className="flex items-center gap-1 pr-1"
        >
          {getFieldIcon(condition.field)}
          <span className="text-xs">
            {condition.field} {getOperatorLabel(condition.operator)} {formatConditionValue(condition)}
          </span>
          <button
            onClick={() => onRemoveCondition(condition.id)}
            className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
          >
            <X size={10} />
          </button>
        </Badge>
      ))}
      
      <Button
        variant="ghost"
        size="sm"
        onClick={onClearAll}
        className="h-6 px-2 text-xs"
      >
        Clear all
      </Button>
    </div>
  )
} 